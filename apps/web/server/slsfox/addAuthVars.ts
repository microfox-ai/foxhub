import { ClientSecret } from "@prisma/client";
import { addEncryptedVariables } from "./encryptVars";

/**
 * Extract authentication and package name from endpoint schema and add to preset body
 */
export const addAuthFromSchema = (
    pathSchema: any,
    clientSecrets: ClientSecret[]
): { presetBody: any; error?: string } => {
    let presetBody: any = {};

    try {
        // Validate inputs
        if (!pathSchema) {
            return { presetBody, error: "Path schema is null or undefined" };
        }

        if (!Array.isArray(clientSecrets)) {
            return { presetBody, error: "Client secrets must be an array" };
        }

        // Check if the endpoint has a request body with auth structure
        const requestBody = pathSchema?.requestBody?.content?.["application/json"]?.schema?.properties?.body;

        if (!requestBody?.properties) {
            console.log("ℹ️ No request body properties found in schema");
            return { presetBody };
        }

        try {
            // Extract package name
            const packageName = requestBody.properties.packageName?.description ||
                requestBody.properties.packageName?.default ||
                requestBody.properties.packageName?.const;
            if (packageName) {
                presetBody.packageName = packageName;
                console.log(`✅ Extracted package name: ${packageName}`);
            } else {
                console.warn("⚠️ No package name found in schema");
            }
        } catch (error) {
            console.error("❌ Error extracting package name:", error);
        }

        // Extract auth configuration
        try {
            const authConfig = requestBody.properties.auth;
            if (authConfig?.properties) {
                presetBody.auth = {};

                // Set auth strategy
                const strategy = authConfig.properties.strategy?.enum?.[0] ||
                    authConfig.properties.strategy?.description ||
                    authConfig.properties.strategy?.const;
                if (strategy) {
                    presetBody.auth.strategy = strategy;
                    console.log(`✅ Extracted auth strategy: ${strategy}`);
                } else {
                    console.warn("⚠️ No auth strategy found in schema");
                }

                // Extract and map authentication variables
                try {
                    const variablesSchema = authConfig.properties.variables;
                    if (variablesSchema?.items && Array.isArray(variablesSchema.items)) {
                        // Extract required variable keys from schema
                        const requiredVariables = variablesSchema.items
                            .map((item: any) => {
                                try {
                                    if (item?.properties?.key?.description) {
                                        return { key: item.properties.key.description };
                                    }
                                    return null;
                                } catch (itemError) {
                                    console.error("❌ Error processing variable item:", itemError);
                                    return null;
                                }
                            })
                            .filter(Boolean) as Array<{ key: string }>;

                        if (requiredVariables.length > 0) {
                            const encryptResult = addEncryptedVariables(clientSecrets, requiredVariables, presetBody);
                            if (!encryptResult.success) {
                                console.error("❌ Error adding encrypted variables:", encryptResult.error);
                                return { presetBody, error: `Failed to add encrypted variables: ${encryptResult.error}` };
                            } else if (encryptResult.error) {
                                console.warn("⚠️ Warnings during variable encryption:", encryptResult.error);
                            }
                            console.log(`✅ Successfully added ${encryptResult.addedCount} encrypted variables`);
                        } else {
                            console.warn("⚠️ No valid variables found in schema");
                        }
                    } else {
                        console.warn("⚠️ No variables schema found or invalid format");
                    }
                } catch (variablesError) {
                    console.error("❌ Error processing auth variables:", variablesError);
                    return { presetBody, error: `Failed to process auth variables: ${variablesError instanceof Error ? variablesError.message : String(variablesError)}` };
                }
            } else {
                console.log("ℹ️ No auth configuration found in schema");
            }
        } catch (authError) {
            console.error("❌ Error processing auth configuration:", authError);
            return { presetBody, error: `Failed to process auth configuration: ${authError instanceof Error ? authError.message : String(authError)}` };
        }

        return { presetBody };

    } catch (error) {
        const errorMessage = `Failed to extract auth from schema: ${error instanceof Error ? error.message : String(error)}`;
        console.error("❌", errorMessage);
        return { presetBody, error: errorMessage };
    }
}

/**
 * Remove auth and packageName from endpoint schema to create a clean schema
 */
export function cleanEndpointSchema(pathSchema: any): { cleanedSchema: any; error?: string } {
    try {
        // Validate input
        if (!pathSchema) {
            return { cleanedSchema: null, error: "Path schema is null or undefined" };
        }

        if (!pathSchema?.requestBody?.content?.["application/json"]?.schema?.properties?.body?.properties) {
            console.log("ℹ️ No body properties found in schema, returning original");
            return { cleanedSchema: pathSchema };
        }

        try {
            // Deep clone the schema to avoid mutating the original
            const cleanedSchema = JSON.parse(JSON.stringify(pathSchema));
            const bodyProperties = cleanedSchema.requestBody.content["application/json"].schema.properties.body.properties;

            // Track what we're removing for logging
            const removedFields: string[] = [];

            // Remove auth and packageName from the schema
            if (bodyProperties.auth) {
                delete bodyProperties.auth;
                removedFields.push('auth');
            }
            if (bodyProperties.packageName) {
                delete bodyProperties.packageName;
                removedFields.push('packageName');
            }

            // Also update required fields if they exist
            const bodyRequired = cleanedSchema.requestBody.content["application/json"].schema.properties.body.required;
            if (Array.isArray(bodyRequired)) {
                const originalLength = bodyRequired.length;
                cleanedSchema.requestBody.content["application/json"].schema.properties.body.required =
                    bodyRequired.filter((field: string) => field !== 'auth' && field !== 'packageName');
                const newLength = cleanedSchema.requestBody.content["application/json"].schema.properties.body.required.length;

                if (originalLength !== newLength) {
                    console.log(`✅ Removed ${originalLength - newLength} required field(s) from schema`);
                }
            }

            if (removedFields.length > 0) {
                console.log(`✅ Cleaned schema: removed ${removedFields.join(', ')}`);
            }

            return { cleanedSchema };

        } catch (cloneError) {
            const errorMessage = `Failed to clone or modify schema: ${cloneError instanceof Error ? cloneError.message : String(cloneError)}`;
            console.error("❌", errorMessage);
            return { cleanedSchema: pathSchema, error: errorMessage };
        }

    } catch (error) {
        const errorMessage = `Failed to clean endpoint schema: ${error instanceof Error ? error.message : String(error)}`;
        console.error("❌", errorMessage);
        return { cleanedSchema: null, error: errorMessage };
    }
} 