#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APPS_WEB_DIR = path.join(__dirname, '../apps/web');
const APPS_WEB_PACKAGE_JSON = path.join(APPS_WEB_DIR, 'package.json');

function log(message, isError = false, isWarning = false) {
  const timestamp = new Date().toLocaleTimeString();
  let prefix;
  
  if (isError) {
    prefix = `❌ [update-microfox ${timestamp}]`;
  } else if (isWarning) {
    prefix = `⚠️  [update-microfox ${timestamp}]`;
  } else {
    prefix = `ℹ️  [update-microfox ${timestamp}]`;
  }
  
  console.log(`${prefix} ${message}`);
}

function logSuccess(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`✅ [update-microfox ${timestamp}] ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function setPackageVersionToStar(packageName) {
    try {
        log(`Setting version of ${packageName} back to "*" in package.json...`);
        const packageJson = JSON.parse(fs.readFileSync(APPS_WEB_PACKAGE_JSON, 'utf8'));

        if (packageJson.dependencies && packageJson.dependencies[packageName]) {
            packageJson.dependencies[packageName] = '*';
        } else if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
            packageJson.devDependencies[packageName] = '*';
        } else {
            log(`Package ${packageName} not found in dependencies or devDependencies after update. Cannot set version to "*".`, false, true);
            return true;
        }

        fs.writeFileSync(APPS_WEB_PACKAGE_JSON, JSON.stringify(packageJson, null, 2) + '\n');
        logSuccess(`Set ${packageName} version to "*" in package.json.`);
        return true;
    } catch (error) {
        log(`Failed to set version for ${packageName} back to "*" in package.json: ${error.message}`, true);
        return false;
    }
}

function updatePackage(packageName, isDev = false) {
  log(`Updating package to latest: ${packageName}`);
  const saveFlag = isDev ? '--save-dev' : '--save';
  try {
    execSync(`npm install ${packageName}@latest ${saveFlag}`, { cwd: APPS_WEB_DIR, stdio: 'pipe' });
    logSuccess(`Successfully updated ${packageName} to the latest version from npm.`);
    
    return setPackageVersionToStar(packageName);
  } catch (error) {
    log(`Failed to update ${packageName}: ${error.message}`, true);
    log(`Stderr: ${error.stderr?.toString()}`, true);
    return false;
  }
}

function updateSpecificPackage(packageName) {
  logSection(`Updating Specific Package: ${packageName}`);
  
  if (!packageName || typeof packageName !== 'string' || !packageName.startsWith('@microfox/')) {
    log(`Invalid package name: "${packageName}". Must start with "@microfox/".`, true);
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(APPS_WEB_PACKAGE_JSON, 'utf8'));
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};

  let isDev = !!devDependencies[packageName];

  if (!dependencies[packageName] && !devDependencies[packageName]) {
    log(`Package "${packageName}" not found in dependencies.`, false, true);
    log(`Attempting to install it as a new package (as a regular dependency)...`, false, true);
    isDev = false;
  } else {
      log(`Package found in ${isDev ? 'devDependencies' : 'dependencies'}.`);
  }

  if (updatePackage(packageName, isDev)) {
    logSection(`✅ SUCCESS`);
    logSuccess(`Package ${packageName} updated successfully!`);
  } else {
    log(`Failed to update ${packageName}`, true);
    process.exit(1);
  }
}

function updateAllPackages() {
  logSection('Updating all @microfox/* packages with "*" version');
  
  const packageJson = JSON.parse(fs.readFileSync(APPS_WEB_PACKAGE_JSON, 'utf8'));
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  const allDependencies = { ...dependencies, ...devDependencies };

  const microfoxPackages = Object.entries(allDependencies)
    .filter(([name, version]) => name.startsWith('@microfox/') && version === '*')
    .map(([name]) => name);

  if (microfoxPackages.length === 0) {
    log('ℹ️  No @microfox/* packages with "*" version found to update.');
    return;
  }

  log(`Found ${microfoxPackages.length} packages to update:`);
  microfoxPackages.forEach(pkg => log(`  - ${pkg}`));

  let successCount = 0;
  let failureCount = 0;

  for (const packageName of microfoxPackages) {
    const isDev = !!devDependencies[packageName];
    if (updatePackage(packageName, isDev)) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  log(`\n📊 Update Summary:`);
  log(`  ✅ Successfully updated: ${successCount} packages`);
  if (failureCount > 0) {
    log(`  ❌ Failed to update: ${failureCount} packages`);
  }
  log('🎉 Microfox package update completed!');
}

function main() {
  try {
    logSection('Microfox Package Updater');
    log(`Started at: ${new Date().toLocaleString()}`);
    log(`Working directory: ${process.cwd()}`);

    if (!fs.existsSync(APPS_WEB_PACKAGE_JSON)) {
      log(`package.json not found at ${APPS_WEB_PACKAGE_JSON}`, true);
      log('Make sure you are running this command from the Foxhub root directory.', true);
      process.exit(1);
    }
    
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      log(`Updating ${args.length} specific package(s)...`);
      for (let i = 0; i < args.length; i++) {
        const packageName = args[i];
        log(`\n[${i + 1}/${args.length}] Processing: ${packageName}`);
        updateSpecificPackage(packageName);
      }
      logSection('🎉 All specified packages processed.');
    } else {
      updateAllPackages();
    }

  } catch (error) {
    log('', true);
    log(`An unexpected error occurred: ${error.message}`, true);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, true);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 