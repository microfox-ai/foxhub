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

function log(message) {
  console.log(`[install-microfox] ${message}`);
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
    const packageJson = JSON.parse(fs.readFileSync(APPS_WEB_PACKAGE_JSON, 'utf8'));
    
    // Add or update the dependency with "*" version
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    packageJson.dependencies[packageName] = '*';
    
    // Write back to file with proper formatting
    fs.writeFileSync(APPS_WEB_PACKAGE_JSON, JSON.stringify(packageJson, null, 2) + '\n');
    
    log(`✅ Added ${packageName}: "*" to package.json`);
    return true;
  } catch (error) {
    log(`❌ Failed to update package.json: ${error.message}`);
    return false;
  }
}

function installSpecificPackage(packageName) {
  log(`Installing specific package: ${packageName}`);
  
  // Validate package name format
  if (!packageName.startsWith('@microfox/')) {
    log(`❌ Package name must start with "@microfox/". Got: ${packageName}`, true);
    process.exit(1);
  }

  const packageShortName = packageName.replace('@microfox/', '');
  const microfoxDir = path.join(MICROFOX_NODE_MODULES, '@microfox');
  const srcDir = path.join(microfoxDir, packageShortName);
  
  // Debug: Log the paths we're checking
  log(`Looking for package at: ${srcDir}`);
  
  // Check if @microfox directory exists first
  if (!fs.existsSync(microfoxDir)) {
    log(`❌ @microfox directory not found at: ${microfoxDir}`);
    process.exit(1);
  }
  
  // Check if package exists in Microfox node_modules
  if (!fs.existsSync(srcDir)) {
    log(`❌ Package ${packageName} not found in Microfox node_modules at: ${srcDir}`);
    log('Available @microfox packages:');
    try {
      const availablePackages = fs.readdirSync(microfoxDir)
        .filter(item => {
          const itemPath = path.join(microfoxDir, item);
          return fs.statSync(itemPath).isDirectory();
        });
      availablePackages.forEach(pkg => log(`  - @microfox/${pkg}`));
      
      // Check if the package name exists but with different casing
      const lowerCaseTarget = packageShortName.toLowerCase();
      const matchingPackage = availablePackages.find(pkg => pkg.toLowerCase() === lowerCaseTarget);
      if (matchingPackage && matchingPackage !== packageShortName) {
        log(`\n💡 Did you mean "@microfox/${matchingPackage}"? (case-sensitive)`);
      }
    } catch (e) {
      log('  Could not list available packages');
    }
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
  
  if (copyDirectory(srcDir, destDir)) {
    log(`🎉 Successfully installed ${packageName} for local development!`);
  } else {
    log(`❌ Failed to copy ${packageName}`);
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
    log('Starting microfox package installation...');

    // Check if Microfox node_modules exists
    if (!fs.existsSync(MICROFOX_NODE_MODULES)) {
      log(`❌ Microfox node_modules not found at: ${MICROFOX_NODE_MODULES}`);
      log('Please make sure the Microfox project is in the parent directory and has packages installed.');
      process.exit(1);
    }

    // Read apps/web/package.json
    if (!fs.existsSync(APPS_WEB_PACKAGE_JSON)) {
      log(`❌ Package.json not found at: ${APPS_WEB_PACKAGE_JSON}`);
      process.exit(1);
    }

    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      // Install specific package(s)
      for (const packageName of args) {
        installSpecificPackage(packageName);
      }
    } else {
      // Install all packages with "*" version
      installAllPackages();
    }

  } catch (error) {
    log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 