#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script to copy @microfox/* packages from parent Microfox directory
 * for faster local development
 * 
 * Usage:
 * 1. npm run install-microfox                     // Copy all packages with "*" version
 * 2. npm run install-microfox "@microfox/package" // Add specific package and copy it
 */

const APPS_WEB_PACKAGE_JSON = path.join(__dirname, '../apps/web/package.json');
const APPS_WEB_NODE_MODULES = path.join(__dirname, '../node_modules');
const MICROFOX_NODE_MODULES = path.join(__dirname, '../../Microfox/node_modules');

function log(message, isError = false, isWarning = false) {
  const timestamp = new Date().toLocaleTimeString();
  let prefix;
  
  if (isError) {
    prefix = `❌ [install-microfox ${timestamp}]`;
  } else if (isWarning) {
    prefix = `⚠️  [install-microfox ${timestamp}]`;
  } else {
    prefix = `ℹ️  [install-microfox ${timestamp}]`;
  }
  
  console.log(`${prefix} ${message}`);
}

function logSuccess(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`✅ [install-microfox ${timestamp}] ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function copyDirectory(src, dest) {
  try {
    // Normalize paths for Windows
    const normalizedSrc = path.resolve(src);
    const normalizedDest = path.resolve(dest);
    
    log(`Copying from: ${normalizedSrc}`);
    log(`Copying to: ${normalizedDest}`);
    
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(normalizedDest)) {
      fs.mkdirSync(normalizedDest, { recursive: true });
    }

    // Use platform-appropriate copy command
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Use robocopy on Windows for better performance
      // Note: robocopy returns 1 for successful copy, which Node.js treats as error
      try {
        execSync(`robocopy "${normalizedSrc}" "${normalizedDest}" /E /NFL /NDL /NJH /NJS /nc /ns /np`, { stdio: 'pipe' });
      } catch (error) {
        // Robocopy exit codes: 0 = no files copied, 1 = files copied successfully
        if (error.status !== 1 && error.status !== 0) {
          throw error;
        }
      }
    } else {
      // Use cp on Unix-like systems
      execSync(`cp -r "${normalizedSrc}/." "${normalizedDest}"`, { stdio: 'pipe' });
    }
    
    // Verify the copy was successful
    if (fs.existsSync(normalizedDest) && fs.readdirSync(normalizedDest).length > 0) {
      log(`✅ Copied ${normalizedSrc} -> ${normalizedDest}`);
      return true;
    } else {
      log(`❌ Copy verification failed: destination is empty`);
      return false;
    }
    
  } catch (error) {
    log(`❌ Failed to copy ${src} -> ${dest}: ${error.message}`);
    return false;
  }
}

function updatePackageJson(packageName) {
  try {
    log(`Updating package.json to add ${packageName} with "*" version...`);
    
    if (!fs.existsSync(APPS_WEB_PACKAGE_JSON)) {
      log(`Package.json file not found at: ${APPS_WEB_PACKAGE_JSON}`, true);
      log('Make sure you are running this command from the Foxhub root directory.', true);
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(APPS_WEB_PACKAGE_JSON, 'utf8'));
    
    // Check if package already exists with different version
    const existingVersion = packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName];
    if (existingVersion && existingVersion !== '*') {
      log(`Package ${packageName} already exists with version: ${existingVersion}`, false, true);
      log(`Updating to "*" for local development...`, false, true);
    }
    
    // Add or update the dependency with "*" version
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    packageJson.dependencies[packageName] = '*';
    
    // Remove from devDependencies if it exists there
    if (packageJson.devDependencies?.[packageName]) {
      delete packageJson.devDependencies[packageName];
      log(`Moved ${packageName} from devDependencies to dependencies`);
    }
    
    // Write back to file with proper formatting
    fs.writeFileSync(APPS_WEB_PACKAGE_JSON, JSON.stringify(packageJson, null, 2) + '\n');
    
    logSuccess(`Added ${packageName}: "*" to package.json`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      log(`Package.json file not found at: ${APPS_WEB_PACKAGE_JSON}`, true);
      log('Ensure you are in the correct directory and the file exists.', true);
    } else if (error instanceof SyntaxError) {
      log(`Invalid JSON in package.json: ${error.message}`, true);
      log('Please fix the JSON syntax errors before proceeding.', true);
    } else if (error.code === 'EACCES') {
      log(`Permission denied writing to package.json`, true);
      log('Check file permissions and try running with appropriate privileges.', true);
    } else {
      log(`Failed to update package.json: ${error.message}`, true);
      log(`Error code: ${error.code || 'Unknown'}`, true);
    }
    return false;
  }
}

function installSpecificPackage(packageName) {
  logSection(`Installing Specific Package: ${packageName}`);
  
  // Validate package name format
  if (!packageName || typeof packageName !== 'string') {
    log(`Invalid package name provided: ${packageName}`, true);
    log('Package name must be a non-empty string.', true);
    process.exit(1);
  }
  
  if (!packageName.startsWith('@microfox/')) {
    log(`Invalid package name format: "${packageName}"`, true);
    log('Package name must start with "@microfox/"', true);
    log('Example: "@microfox/aws-ses"', true);
    process.exit(1);
  }

  const packageShortName = packageName.replace('@microfox/', '');
  if (!packageShortName || packageShortName.trim() === '') {
    log(`Invalid package name: "${packageName}"`, true);
    log('Package name cannot be just "@microfox/"', true);
    log('Example: "@microfox/aws-ses"', true);
    process.exit(1);
  }

  const microfoxDir = path.join(MICROFOX_NODE_MODULES, '@microfox');
  const srcDir = path.join(microfoxDir, packageShortName);
  
  log(`Searching for package: ${packageName}`);
  log(`Source directory: ${srcDir}`);
  
  // Check if @microfox directory exists first
  if (!fs.existsSync(microfoxDir)) {
    log(`Microfox packages directory not found at: ${microfoxDir}`, true);
    log('', true);
    log('🔧 Troubleshooting Steps:', true);
    log('1. Ensure the Microfox project is in the parent directory', true);
    log('2. Run "npm install" in the Microfox project to install packages', true);
    log('3. Verify the directory structure:', true);
    log(`   Expected: ${MICROFOX_NODE_MODULES}`, true);
    log(`   Current working dir: ${process.cwd()}`, true);
    process.exit(1);
  }
  
  // Check if package exists in Microfox node_modules
  if (!fs.existsSync(srcDir)) {
    log(`Package "${packageName}" not found in Microfox packages`, true);
    log(`Searched in: ${srcDir}`, true);
    log('', true);
    
    try {
      const availablePackages = fs.readdirSync(microfoxDir)
        .filter(item => {
          const itemPath = path.join(microfoxDir, item);
          return fs.statSync(itemPath).isDirectory();
        })
        .sort();
        
      if (availablePackages.length === 0) {
        log('No @microfox packages found in the Microfox node_modules directory.', true);
        log('Run "npm install" in the Microfox project first.', true);
      } else {
        log(`📦 Available @microfox packages (${availablePackages.length} found):`, true);
        availablePackages.forEach(pkg => log(`   • @microfox/${pkg}`, true));
        
        // Check for similar package names
        const lowerCaseTarget = packageShortName.toLowerCase();
        const exactMatch = availablePackages.find(pkg => pkg.toLowerCase() === lowerCaseTarget);
        const partialMatches = availablePackages.filter(pkg => 
          pkg.toLowerCase().includes(lowerCaseTarget) || 
          lowerCaseTarget.includes(pkg.toLowerCase())
        );
        
        if (exactMatch && exactMatch !== packageShortName) {
          log('', true);
          log(`💡 Did you mean "@microfox/${exactMatch}"? (case-sensitive)`, true);
        } else if (partialMatches.length > 0) {
          log('', true);
          log(`💡 Similar packages found:`, true);
          partialMatches.forEach(pkg => log(`   • @microfox/${pkg}`, true));
        }
      }
    } catch (e) {
      log(`Error listing available packages: ${e.message}`, true);
    }
    
    log('', true);
    log('🔧 To fix this:', true);
    log('1. Check the package name spelling', true);
    log('2. Ensure the package exists in the Microfox project', true);
    log('3. Run "npm install" in the Microfox project if needed', true);
    
    process.exit(1);
  }

  // Update package.json first
  if (!updatePackageJson(packageName)) {
    process.exit(1);
  }

  // Create @microfox scope directory if it doesn't exist
  const microfoxScopeDir = path.join(APPS_WEB_NODE_MODULES, '@microfox');
  if (!fs.existsSync(microfoxScopeDir)) {
    fs.mkdirSync(microfoxScopeDir, { recursive: true });
  }

  // Copy the package
  const destDir = path.join(APPS_WEB_NODE_MODULES, '@microfox', packageShortName);
  
  log(`Copying package files...`);
  if (copyDirectory(srcDir, destDir)) {
    logSection(`✅ SUCCESS`);
    logSuccess(`Package ${packageName} installed for local development!`);
    log(`Package location: ${destDir}`);
    log(`You can now import and use ${packageName} in your code.`);
  } else {
    log(`Failed to copy package files`, true);
    log('Check the error messages above for details.', true);
    process.exit(1);
  }
}

function installAllPackages() {
  log('Installing all @microfox/* packages with "*" version...');
  
  const packageJson = JSON.parse(fs.readFileSync(APPS_WEB_PACKAGE_JSON, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Find @microfox/* packages with "*" version
  const microfoxPackages = Object.entries(dependencies)
    .filter(([name, version]) => name.startsWith('@microfox/') && version === '*')
    .map(([name]) => name);

  if (microfoxPackages.length === 0) {
    log('ℹ️  No @microfox/* packages with "*" version found');
    return;
  }

  log(`Found ${microfoxPackages.length} @microfox/* packages to install:`);
  microfoxPackages.forEach(pkg => log(`  - ${pkg}`));

  // Create @microfox scope directory if it doesn't exist
  const microfoxScopeDir = path.join(APPS_WEB_NODE_MODULES, '@microfox');
  if (!fs.existsSync(microfoxScopeDir)) {
    fs.mkdirSync(microfoxScopeDir, { recursive: true });
  }

  let successCount = 0;
  let failureCount = 0;

  // Copy each package
  for (const packageName of microfoxPackages) {
    const packageShortName = packageName.replace('@microfox/', '');
    const srcDir = path.join(MICROFOX_NODE_MODULES, '@microfox', packageShortName);
    const destDir = path.join(APPS_WEB_NODE_MODULES, '@microfox', packageShortName);

    if (!fs.existsSync(srcDir)) {
      log(`⚠️  Package ${packageName} not found in Microfox node_modules, skipping...`);
      failureCount++;
      continue;
    }

    if (copyDirectory(srcDir, destDir)) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  log(`\n📊 Installation Summary:`);
  log(`  ✅ Successfully installed: ${successCount} packages`);
  if (failureCount > 0) {
    log(`  ❌ Failed to install: ${failureCount} packages`);
  }
  log('🎉 Microfox package installation completed!');
}

function main() {
  try {
    logSection('Microfox Local Package Installer');
    log(`Started at: ${new Date().toLocaleString()}`);
    log(`Working directory: ${process.cwd()}`);

    // Check if Microfox node_modules exists
    if (!fs.existsSync(MICROFOX_NODE_MODULES)) {
      log(`Microfox node_modules directory not found`, true);
      log(`Expected location: ${MICROFOX_NODE_MODULES}`, true);
      log('', true);
      log('🔧 Setup Instructions:', true);
      log('1. Ensure the Microfox project is in the parent directory', true);
      log('2. Navigate to the Microfox directory and run "npm install"', true);
      log('3. Verify the directory structure:', true);
      log(`   Current: ${process.cwd()}`, true);
      log(`   Microfox should be at: ${path.dirname(MICROFOX_NODE_MODULES)}`, true);
      process.exit(1);
    }

    // Read apps/web/package.json
    if (!fs.existsSync(APPS_WEB_PACKAGE_JSON)) {
      log(`Package.json not found`, true);
      log(`Expected location: ${APPS_WEB_PACKAGE_JSON}`, true);
      log('', true);
      log('🔧 Make sure you are running this command from the Foxhub root directory.', true);
      process.exit(1);
    }

    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      log(`Installing ${args.length} specific package(s)...`);
      // Install specific package(s)
      for (let i = 0; i < args.length; i++) {
        const packageName = args[i];
        log(`\n[${i + 1}/${args.length}] Processing: ${packageName}`);
        installSpecificPackage(packageName);
      }
      
      logSection('🎉 All Packages Installed Successfully');
      log(`Installed ${args.length} package(s) for local development.`);
    } else {
      // Install all packages with "*" version
      installAllPackages();
    }

  } catch (error) {
    log('', true);
    log(`Unexpected error occurred: ${error.message}`, true);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, true);
    }
    log('', true);
    log('🔧 If this error persists:', true);
    log('1. Check file permissions', true);
    log('2. Ensure all paths are correct', true);
    log('3. Try running with administrator/sudo privileges', true);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 