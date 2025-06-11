#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Pre-commit hook script to check for @microfox/* packages with "*" version
 * This prevents committing code with local development dependencies
 */

const APPS_WEB_PACKAGE_JSON = path.join(__dirname, '../apps/web/package.json');

function log(message, isError = false, isWarning = false) {
  const timestamp = new Date().toLocaleTimeString();
  let prefix;
  
  if (isError) {
    prefix = `❌ [check-microfox-versions ${timestamp}]`;
  } else if (isWarning) {
    prefix = `⚠️  [check-microfox-versions ${timestamp}]`;
  } else {
    prefix = `✅ [check-microfox-versions ${timestamp}]`;
  }
  
  console.log(`${prefix} ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function main() {
  try {
    log(`Pre-commit check started at: ${new Date().toLocaleString()}`);
    log(`Checking package.json: ${APPS_WEB_PACKAGE_JSON}`);
    
    // Read apps/web/package.json
    if (!fs.existsSync(APPS_WEB_PACKAGE_JSON)) {
      logSection('❌ COMMIT BLOCKED - Package.json Not Found');
      log(`Package.json file not found at: ${APPS_WEB_PACKAGE_JSON}`, true);
      log('', true);
      log('🔧 Possible causes:', true);
      log('1. The hook is running from the wrong directory', true);
      log('2. The file path has changed', true);
      log('3. The apps/web directory structure is different', true);
      log('', true);
      log(`Current working directory: ${process.cwd()}`, true);
      process.exit(1);
    }

    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(APPS_WEB_PACKAGE_JSON, 'utf8'));
    } catch (parseError) {
      logSection('❌ COMMIT BLOCKED - Invalid Package.json');
      log(`Failed to parse package.json: ${parseError.message}`, true);
      log('', true);
      log('🔧 Fix the JSON syntax errors in package.json before committing.', true);
      process.exit(1);
    }

    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const allMicrofoxPackages = Object.entries(dependencies)
      .filter(([name]) => name.startsWith('@microfox/'));
    
    log(`Found ${allMicrofoxPackages.length} @microfox/* packages in dependencies`);

    // Find @microfox/* packages with "*" version
    const microfoxWildcardPackages = allMicrofoxPackages
      .filter(([name, version]) => version === '*')
      .map(([name]) => name);

    if (microfoxWildcardPackages.length > 0) {
      logSection('🚨 COMMIT BLOCKED - Wildcard Dependencies Found');
      log('', true);
      log(`Found ${microfoxWildcardPackages.length} @microfox/* package(s) with wildcard "*" version!`, true);
      log('These should not be committed as they are for local development only.', true);
      log('', true);
      
      log('📦 Packages with "*" version:', true);
      microfoxWildcardPackages.forEach((pkg, index) => {
        log(`   ${index + 1}. ${pkg}`, true);
      });
      
      log('', true);
      log('🔧 How to fix this:', true);
      log('', true);
      log('OPTION 1 - Update to specific versions (Recommended):', true);
      log('1. Find the correct version numbers for these packages', true);
      log('2. Update apps/web/package.json with specific versions', true);
      log('3. Run "npm install" to install the published versions', true);
      log('4. Commit your changes', true);
      log('', true);
      log('OPTION 2 - Remove local development packages:', true);
      log('1. Remove the "*" version packages from package.json', true);
      log('2. Run "npm install" to clean up', true);
      log('3. Add back the packages with proper versions when needed', true);
      log('', true);
      log('💡 Example fix:', true);
      log('   Change: "@microfox/aws-ses": "*"', true);
      log('   To:     "@microfox/aws-ses": "^1.0.4"', true);
      log('', true);
      
      process.exit(1);
    }

    // Show summary of @microfox packages for transparency
    if (allMicrofoxPackages.length > 0) {
      log(`✅ All ${allMicrofoxPackages.length} @microfox/* packages have proper versions`);
      allMicrofoxPackages.forEach(([name, version]) => {
        log(`   • ${name}: ${version}`);
      });
    } else {
      log('No @microfox/* packages found in dependencies');
    }
    
    log('🚀 Pre-commit check passed - Commit allowed!');

  } catch (error) {
    logSection('❌ COMMIT BLOCKED - Unexpected Error');
    log(`Unexpected error during pre-commit check: ${error.message}`, true);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, true);
    }
    log('', true);
    log('🔧 Try these steps:', true);
    log('1. Check if the script has proper permissions', true);
    log('2. Verify the file paths are correct', true);
    log('3. Contact the development team if the issue persists', true);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 