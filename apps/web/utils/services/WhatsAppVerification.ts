import { prisma } from "@/prisma/prisma";
import { WhatsAppVerification } from "@prisma/client";
import { customAlphabet } from "nanoid";

// Define the process message result interface
export interface ProcessMessageResult {
  success: boolean;
  error?: string;
  verification?: WhatsAppVerification;
}

// Define the constructor options interface
export interface WhatsAppVerificationOptions {
  baseUrl: string;
  authToken?: string;
}

// Create a custom otp code
const generateCode = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

export const WHATSAPP_VERIFICATION_CODE_EXPIRATION_TIME = 3 * 60 * 1000; // 3 minutes

export class WhatsAppVerificationSdk {
  extractVerificationCode(message: string): string | null {
    const match = message.match(/verification code:\s*([a-zA-Z0-9]{6})/i);
    return match && match[1] ? match[1] : null;
  }

  /**
   * Creates a new verification record
   * @param clientId The client identifier
   * @param userId The user identifier
   * @param slug The verification slug
   * @returns Promise<VerificationRecord>
   */
  async createVerification(
    clientSecretId: string,
    userId: string,
    slug: string,
    callbackUri: string
  ): Promise<WhatsAppVerification> {
    const code = generateCode();
    const checkCodeExists = await this.checkCodeExists(clientSecretId, code);
    if (checkCodeExists) {
      throw new Error("Invalid code");
    }
    const doc = await prisma.whatsAppVerification.create({
      data: {
        clientSecretId,
        userId,
        slug,
        code,
        callbackUri,
      },
    });
    return doc ?? undefined;
  }

  /**
   * Updates a verification record with phone number
   * @param clientId The client identifier
   * @param phoneNumber The user's phone number
   * @returns Promise<VerificationRecord>
   */
  async updateVerification(
    clientSecretId: string,
    phoneNumber: string,
    code: string,
    id: string
  ): Promise<WhatsAppVerification> {
    const doc = await prisma.whatsAppVerification.update({
      where: {
        id,
      },
      data: {
        phoneNumber,
      },
    });
    return doc ?? undefined;
  }

  /**
   * Checks the validity of a code
   * @param clientSecretId The client identifier
   * @param code The code to check
   * @returns Promise<boolean>
   */
  public async checkCodeExists(
    clientSecretId: string,
    code: string
  ): Promise<boolean> {
    const record = await prisma.whatsAppVerification.findMany({
      where: {
        ...(clientSecretId && { clientSecretId }),
        ...(code && { code }),
      },
    });

    // if the code is NOT found, return true
    if (record.length === 0) return false;
    else return true;
  }

  public async processVerification(
    clientSecretId: string,
    message: string
  ): Promise<{ isVerified?: boolean; record?: WhatsAppVerification }> {
    try {
      const code = this.extractVerificationCode(message);
      console.log("code", code);
      if (!code) {
        return { isVerified: false };
      }

      const isCodeVerified = await this.checkIfCodeIsVerified(
        clientSecretId,
        code
      );
      console.log(
        "isCodeVerified",
        isCodeVerified.error,
        isCodeVerified.id,
        isCodeVerified.verified,
        isCodeVerified.record
      );

      if (isCodeVerified.verified && isCodeVerified.id) {
        // await this.deleteVerificationSession(isCodeVerified.id);
        return { isVerified: true, record: isCodeVerified.record };
      }
      return { isVerified: false };
    } catch (error) {
      console.error("Error in processVerification", error);
      return { isVerified: false };
    }
  }

  public async checkIfCodeIsVerified(
    clientSecretId: string,
    inputCode: string
  ): Promise<{
    verified: boolean;
    error?: string;
    id?: string;
    record?: WhatsAppVerification;
  }> {
    try {
      const verification = await prisma.whatsAppVerification.findMany({
        where: {
          clientSecretId,
          code: inputCode,
        },
      });

      //1. check if the verification record exists
      if (
        !verification ||
        verification.length === 0 ||
        verification[0] === undefined
      ) {
        return { verified: false, error: "Verification Record not found" };
      }

      //2. check if this session is expired
      const isExpired =
        verification[0].createdAt <
        new Date(Date.now() - WHATSAPP_VERIFICATION_CODE_EXPIRATION_TIME);

      if (isExpired) {
        console.log("deleting verification session", verification[0].id);
        await this.deleteVerificationSession(verification[0].id);
        return { verified: false, error: "Verification Record expired" };
      }

      if (verification[0].code === inputCode) {
        return {
          verified: true,
          id: verification[0].id,
          record: verification[0],
        };
      }

      return { verified: false, error: "Invalid Code" };
    } catch (error) {
      console.error("Error in checkIfCodeIsVerified", error);
      return { verified: false, error: "Invalid Code" };
    }
  }

  public async getVerificationSession(
    clientSecretId: string,
    code: string
  ): Promise<WhatsAppVerification[] | null> {
    const doc = await prisma.whatsAppVerification.findMany({
      where: {
        clientSecretId,
        code,
      },
    });
    return doc ?? null;
  }

  public async deleteVerificationSession(id: string): Promise<void> {
    const doc = await prisma.whatsAppVerification.delete({
      where: {
        id,
      },
    });
  }

  public async setupWebhookHandshakeSubscription(
    accessToken: string,
    businessAccountId: string
  ): Promise<void> {
    const doc = await fetch(
      `https://graph.facebook.com/v22.0/${businessAccountId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }

  public async registerBusinessNumber(
    accessToken: string,
    phoneNumberId: string
  ): Promise<void> {
    const doc = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/register`,
      {
        method: "POST",
        body: JSON.stringify({ pin: "123456", messaging_product: "whatsapp" }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }

  // public async handshake for webhooks
}
