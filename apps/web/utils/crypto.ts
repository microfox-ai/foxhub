import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

export function encrypt(text: string, secretKey: string): string {
  // Generate a random IV
  const iv = randomBytes(IV_LENGTH);
  const salt = randomBytes(SALT_LENGTH);

  // Create cipher with key and IV
  const cipher = createCipheriv(ALGORITHM, Buffer.from(secretKey, "hex"), iv);

  // Encrypt the text
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get the auth tag
  const authTag = cipher.getAuthTag();

  // Combine the salt, IV, auth tag, and encrypted text
  return Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, "hex"),
  ]).toString("base64");
}

export function decrypt(encryptedData: string, secretKey: string): string {
  try {
    // Convert the combined data back to a buffer
    const data = Buffer.from(encryptedData, "base64");

    // Extract the salt, IV, auth tag and encrypted text
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = data.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(secretKey, "hex"),
      iv
    );
    decipher.setAuthTag(authTag);

    // Decrypt the text
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error("Decryption failed. Invalid data or key.");
  }
}
