import fs from "fs";
import path from "path";

/**
 * This script checks for inconsistencies in environment variable keys across different .env files in the project root.
 * It identifies keys present in some .env files but missing in others and generates a report.
 * The report is printed to the console and saved to env-checker.log.
 * IMPORTANT: This script only checks for the presence of keys, not their values.
 */

async function checkEnvFiles() {
  try {
    const projectRoot = process.cwd();
    const filesInRoot = await fs.promises.readdir(projectRoot);

    const envFileNames = filesInRoot.filter((file) => file.startsWith(".env"));
    const envFiles = [];
    for (const fileName of envFileNames) {
      const stat = await fs.promises.stat(path.join(projectRoot, fileName));
      if (stat.isFile()) {
        envFiles.push(fileName);
      }
    }

    if (envFiles.length <= 1) {
      console.log(
        "Found one or zero .env files in the root directory. No comparison needed."
      );
      return;
    }

    console.log(
      `Checking for environment variable consistency across: ${envFiles.join(", ")}`
    );

    const fileKeys = new Map();
    const allKeys = new Set();

    for (const file of envFiles) {
      const filePath = path.join(projectRoot, file);
      const content = await fs.promises.readFile(filePath, "utf8");
      const keys = new Set(
        content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#"))
          .map((line) => line.split("=")[0].trim())
          .filter(Boolean)
      );
      fileKeys.set(file, keys);
      keys.forEach((key) => allKeys.add(key));
    }

    const inconsistencies = [];
    for (const key of allKeys) {
      const presentIn = [];
      const missingIn = [];
      for (const file of envFiles) {
        if (fileKeys.get(file)?.has(key)) {
          presentIn.push(file);
        } else {
          missingIn.push(file);
        }
      }

      if (missingIn.length > 0 && presentIn.length > 0) {
        inconsistencies.push({ key, presentIn, missingIn });
      }
    }

    let report = `Environment Variable Consistency Report\n`;
    report += `Generated at: ${new Date().toISOString()}\n`;
    report += `Checked files: ${envFiles.join(", ")}\n\n`;

    if (inconsistencies.length === 0) {
      report +=
        "✅ All environment variable keys are consistent across all checked files.\n";
    } else {
      report += `🚨 Found ${inconsistencies.length} inconsistencies:\n\n`;
      inconsistencies.forEach(({ key, presentIn, missingIn }) => {
        report += `Key: "${key}"\n`;
        report += `  - Present in: ${presentIn.join(", ")}\n`;
        report += `  - Missing in: ${missingIn.join(", ")}\n\n`;
      });
    }

    console.log(report);
    const logFilePath = path.join(projectRoot, "env-checker.log");
    await fs.promises.writeFile(logFilePath, report);
    console.log(`Report saved to ${logFilePath}`);
  } catch (error) {
    console.error("An error occurred while checking .env files:", error);
  }
}

checkEnvFiles();
