// #!/usr/bin/env node
// // USAGE: 
// // 1. Set the GITHUB_TOKEN environment variable to a personal access token with the 'delete_repo' scope
// //    - https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
// //    - set GITHUB_TOKEN=your_token_here
// // 2. Run the script with the organization name as an argument
// //    - node scripts/delete-all-github-repos.js <organization-name>

// const https = require('https');
// const readline = require('readline');

// // Configuration
// const GITHUB_API_BASE = 'https://api.github.com';

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

// async function confirmDeletion(repoCount, orgName) {
//   const rl = createReadlineInterface();
  
//   log(`\n${colors.yellow}${colors.bold}⚠️  WARNING: This will delete ALL ${repoCount} repositories from the '${orgName}' organization!${colors.reset}`);
//   log(`${colors.red}This action cannot be undone! All code, issues, wiki, and other data will be permanently lost!${colors.reset}\n`);
  
//   const confirmation = await askQuestion(rl, "Are you absolutely sure you want to continue? Type 'DELETE ALL REPOS' to confirm: ");
//   rl.close();
  
//   return confirmation === 'DELETE ALL REPOS';
// }

// function makeGitHubRequest(path, method = 'GET', data = null, token) {
//   return new Promise((resolve, reject) => {
//     const url = new URL(path, GITHUB_API_BASE);
    
//     const options = {
//       hostname: url.hostname,
//       port: 443,
//       path: url.pathname + url.search,
//       method: method,
//       headers: {
//         'Authorization': `token ${token}`,
//         'User-Agent': 'GitHub-Repo-Deletion-Script',
//         'Accept': 'application/vnd.github.v3+json',
//         'Content-Type': 'application/json'
//       }
//     };

//     if (data && method !== 'GET') {
//       const jsonData = JSON.stringify(data);
//       options.headers['Content-Length'] = Buffer.byteLength(jsonData);
//     }

//     const req = https.request(options, (res) => {
//       let responseData = '';

//       res.on('data', (chunk) => {
//         responseData += chunk;
//       });

//       res.on('end', () => {
//         try {
//           const parsedData = responseData ? JSON.parse(responseData) : {};
          
//           if (res.statusCode >= 200 && res.statusCode < 300) {
//             resolve({
//               data: parsedData,
//               statusCode: res.statusCode,
//               headers: res.headers
//             });
//           } else {
//             reject(new Error(`GitHub API Error: ${res.statusCode} - ${parsedData.message || 'Unknown error'}`));
//           }
//         } catch (error) {
//           reject(new Error(`Failed to parse GitHub API response: ${error.message}`));
//         }
//       });
//     });

//     req.on('error', (error) => {
//       reject(new Error(`Request failed: ${error.message}`));
//     });

//     if (data && method !== 'GET') {
//       req.write(JSON.stringify(data));
//     }

//     req.end();
//   });
// }

// async function getAllRepositories(orgName, token) {
//   log(`${colors.cyan}📋 Fetching all repositories from organization '${orgName}'...${colors.reset}`);
  
//   const allRepos = [];
//   let page = 1;
//   const perPage = 100;
  
//   try {
//     while (true) {
//       const response = await makeGitHubRequest(
//         `/orgs/${orgName}/repos?per_page=${perPage}&page=${page}&type=all`,
//         'GET',
//         null,
//         token
//       );
      
//       const repos = response.data;
      
//       if (!repos || repos.length === 0) {
//         break;
//       }
      
//       allRepos.push(...repos);
      
//       // Check if we've reached the last page
//       if (repos.length < perPage) {
//         break;
//       }
      
//       page++;
//     }
    
//     log(`${colors.green}✅ Found ${allRepos.length} repositories${colors.reset}\n`);
    
//     if (allRepos.length > 0) {
//       log(`${colors.cyan}Repositories to be deleted:${colors.reset}`);
//       allRepos.forEach((repo, index) => {
//         const visibility = repo.private ? 'Private' : 'Public';
//         const language = repo.language || 'N/A';
//         const size = repo.size ? `${repo.size}KB` : 'N/A';
//         log(`${colors.yellow}${index + 1}. ${repo.name}${colors.reset} (${visibility}, ${language}, ${size})`);
//       });
//       log('');
//     }
    
//     return allRepos;
//   } catch (error) {
//     log(`${colors.red}❌ Error fetching repositories: ${error.message}${colors.reset}`);
//     throw error;
//   }
// }

// async function deleteRepository(orgName, repoName, token) {
//   try {
//     await makeGitHubRequest(
//       `/repos/${orgName}/${repoName}`,
//       'DELETE',
//       null,
//       token
//     );
    
//     log(`${colors.green}✅ Deleted: ${repoName}${colors.reset}`);
//     return { success: true, repoName };
//   } catch (error) {
//     log(`${colors.red}❌ Failed to delete ${repoName}: ${error.message}${colors.reset}`);
//     return { success: false, repoName, error: error.message };
//   }
// }

// async function deleteAllRepositories(orgName, repositories, token) {
//   log(`${colors.magenta}🚀 Starting deletion process...${colors.reset}\n`);
  
//   const results = {
//     successful: [],
//     failed: []
//   };
  
//   // Delete repositories with some concurrency control (max 3 at a time to avoid rate limits)
//   const batchSize = 3;
  
//   for (let i = 0; i < repositories.length; i += batchSize) {
//     const batch = repositories.slice(i, i + batchSize);
    
//     const batchPromises = batch.map(repo => 
//       deleteRepository(orgName, repo.name, token)
//     );
    
//     const batchResults = await Promise.all(batchPromises);
    
//     batchResults.forEach(result => {
//       if (result.success) {
//         results.successful.push(result.repoName);
//       } else {
//         results.failed.push({ repoName: result.repoName, error: result.error });
//       }
//     });
    
//     // Delay between batches to respect GitHub API rate limits
//     if (i + batchSize < repositories.length) {
//       await new Promise(resolve => setTimeout(resolve, 2000));
//     }
//   }
  
//   return results;
// }

// function printSummary(results, totalRepos) {
//   log(`\n${colors.bold}${colors.cyan}📊 DELETION SUMMARY${colors.reset}`);
//   log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  
//   log(`${colors.green}✅ Successfully deleted: ${results.successful.length}/${totalRepos}${colors.reset}`);
//   log(`${colors.red}❌ Failed to delete: ${results.failed.length}/${totalRepos}${colors.reset}`);
  
//   if (results.failed.length > 0) {
//     log(`\n${colors.red}${colors.bold}Failed deletions:${colors.reset}`);
//     results.failed.forEach(failure => {
//       log(`${colors.red}  • ${failure.repoName}: ${failure.error}${colors.reset}`);
//     });
//   }
  
//   if (results.successful.length > 0) {
//     log(`\n${colors.green}${colors.bold}Successfully deleted repositories:${colors.reset}`);
//     results.successful.forEach(repoName => {
//       log(`${colors.green}  • ${repoName}${colors.reset}`);
//     });
//   }
  
//   log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
// }

// async function validateGitHubCredentials(token, orgName) {
//   try {
//     // Test the token by trying to fetch organization info
//     const response = await makeGitHubRequest(`/orgs/${orgName}`, 'GET', null, token);
//     log(`${colors.green}✅ Successfully authenticated with GitHub${colors.reset}`);
//     log(`${colors.blue}Organization: ${response.data.name || orgName}${colors.reset}`);
//     return true;
//   } catch (error) {
//     log(`${colors.red}❌ Failed to authenticate with GitHub: ${error.message}${colors.reset}`);
//     return false;
//   }
// }

// async function main() {
//   try {
//     log(`${colors.bold}${colors.magenta}🔥 GitHub Repository Mass Deletion Tool${colors.reset}\n`);
    
//     // Get GitHub token from environment variable
//     const token = process.env.GITHUB_TOKEN;
//     if (!token) {
//       log(`${colors.red}❌ GITHUB_TOKEN environment variable is required${colors.reset}`);
//       log(`${colors.yellow}Please set your GitHub personal access token:${colors.reset}`);
//       log(`${colors.yellow}export GITHUB_TOKEN=your_token_here${colors.reset}`);
//       log(`${colors.yellow}The token needs 'delete_repo' scope for the organization.${colors.reset}`);
//       process.exit(1);
//     }
    
//     // Get organization name from command line argument
//     const orgName = process.argv[2];
//     if (!orgName) {
//       log(`${colors.red}❌ Organization name is required${colors.reset}`);
//       log(`${colors.yellow}Usage: node scripts/delete-all-github-repos.js <organization-name>${colors.reset}`);
//       process.exit(1);
//     }
    
//     log(`${colors.blue}Target organization: ${orgName}${colors.reset}`);
    
//     // Validate GitHub credentials and organization access
//     const isValid = await validateGitHubCredentials(token, orgName);
//     if (!isValid) {
//       process.exit(1);
//     }
    
//     // Fetch all repositories
//     const repositories = await getAllRepositories(orgName, token);
    
//     if (repositories.length === 0) {
//       log(`${colors.yellow}No repositories found in organization '${orgName}'${colors.reset}`);
//       return;
//     }
    
//     // Confirm deletion
//     const confirmed = await confirmDeletion(repositories.length, orgName);
//     if (!confirmed) {
//       log(`${colors.yellow}Operation cancelled by user${colors.reset}`);
//       return;
//     }
    
//     // Delete all repositories
//     const results = await deleteAllRepositories(orgName, repositories, token);
    
//     // Print summary
//     printSummary(results, repositories.length);
    
//     if (results.successful.length === repositories.length) {
//       log(`\n${colors.green}${colors.bold}🎉 All repositories have been successfully deleted!${colors.reset}`);
//     } else if (results.successful.length > 0) {
//       log(`\n${colors.yellow}${colors.bold}⚠️  Partial success: ${results.successful.length}/${repositories.length} repositories deleted${colors.reset}`);
//       log(`${colors.yellow}You may want to retry the failed deletions manually.${colors.reset}`);
//     } else {
//       log(`\n${colors.red}${colors.bold}❌ No repositories were deleted successfully${colors.reset}`);
//     }
    
//   } catch (error) {
//     log(`\n${colors.red}${colors.bold}💥 Fatal error: ${error.message}${colors.reset}`);
//     process.exit(1);
//   }
// }

// // Handle process termination gracefully
// process.on('SIGINT', () => {
//   log(`\n${colors.yellow}Process interrupted by user${colors.reset}`);
//   process.exit(0);
// });

// process.on('SIGTERM', () => {
//   log(`\n${colors.yellow}Process terminated${colors.reset}`);
//   process.exit(0);
// });

// // Run the main function
// if (require.main === module) {
//   main();
// }

// module.exports = { main }; 