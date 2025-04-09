"use server";

import {
    GITHUB_TOKEN,
    TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { TEMPLATE_REPO } from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";

export async function getTemplateVersion() {
    const octokit = new Octokit({
        auth: GITHUB_TOKEN,
    });

    const { data } = await octokit.rest.repos.getContent({
        owner: TEMPLATE_REPO_OWNER,
        repo: TEMPLATE_REPO,
        path: "package.json",
    });

    const content = Array.isArray(data)
        ? data.find(item => item.name === "package.json")?.content
        : (data as any).content;

    if (!content) {
        throw new Error("Content not found for package.json");
    }
    const templatePackageJson = JSON.parse(Buffer.from(content, "base64").toString("utf-8"));
    const version = templatePackageJson.version;

    return version;
}
