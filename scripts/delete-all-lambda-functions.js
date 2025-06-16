// #!/usr/bin/env node

// const { LambdaClient, ListFunctionsCommand, DeleteFunctionCommand } = require("@aws-sdk/client-lambda");
// const readline = require("readline");

// // Configuration
// const DEFAULT_REGION = "us-east-1";

// // Colors for console output
// const colors = {
//   red: '\x1b[31m',
//   green: '\x1b[32m',
//   yellow: '\x1b[33m',
//   blue: '\x1b[34m',
//   magenta: '\x1b[35m',
//   cyan: '\x1b[36m',
//   reset: '\x1b[0m',
//   bold: '\x1b[1m'
// };

// function log(message, color = colors.reset) {
//   console.log(`${color}${message}${colors.reset}`);
// }

// function createReadlineInterface() {
//   return readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
//   });
// }

// function askQuestion(rl, question) {
//   return new Promise((resolve) => {
//     rl.question(question, (answer) => {
//       resolve(answer);
//     });
//   });
// }

// async function confirmDeletion(functionCount) {
//   const rl = createReadlineInterface();
  
//   log(`\n${colors.yellow}${colors.bold}⚠️  WARNING: This will delete ALL ${functionCount} Lambda functions!${colors.reset}`);
//   log(`${colors.red}This action cannot be undone!${colors.reset}\n`);
  
//   const confirmation = await askQuestion(rl, "Are you absolutely sure you want to continue? Type 'DELETE ALL FUNCTIONS' to confirm: ");
//   rl.close();
  
//   return confirmation === 'DELETE ALL FUNCTIONS';
// }

// async function getLambdaClient() {
//   const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || DEFAULT_REGION;
  
//   const config = {
//     region: region
//   };

//   // Use AWS credentials from environment variables or AWS profile
//   if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
//     config.credentials = {
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//       ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN })
//     };
//     log(`${colors.blue}Using AWS credentials from environment variables${colors.reset}`);
//   } else {
//     log(`${colors.blue}Using AWS credentials from default credential chain (profile, IAM role, etc.)${colors.reset}`);
//   }

//   log(`${colors.blue}Using AWS region: ${region}${colors.reset}\n`);
  
//   return new LambdaClient(config);
// }

// async function listAllLambdaFunctions(lambdaClient) {
//   log(`${colors.cyan}📋 Fetching all Lambda functions...${colors.reset}`);
  
//   const allFunctions = [];
//   let nextMarker = null;
  
//   try {
//     do {
//       const command = new ListFunctionsCommand({
//         MaxItems: 1000,
//         ...(nextMarker && { Marker: nextMarker })
//       });
      
//       const response = await lambdaClient.send(command);
      
//       if (response.Functions) {
//         allFunctions.push(...response.Functions);
//       }
      
//       nextMarker = response.NextMarker;
//     } while (nextMarker);
    
//     log(`${colors.green}✅ Found ${allFunctions.length} Lambda functions${colors.reset}\n`);
    
//     if (allFunctions.length > 0) {
//       log(`${colors.cyan}Functions to be deleted:${colors.reset}`);
//       allFunctions.forEach((func, index) => {
//         log(`${colors.yellow}${index + 1}. ${func.FunctionName}${colors.reset} (Runtime: ${func.Runtime || 'N/A'}, Size: ${func.CodeSize || 'N/A'} bytes)`);
//       });
//       log('');
//     }
    
//     return allFunctions;
//   } catch (error) {
//     log(`${colors.red}❌ Error listing Lambda functions: ${error.message}${colors.reset}`);
//     throw error;
//   }
// }

// async function deleteLambdaFunction(lambdaClient, functionName) {
//   try {
//     const command = new DeleteFunctionCommand({
//       FunctionName: functionName
//     });
    
//     await lambdaClient.send(command);
//     log(`${colors.green}✅ Deleted: ${functionName}${colors.reset}`);
//     return { success: true, functionName };
//   } catch (error) {
//     log(`${colors.red}❌ Failed to delete ${functionName}: ${error.message}${colors.reset}`);
//     return { success: false, functionName, error: error.message };
//   }
// }

// async function deleteAllLambdaFunctions(lambdaClient, functions) {
//   log(`${colors.magenta}🚀 Starting deletion process...${colors.reset}\n`);
  
//   const results = {
//     successful: [],
//     failed: []
//   };
  
//   // Delete functions with some concurrency control (max 5 at a time to avoid rate limits)
//   const batchSize = 5;
  
//   for (let i = 0; i < functions.length; i += batchSize) {
//     const batch = functions.slice(i, i + batchSize);
    
//     const batchPromises = batch.map(func => 
//       deleteLambdaFunction(lambdaClient, func.FunctionName)
//     );
    
//     const batchResults = await Promise.all(batchPromises);
    
//     batchResults.forEach(result => {
//       if (result.success) {
//         results.successful.push(result.functionName);
//       } else {
//         results.failed.push({ functionName: result.functionName, error: result.error });
//       }
//     });
    
//     // Small delay between batches to be respectful to AWS API limits
//     if (i + batchSize < functions.length) {
//       await new Promise(resolve => setTimeout(resolve, 1000));
//     }
//   }
  
//   return results;
// }

// function printSummary(results, totalFunctions) {
//   log(`\n${colors.bold}${colors.cyan}📊 DELETION SUMMARY${colors.reset}`);
//   log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  
//   log(`${colors.green}✅ Successfully deleted: ${results.successful.length}/${totalFunctions}${colors.reset}`);
//   log(`${colors.red}❌ Failed to delete: ${results.failed.length}/${totalFunctions}${colors.reset}`);
  
//   if (results.failed.length > 0) {
//     log(`\n${colors.red}${colors.bold}Failed deletions:${colors.reset}`);
//     results.failed.forEach(failure => {
//       log(`${colors.red}  • ${failure.functionName}: ${failure.error}${colors.reset}`);
//     });
//   }
  
//   if (results.successful.length > 0) {
//     log(`\n${colors.green}${colors.bold}Successfully deleted functions:${colors.reset}`);
//     results.successful.forEach(functionName => {
//       log(`${colors.green}  • ${functionName}${colors.reset}`);
//     });
//   }
  
//   log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
// }

// async function main() {
//   try {
//     log(`${colors.bold}${colors.magenta}🔥 AWS Lambda Function Mass Deletion Tool${colors.reset}\n`);
    
//     // Check for required environment variables
//     if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
//       log(`${colors.yellow}⚠️  No explicit AWS credentials found in environment variables.${colors.reset}`);
//       log(`${colors.yellow}   Make sure you have AWS credentials configured via:${colors.reset}`);
//       log(`${colors.yellow}   - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)${colors.reset}`);
//       log(`${colors.yellow}   - AWS Profile (AWS_PROFILE)${colors.reset}`);
//       log(`${colors.yellow}   - IAM role (if running on EC2/Lambda)${colors.reset}\n`);
//     }
    
//     // Initialize Lambda client
//     const lambdaClient = await getLambdaClient();
    
//     // List all functions
//     const functions = await listAllLambdaFunctions(lambdaClient);
    
//     if (functions.length === 0) {
//       log(`${colors.green}🎉 No Lambda functions found to delete!${colors.reset}`);
//       return;
//     }
    
//     // Confirm deletion
//     const confirmed = await confirmDeletion(functions.length);
    
//     if (!confirmed) {
//       log(`${colors.yellow}❌ Deletion cancelled by user.${colors.reset}`);
//       return;
//     }
    
//     // Delete all functions
//     const results = await deleteAllLambdaFunctions(lambdaClient, functions);
    
//     // Print summary
//     printSummary(results, functions.length);
    
//     if (results.failed.length === 0) {
//       log(`\n${colors.green}${colors.bold}🎉 All Lambda functions have been successfully deleted!${colors.reset}`);
//     } else {
//       log(`\n${colors.yellow}⚠️  Some functions could not be deleted. Please check the errors above and try again if needed.${colors.reset}`);
//       process.exit(1);
//     }
    
//   } catch (error) {
//     log(`\n${colors.red}💥 Fatal error: ${error.message}${colors.reset}`);
//     console.error(error);
//     process.exit(1);
//   }
// }

// // Handle graceful shutdown
// process.on('SIGINT', () => {
//   log(`\n${colors.yellow}👋 Process interrupted by user. Exiting...${colors.reset}`);
//   process.exit(0);
// });

// process.on('SIGTERM', () => {
//   log(`\n${colors.yellow}👋 Process terminated. Exiting...${colors.reset}`);
//   process.exit(0);
// });

// // Run the script
// if (require.main === module) {
//   main();
// }

// module.exports = {
//   main,
//   listAllLambdaFunctions,
//   deleteAllLambdaFunctions
// }; 