import { customAlphabet } from "nanoid";

// Define the verification record interface
export interface VerificationRecord {
  id: string;
  clientSecretId: string;
  userId: string;
  code: string;
  slug: string;
  phoneNumber?: string;
  callbackUri?: string;
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
  baseUrl: string;
  authToken?: string;
}

// Create a custom otp code
const generateCode = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

export class WhatsAppVerification {
  private baseUrl: string;
  private authToken?: string;

  constructor(options: WhatsAppVerificationOptions) {
    this.baseUrl = options.baseUrl
      ? `${options.baseUrl}/api/whatsapp-verify`
      : "http://localhost:3000/api/whatsapp/verify";
    this.authToken = options.authToken;
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
  ): Promise<VerificationRecord> {
    const code = generateCode();
    const checkValidCode = await this.checkValidityOfCode(clientSecretId, code);
    if (!checkValidCode) {
      throw new Error("Invalid code");
    }
    const response = await fetch(`${this.baseUrl}`, {
      method: "POST",
      body: JSON.stringify({
        clientSecretId,
        userId,
        slug,
        code,
        callbackUri,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
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
    phoneNumber: string,
    code: string,
    id: string
  ): Promise<VerificationRecord> {
    const response = await fetch(`${this.baseUrl}`, {
      method: "PUT",
      body: JSON.stringify({ clientSecretId, phoneNumber, code, id }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to update verification: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Checks the validity of a code
   * @param clientSecretId The client identifier
   * @param code The code to check
   * @returns Promise<boolean>
   */
  public async checkValidityOfCode(
    clientSecretId: string,
    code: string
  ): Promise<boolean> {
    const response = await fetch(
      `${this.baseUrl}?clientSecretId=${clientSecretId}&code=${code}`
    );
    // if the code is NOT found, return true
    if (response.status === 404) return true;
    // if the code is found, return false
    return false;
  }

  public async getInitialVerificationSession(
    clientSecretId: string,
    userId: string
  ): Promise<VerificationRecord[] | null> {
    const response = await fetch(
      `${this.baseUrl}?clientSecretId=${clientSecretId}&userId=${userId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
      }
    );
    if (!response.ok) return null;
    return response.json();
  }

  public async getVerificationSession(
    clientSecretId: string,
    code: string
  ): Promise<VerificationRecord[] | null> {
    const response = await fetch(
      `${this.baseUrl}?clientSecretId=${clientSecretId}&code=${code}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
      }
    );
    if (!response.ok) return null;
    return response.json();
  }

  public async deleteVerificationSession(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}?id=${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
    });
    if (!response.ok) throw new Error("Failed to delete verification session");
    return response.json();
  }
}
