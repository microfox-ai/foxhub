// #!/usr/bin/env node

// // LAMBDA RESOURCES CLEANUP
// // This script finds and deletes Lambda-related resources
// // 
// // Usage:
// //   node scripts/cleanup-lambda.js                    # Delete all Lambda resources
// //   node scripts/cleanup-lambda.js my-service         # Delete specific service (all stages)
// //   node scripts/cleanup-lambda.js my-service prod    # Delete specific service + stage
// //   node scripts/cleanup-lambda.js my-service prod us-west-2  # Delete in specific region

// const { 
//   CloudFormationClient, 
//   DescribeStacksCommand,
//   DeleteStackCommand,
//   ListStacksCommand,
//   waitUntilStackDeleteComplete
// } = require("@aws-sdk/client-cloudformation");

// const { 
//   S3Client, 
//   ListBucketsCommand,
//   ListObjectsV2Command,
//   DeleteObjectsCommand,
//   DeleteBucketCommand
// } = require("@aws-sdk/client-s3");

// const { 
//   CloudWatchLogsClient, 
//   DescribeLogGroupsCommand,
//   DeleteLogGroupCommand 
// } = require("@aws-sdk/client-cloudwatch-logs");

// const { 
//   IAMClient,
//   ListRolesCommand,
//   DeleteRoleCommand,
//   ListRolePoliciesCommand,
//   DeleteRolePolicyCommand,
//   ListAttachedRolePoliciesCommand,
//   DetachRolePolicyCommand
// } = require("@aws-sdk/client-iam");

// const readline = require("readline");

// // Configuration
// const DEFAULT_REGION = "us-east-1";
// const COMMON_REGIONS = [
//   'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
//   'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
//   'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2', 'ap-south-1',
//   'ca-central-1', 'sa-east-1'
// ];

// // Colors for console output
// const colors = {
//   red: '\x1b[31m',
//   green: '\x1b[32m',
//   yellow: '\x1b[33m',
//   blue: '\x1b[34m',
//   magenta: '\x1b[35m',
//   cyan: '\x1b[36m',
//   gray: '\x1b[90m',
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

// async function confirmDeletion(foundResources) {
//   const rl = createReadlineInterface();
  
//   log(`\n${colors.yellow}${colors.bold}⚠️  WARNING: This will delete leftover serverless resources!${colors.reset}`);
//   log(`${colors.red}This action cannot be undone!${colors.reset}\n`);
  
//   const totalResources = Object.values(foundResources).reduce((sum, arr) => sum + arr.length, 0);
  
//   if (totalResources === 0) {
//     log(`${colors.green}🎉 No leftover resources found!${colors.reset}`);
//     rl.close();
//     return false;
//   }
  
//   log(`${colors.cyan}Found resources to delete:${colors.reset}`);
  
//   if (foundResources.stacks.length > 0) {
//     log(`${colors.yellow}CloudFormation Stacks (${foundResources.stacks.length}):${colors.reset}`);
//     foundResources.stacks.forEach(stack => {
//       log(`${colors.yellow}  • ${stack.StackName} (${stack.StackStatus}) in ${stack.region}${colors.reset}`);
//     });
//   }
  
//   if (foundResources.buckets.length > 0) {
//     log(`${colors.yellow}S3 Buckets (${foundResources.buckets.length}):${colors.reset}`);
//     foundResources.buckets.forEach(bucket => {
//       log(`${colors.yellow}  • ${bucket.Name}${colors.reset}`);
//     });
//   }
  
//   if (foundResources.logGroups.length > 0) {
//     log(`${colors.yellow}CloudWatch Log Groups (${foundResources.logGroups.length}):${colors.reset}`);
//     foundResources.logGroups.forEach(group => {
//       log(`${colors.yellow}  • ${group.logGroupName} in ${group.region}${colors.reset}`);
//     });
//   }
  
//   if (foundResources.roles.length > 0) {
//     log(`${colors.yellow}IAM Roles (${foundResources.roles.length}):${colors.reset}`);
//     foundResources.roles.forEach(role => {
//       log(`${colors.yellow}  • ${role.RoleName}${colors.reset}`);
//     });
//   }
  
//   log('');
//   const confirmation = await askQuestion(rl, `Type 'DELETE LEFTOVER RESOURCES' to confirm: `);
//   rl.close();
  
//   return confirmation === 'DELETE LEFTOVER RESOURCES';
// }

// function isLambdaRelated(name, serviceName = null, stage = null) {
//   const nameToCheck = name.toLowerCase();
  
//   // If specific service/stage provided, check for exact matches first
//   if (serviceName) {
//     const servicePattern = serviceName.toLowerCase();
//     if (stage) {
//       // Look for service-stage pattern
//       const exactPattern = new RegExp(`${servicePattern}-${stage.toLowerCase()}`, 'i');
//       if (exactPattern.test(nameToCheck)) {
//         return true;
//       }
//     } else {
//       // Look for service pattern (any stage)
//       if (nameToCheck.includes(servicePattern)) {
//         return true;
//       }
//     }
//   }
  
//   // Focus specifically on Lambda-related resources
//   const lambdaPatterns = [
//     /.*-lambda.*$/,           // Contains 'lambda'
//     /.*lambdarole$/,          // Lambda execution roles
//     /.*serverlessdeployment.*$/,  // Serverless deployment buckets
//     /^[^-]+-[^-]+-[^-]+$/,    // service-stage-function pattern
//   ];
  
//   // Direct Lambda indicators
//   const lambdaIndicators = [
//     'lambda', 'lambdarole'
//   ];
  
//   return lambdaIndicators.some(indicator => nameToCheck.includes(indicator)) ||
//          lambdaPatterns.some(pattern => pattern.test(nameToCheck));
// }

// async function findLambdaCloudFormationStacks(regions, serviceName = null, stage = null) {
//   log(`${colors.cyan}🔍 Scanning for Lambda CloudFormation stacks...${colors.reset}`);
  
//   const foundStacks = [];
  
//   for (const region of regions) {
//     try {
//       const cfClient = new CloudFormationClient({ region });
      
//       log(`${colors.blue}   • Scanning region: ${region}${colors.reset}`);
      
//       // Get stacks that might contain Lambda resources
//       const listCommand = new ListStacksCommand({
//         StackStatusFilter: [
//           'CREATE_COMPLETE', 'UPDATE_COMPLETE', 'DELETE_FAILED', 
//           'ROLLBACK_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'
//         ]
//       });
      
//       const response = await cfClient.send(listCommand);
      
//       if (response.StackSummaries) {
//         for (const stack of response.StackSummaries) {
//           // Only target Lambda-specific stacks
//           if (isLambdaRelated(stack.StackName, serviceName, stage)) {
//             foundStacks.push({
//               ...stack,
//               region
//             });
//             log(`${colors.green}     Found: ${stack.StackName} (${stack.StackStatus})${colors.reset}`);
//           }
//         }
//       }
//     } catch (error) {
//       log(`${colors.yellow}⚠️  Could not scan region ${region}: ${error.message}${colors.reset}`);
//     }
//   }
  
//   log(`${colors.green}✅ Found ${foundStacks.length} Lambda-related CloudFormation stacks${colors.reset}\n`);
//   return foundStacks;
// }

// async function findLambdaS3Buckets(serviceName = null, stage = null) {
//   log(`${colors.cyan}🔍 Scanning for Lambda deployment S3 buckets...${colors.reset}`);
  
//   const foundBuckets = [];
  
//   try {
//     const s3Client = new S3Client({ region: DEFAULT_REGION });
    
//     const listCommand = new ListBucketsCommand({});
//     const response = await s3Client.send(listCommand);
    
//     if (response.Buckets) {
//       for (const bucket of response.Buckets) {
//         // Only target Lambda deployment buckets
//         if (bucket.Name.includes('serverlessdeployment') || isLambdaRelated(bucket.Name, serviceName, stage)) {
//           foundBuckets.push(bucket);
//           log(`${colors.green}     Found: ${bucket.Name}${colors.reset}`);
//         }
//       }
//     }
//   } catch (error) {
//     log(`${colors.yellow}⚠️  Could not list S3 buckets: ${error.message}${colors.reset}`);
//   }
  
//   log(`${colors.green}✅ Found ${foundBuckets.length} Lambda deployment S3 buckets${colors.reset}\n`);
//   return foundBuckets;
// }

// async function findLambdaLogGroups(regions, serviceName = null, stage = null) {
//   log(`${colors.cyan}🔍 Scanning for Lambda log groups...${colors.reset}`);
  
//   const foundLogGroups = [];
  
//   for (const region of regions) {
//     try {
//       const logsClient = new CloudWatchLogsClient({ region });
      
//       log(`${colors.blue}   • Scanning region: ${region}${colors.reset}`);
      
//       const describeCommand = new DescribeLogGroupsCommand({});
//       const response = await logsClient.send(describeCommand);
      
//       if (response.logGroups) {
//         for (const logGroup of response.logGroups) {
//           // Only target Lambda-specific log groups
//           if (logGroup.logGroupName.startsWith('/aws/lambda/')) {
//             // Additional filtering for specific service/stage
//             if (!serviceName || isLambdaRelated(logGroup.logGroupName, serviceName, stage)) {
//               foundLogGroups.push({
//                 ...logGroup,
//                 region
//               });
//               log(`${colors.green}     Found: ${logGroup.logGroupName}${colors.reset}`);
//             }
//           }
//         }
//       }
//     } catch (error) {
//       log(`${colors.yellow}⚠️  Could not scan region ${region}: ${error.message}${colors.reset}`);
//     }
//   }
  
//   log(`${colors.green}✅ Found ${foundLogGroups.length} Lambda log groups${colors.reset}\n`);
//   return foundLogGroups;
// }

// async function findLambdaIAMRoles(serviceName = null, stage = null) {
//   log(`${colors.cyan}🔍 Scanning for Lambda IAM roles...${colors.reset}`);
  
//   const foundRoles = [];
//   const excludedRoles = ['lambda-executor']; // Roles to never delete
  
//   try {
//     const iamClient = new IAMClient({ region: DEFAULT_REGION }); // IAM is global
    
//     const listCommand = new ListRolesCommand({});
//     const response = await iamClient.send(listCommand);
    
//     if (response.Roles) {
//       for (const role of response.Roles) {
//         // Skip excluded roles
//         if (excludedRoles.includes(role.RoleName)) {
//           log(`${colors.blue}     Skipped (excluded): ${role.RoleName}${colors.reset}`);
//           continue;
//         }
        
//         // Only target Lambda execution roles
//         if (role.RoleName.includes('lambdaRole') || isLambdaRelated(role.RoleName, serviceName, stage)) {
//           foundRoles.push(role);
//           log(`${colors.green}     Found: ${role.RoleName}${colors.reset}`);
//         }
//       }
//     }
//   } catch (error) {
//     log(`${colors.yellow}⚠️  Could not scan IAM roles: ${error.message}${colors.reset}`);
//   }
  
//   log(`${colors.green}✅ Found ${foundRoles.length} Lambda IAM roles (excluded ${excludedRoles.length} protected roles)${colors.reset}\n`);
//   return foundRoles;
// }

// async function deleteCloudFormationStacks(foundStacks) {
//   if (foundStacks.length === 0) return;
  
//   log(`${colors.cyan}🗑️  Deleting CloudFormation stacks...${colors.reset}`);
  
//   for (const stack of foundStacks) {
//     try {
//       const cfClient = new CloudFormationClient({ region: stack.region });
      
//       // If stack is in DELETE_FAILED state, we need to retry deletion
//       if (stack.StackStatus === 'DELETE_FAILED') {
//         log(`${colors.yellow}   • Retrying failed stack deletion: ${stack.StackName} in ${stack.region}${colors.reset}`);
//       } else {
//         log(`${colors.yellow}   • Deleting stack: ${stack.StackName} in ${stack.region}${colors.reset}`);
//       }
      
//       const deleteCommand = new DeleteStackCommand({ StackName: stack.StackName });
//       await cfClient.send(deleteCommand);
      
//       log(`${colors.blue}   • Waiting for stack deletion to complete...${colors.reset}`);
//       await waitUntilStackDeleteComplete(
//         { client: cfClient, maxWaitTime: 600 },
//         { StackName: stack.StackName }
//       );
      
//       log(`${colors.green}✅ Successfully deleted stack: ${stack.StackName}${colors.reset}`);
//     } catch (error) {
//       if (error.name === 'ValidationError' || error.message.includes('does not exist')) {
//         log(`${colors.blue}   • Stack ${stack.StackName} already deleted${colors.reset}`);
//       } else {
//         log(`${colors.red}❌ Failed to delete stack ${stack.StackName}: ${error.message}${colors.reset}`);
//         // For failed deletions, try to get more details
//         if (error.observedResponses) {
//           log(`${colors.red}   Error details: ${JSON.stringify(error.observedResponses)}${colors.reset}`);
//         }
//       }
//     }
//   }
// }

// async function deleteS3Buckets(foundBuckets) {
//   if (foundBuckets.length === 0) return;
  
//   log(`${colors.cyan}🗑️  Deleting S3 buckets...${colors.reset}`);
  
//   for (const bucket of foundBuckets) {
//     try {
//       const s3Client = new S3Client({ region: DEFAULT_REGION });
      
//       log(`${colors.yellow}   • Emptying and deleting bucket: ${bucket.Name}${colors.reset}`);
      
//       // List and delete all objects
//       let continuationToken = undefined;
//       do {
//         const listCommand = new ListObjectsV2Command({
//           Bucket: bucket.Name,
//           ContinuationToken: continuationToken
//         });
        
//         const listResponse = await s3Client.send(listCommand);
        
//         if (listResponse.Contents && listResponse.Contents.length > 0) {
//           const deleteCommand = new DeleteObjectsCommand({
//             Bucket: bucket.Name,
//             Delete: {
//               Objects: listResponse.Contents.map(obj => ({ Key: obj.Key }))
//             }
//           });
          
//           await s3Client.send(deleteCommand);
//           log(`${colors.blue}     Deleted ${listResponse.Contents.length} objects${colors.reset}`);
//         }
        
//         continuationToken = listResponse.NextContinuationToken;
//       } while (continuationToken);
      
//       // Delete the bucket
//       await s3Client.send(new DeleteBucketCommand({ Bucket: bucket.Name }));
//       log(`${colors.green}✅ Successfully deleted bucket: ${bucket.Name}${colors.reset}`);
      
//     } catch (error) {
//       if (error.name === 'NoSuchBucket') {
//         log(`${colors.blue}   • Bucket ${bucket.Name} already deleted${colors.reset}`);
//       } else {
//         log(`${colors.red}❌ Failed to delete bucket ${bucket.Name}: ${error.message}${colors.reset}`);
//       }
//     }
//   }
// }

// async function deleteLogGroups(foundLogGroups) {
//   if (foundLogGroups.length === 0) return;
  
//   log(`${colors.cyan}🗑️  Deleting CloudWatch log groups...${colors.reset}`);
  
//   for (const logGroup of foundLogGroups) {
//     try {
//       const logsClient = new CloudWatchLogsClient({ region: logGroup.region });
      
//       log(`${colors.yellow}   • Deleting log group: ${logGroup.logGroupName} in ${logGroup.region}${colors.reset}`);
      
//       const deleteCommand = new DeleteLogGroupCommand({
//         logGroupName: logGroup.logGroupName
//       });
      
//       await logsClient.send(deleteCommand);
//       log(`${colors.green}✅ Successfully deleted log group: ${logGroup.logGroupName}${colors.reset}`);
      
//     } catch (error) {
//       if (error.name === 'ResourceNotFoundException') {
//         log(`${colors.blue}   • Log group ${logGroup.logGroupName} already deleted${colors.reset}`);
//       } else {
//         log(`${colors.red}❌ Failed to delete log group ${logGroup.logGroupName}: ${error.message}${colors.reset}`);
//       }
//     }
//   }
// }

// async function deleteIAMRoles(foundRoles) {
//   if (foundRoles.length === 0) return;
  
//   log(`${colors.cyan}🗑️  Deleting IAM roles...${colors.reset}`);
  
//   const iamClient = new IAMClient({ region: DEFAULT_REGION });
  
//   for (const role of foundRoles) {
//     try {
//       log(`${colors.yellow}   • Processing role: ${role.RoleName}${colors.reset}`);
      
//       // Detach managed policies
//       try {
//         const attachedPoliciesCommand = new ListAttachedRolePoliciesCommand({
//           RoleName: role.RoleName
//         });
//         const attachedPolicies = await iamClient.send(attachedPoliciesCommand);
        
//         for (const policy of attachedPolicies.AttachedPolicies || []) {
//           await iamClient.send(new DetachRolePolicyCommand({
//             RoleName: role.RoleName,
//             PolicyArn: policy.PolicyArn
//           }));
//           log(`${colors.blue}     Detached policy: ${policy.PolicyName}${colors.reset}`);
//         }
//       } catch (error) {
//         if (error.name === 'NoSuchEntityException' || error.message.includes('cannot be found')) {
//           log(`${colors.blue}     Role ${role.RoleName} already deleted (skipping policy cleanup)${colors.reset}`);
//           continue; // Skip to next role
//         }
//         log(`${colors.yellow}     Could not detach policies: ${error.message}${colors.reset}`);
//       }
      
//       // Delete inline policies
//       try {
//         const inlinePoliciesCommand = new ListRolePoliciesCommand({
//           RoleName: role.RoleName
//         });
//         const inlinePolicies = await iamClient.send(inlinePoliciesCommand);
        
//         for (const policyName of inlinePolicies.PolicyNames || []) {
//           await iamClient.send(new DeleteRolePolicyCommand({
//             RoleName: role.RoleName,
//             PolicyName: policyName
//           }));
//           log(`${colors.blue}     Deleted inline policy: ${policyName}${colors.reset}`);
//         }
//       } catch (error) {
//         if (error.name === 'NoSuchEntityException' || error.message.includes('cannot be found')) {
//           // Role already deleted, skip inline policy cleanup
//           continue;
//         }
//         log(`${colors.yellow}     Could not delete inline policies: ${error.message}${colors.reset}`);
//       }
      
//       // Delete the role
//       await iamClient.send(new DeleteRoleCommand({
//         RoleName: role.RoleName
//       }));
      
//       log(`${colors.green}✅ Successfully deleted role: ${role.RoleName}${colors.reset}`);
      
//     } catch (error) {
//       if (error.name === 'NoSuchEntityException' || error.message.includes('cannot be found')) {
//         log(`${colors.blue}   • Role ${role.RoleName} already deleted (likely by CloudFormation)${colors.reset}`);
//       } else {
//         log(`${colors.red}❌ Failed to delete role ${role.RoleName}: ${error.message}${colors.reset}`);
//       }
//     }
//   }
// }

// async function main() {
//   try {
//     log(`${colors.bold}${colors.magenta}🧹 Lambda Resources Cleanup${colors.reset}\n`);
//     log(`${colors.yellow}This script targets Lambda-specific resources only.${colors.reset}`);
//     log(`${colors.yellow}Use this to clean up Lambda functions and their related infrastructure.${colors.reset}`);
    
//     if (!serviceName && !stage && !region) {
//       log(`\n${colors.cyan}💡 Usage Examples:${colors.reset}`);
//       log(`${colors.blue}  npm run cleanup-lambda                    ${colors.gray}# Delete all Lambda resources${colors.reset}`);
//       log(`${colors.blue}  npm run cleanup-lambda my-service         ${colors.gray}# Delete specific service (all stages)${colors.reset}`);
//       log(`${colors.blue}  npm run cleanup-lambda my-service prod    ${colors.gray}# Delete specific service + stage${colors.reset}`);
//       log(`${colors.blue}  npm run cleanup-lambda my-service prod us-west-2  ${colors.gray}# Delete in specific region${colors.reset}`);
//     }
//     log('');
    
//     // Parse command line arguments
//     const serviceName = process.argv[2] || null;
//     const stage = process.argv[3] || null;
//     const region = process.argv[4] || null;
//     const regions = region ? [region] : COMMON_REGIONS;
    
//     log(`${colors.bold}Configuration:${colors.reset}`);
//     log(`  Service: ${serviceName ? colors.cyan + serviceName : colors.yellow + 'ALL SERVICES'}${colors.reset}`);
//     log(`  Stage: ${stage ? colors.cyan + stage : colors.yellow + 'ALL STAGES'}${colors.reset}`);
//     log(`  Regions: ${region ? colors.cyan + region : colors.yellow + 'ALL COMMON REGIONS'}${colors.reset}\n`);
    
//     // Check for required environment variables
//     if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
//       log(`${colors.yellow}⚠️  No explicit AWS credentials found in environment variables.${colors.reset}`);
//       log(`${colors.yellow}   Make sure you have AWS credentials configured.${colors.reset}\n`);
//     }
    
//     // Discover Lambda-specific resources
//     const [stacks, buckets, logGroups, roles] = await Promise.all([
//       findLambdaCloudFormationStacks(regions, serviceName, stage),
//       findLambdaS3Buckets(serviceName, stage),
//       findLambdaLogGroups(regions, serviceName, stage),
//       findLambdaIAMRoles(serviceName, stage)
//     ]);
    
//     const foundResources = { stacks, buckets, logGroups, roles };
    
//     // Confirm deletion
//     const confirmed = await confirmDeletion(foundResources);
    
//     if (!confirmed) {
//       log(`${colors.yellow}❌ Cleanup cancelled by user.${colors.reset}`);
//       return;
//     }
    
//     log(`\n${colors.bold}${colors.magenta}🚀 Starting Lambda resource cleanup...${colors.reset}\n`);
    
//     // Delete resources in correct order: S3 buckets first, then CloudFormation stacks
//     await deleteS3Buckets(buckets);
//     await deleteCloudFormationStacks(stacks);
//     await deleteLogGroups(logGroups);
//     await deleteIAMRoles(roles);
    
//     log(`\n${colors.green}${colors.bold}🎉 Lambda cleanup finished!${colors.reset}`);
//     log(`${colors.green}All found Lambda-related resources have been cleaned up.${colors.reset}`);
    
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
//   findLambdaCloudFormationStacks,
//   findLambdaS3Buckets,
//   findLambdaLogGroups,
//   findLambdaIAMRoles,
//   isLambdaRelated
// }; 