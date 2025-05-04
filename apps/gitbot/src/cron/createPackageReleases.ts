import { PackageFox } from "../lib/octokit.ts";
import { logger } from "../utils/logger.ts";
import cron from "node-cron";

async function createPackageReleases() {
  try {
    let repos: any[] = [];

    await PackageFox.eachRepository(async (repository) => {
      repos.push(repository);
      const { data: changesets } = await repository.octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: repository.repository.owner.login,
          repo: repository.repository.name,
          path: ".changesets",
          ref: "main",
        }
      );

      if (!Array.isArray(changesets)) return false;

      const hasChangesets = changesets.some(
        (file) =>
          file.type === "file" &&
          file.name.endsWith(".md") &&
          file.name !== "README.md"
      );

      if (hasChangesets) {
        // Create a temporary file to commit
        await repository.octokit.request(
          "PUT /repos/{owner}/{repo}/contents/{path}",
          {
            owner: repository.repository.owner.login,
            repo: repository.repository.name,
            path: ".changesets/trigger-release.md",
            message: "chore: trigger release",
            content: Buffer.from(new Date().toISOString()).toString("base64"),
            branch: "main",
          }
        );
      }
    });

    return repos;
  } catch (error) {
    logger.error("Error fetching installed repositories:", error);
    return [];
  }
}

// Schedule the cron job to run at midnight every day
export function schedulePackageReleases() {
  cron.schedule("0 0 * * *", async () => {
    await createPackageReleases();
  });

  logger.info("Scheduled package release check to run at midnight every day");
}
