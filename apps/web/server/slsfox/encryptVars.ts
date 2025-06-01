import { ClientSecret } from "@prisma/client";
import { CryptoVault } from '@microfox/crypto-sdk';

// Create vault instance with error handling
let cryptoVault: CryptoVault;
try {
    const vaultKey = process.env.ENCRYPTION_KEY;
    if (!vaultKey) {
        throw new Error("ENCRYPTION_KEY environment variable is not set");
    }

    cryptoVault = new CryptoVault({
        key: vaultKey,
        encryptionAlgo: 'aes-256-gcm',
        hashAlgo: 'sha256',
        outputEncoding: 'base64url'
    });
    console.log("✅ CryptoVault initialized successfully");
} catch (error) {
    console.error("❌ Failed to initialize CryptoVault:", error);
    throw error;
}

export const addEncryptedVariables = (
    clientSecrets: ClientSecret[],
    requiredVariables: Array<{ key: string }>,
    presetBody: any
): { success: boolean; error?: string; addedCount: number } => {
    try {
        // Validate inputs
        if (!Array.isArray(clientSecrets)) {
            return { success: false, error: "Client secrets must be an array", addedCount: 0 };
        }

        if (!Array.isArray(requiredVariables)) {
            return { success: false, error: "Required variables must be an array", addedCount: 0 };
        }

        if (!presetBody || typeof presetBody !== 'object') {
            return { success: false, error: "Preset body must be an object", addedCount: 0 };
        }

        const authVariables: Array<{ key: string, value: string }> = [];
        const errors: string[] = [];

        for (const variableItem of requiredVariables) {
            try {
                if (!variableItem?.key || typeof variableItem.key !== 'string') {
                    errors.push("Invalid variable item: missing or invalid key");
                    continue;
                }

                const requiredKey = variableItem.key;

                // Find matching client secret in the variables array
                let matchingSecret: { key: string, value: string } | undefined;

                for (const clientSecret of clientSecrets) {
                    try {
                        if (Array.isArray(clientSecret.variables)) {
                            const variable = clientSecret.variables.find((v: any) =>
                                v && typeof v === 'object' && v.key === requiredKey
                            );
                            if (variable && typeof variable === 'object' && 'value' in variable) {
                                matchingSecret = {
                                    key: requiredKey,
                                    value: variable.value as string
                                };
                                break;
                            }
                        }
                    } catch (secretError) {
                        console.error(`❌ Error processing client secret:`, secretError);
                        errors.push(`Error processing client secret: ${secretError instanceof Error ? secretError.message : String(secretError)}`);
                    }
                }

                if (matchingSecret) {
                    if (matchingSecret.value && matchingSecret.value.trim() !== '') {
                        try {
                            // Encrypt the value before adding it
                            const encryptedValue = cryptoVault.encrypt(matchingSecret.value);
                            authVariables.push({
                                key: requiredKey,
                                value: encryptedValue
                            });
                            console.log(`✅ Found and encrypted auth variable: ${requiredKey}`);
                        } catch (encryptError) {
                            const errorMsg = `Failed to encrypt variable "${requiredKey}": ${encryptError instanceof Error ? encryptError.message : String(encryptError)}`;
                            console.error(`❌ ${errorMsg}`);
                            errors.push(errorMsg);
                        }
                    } else {
                        const warning = `Auth variable "${requiredKey}" found but value is empty`;
                        console.warn(`⚠️ ${warning}`);
                        errors.push(warning);
                    }
                } else {
                    const warning = `Required auth variable "${requiredKey}" not found in clientSecrets`;
                    console.warn(`⚠️ ${warning}`);
                    errors.push(warning);
                }
            } catch (itemError) {
                const errorMsg = `Error processing variable item: ${itemError instanceof Error ? itemError.message : String(itemError)}`;
                console.error(`❌ ${errorMsg}`);
                errors.push(errorMsg);
            }
        }

        // Add variables to preset body if any were successfully processed
        if (authVariables.length > 0) {
            try {
                if (!presetBody.auth) {
                    presetBody.auth = {};
                }
                if (!presetBody.auth.variables) {
                    presetBody.auth.variables = [];
                }
                presetBody.auth.variables.push(...authVariables);
                console.log(`✅ Added ${authVariables.length} encrypted variables to preset body`);
            } catch (addError) {
                const errorMsg = `Failed to add variables to preset body: ${addError instanceof Error ? addError.message : String(addError)}`;
                console.error(`❌ ${errorMsg}`);
                return { success: false, error: errorMsg, addedCount: 0 };
            }
        }

        // Return result with warnings if any
        const hasErrors = errors.length > 0;
        return {
            success: authVariables.length > 0 || !hasErrors,
            error: hasErrors ? `Warnings/Errors: ${errors.join('; ')}` : undefined,
            addedCount: authVariables.length
        };

    } catch (error) {
        const errorMessage = `Failed to add encrypted variables: ${error instanceof Error ? error.message : String(error)}`;
        console.error("❌", errorMessage);
        return { success: false, error: errorMessage, addedCount: 0 };
    }
}