import { customAlphabet } from "nanoid";

// Define the verification record interface
export interface VerificationRecord {
  clientSecretId: string;
  userId: string;
  code: string;
  slug: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the process message result interface
export interface ProcessMessageResult {
  success: boolean;
  error?: string;
  verification?: VerificationRecord;
}

// Define the constructor options interface
export interface WhatsAppVerificationOptions {
  baseUrl?: string;
  authToken?: string;
}

// Create a custom otp code
const generateCode = customAlphabet("0123456789", 6);

export class WhatsAppVerification {
  private baseUrl: string;

  constructor(options: WhatsAppVerificationOptions = {}) {
    this.baseUrl =
      options.baseUrl || "http://localhost:3000/api/whatsapp-verify";
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
    slug: string
  ): Promise<VerificationRecord> {
    const response = await fetch(`${this.baseUrl}`, {
      method: "POST",
      body: JSON.stringify({
        clientSecretId,
        userId,
        slug,
        code: generateCode(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create verification: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Updates a verification record with phone number
   * @param clientId The client identifier
   * @param phoneNumber The user's phone number
   * @returns Promise<VerificationRecord>
   */
  async updateVerification(
    clientSecretId: string,
    phoneNumber: string
  ): Promise<VerificationRecord> {
    const response = await fetch(`${this.baseUrl}`, {
      method: "PUT",
      body: JSON.stringify({ clientSecretId, phoneNumber, isVerified: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update verification: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Processes an incoming WhatsApp message
   * @param message The message text
   * @param userId The user identifier
   * @param phoneNumber The sender's phone number
   * @param clientId The client identifier
   * @returns Promise<ProcessMessageResult>
   */
  async processMessage(
    message: string,
    phoneNumber: string,
    clientSecretId: string,
    slug: string
  ): Promise<ProcessMessageResult> {
    if (this.isVerificationMessage(message)) {
      const verificationCode = this.extractVerificationCode(message);

      if (!verificationCode) {
        return {
          success: false,
          error: "Invalid verification code format",
        };
      }

      const verification = await this.findVerification(
        clientSecretId,
        verificationCode,
        slug
      );

      if (verification) {
        await this.updateVerification(clientSecretId, phoneNumber);
        return {
          success: true,
          verification,
        };
      } else {
        return {
          success: false,
          error: "Invalid verification code",
        };
      }
    }

    return { success: true };
  }

  /**
   * Checks if a message is a verification message
   * @param message The message text
   * @returns boolean
   */
  private isVerificationMessage(message: string): boolean {
    return message.includes("verification code");
  }

  /**
   * Extracts verification code from message
   * @param message The message text
   * @returns string | null
   */
  private extractVerificationCode(message: string): string | null {
    const match = message.match(/\b\d{6}\b/);
    return match ? match[0] : null;
  }

  /**
   * Finds a verification record by client ID and code
   * @param clientId The client identifier
   * @param code The verification code
   * @returns Promise<VerificationRecord | null>
   */
  private async findVerification(
    clientSecretId: string,
    code: string,
    slug: string
  ): Promise<VerificationRecord | null> {
    const response = await fetch(
      `${this.baseUrl}?clientSecretId=${clientSecretId}&code=${code}&slug=${slug}`
    );
    if (!response.ok) return null;
    return response.json();
  }

  public async getVerificationSession(
    clientSecretId: string,
    userId: string,
    slug: string
  ): Promise<VerificationRecord[] | null> {
    const response = await fetch(
      `${this.baseUrl}?clientSecretId=${clientSecretId}&userId=${userId}`
    );
    if (!response.ok) return null;
    return response.json();
  }
}
