import { execSync } from "node:child_process";
import {
    assertSupportedAppVersion,
    getBranchVersionPolicy,
    getExpectedVersionHintForPolicy,
    isVersionAllowedForPolicy,
    readAppVersion,
} from "./app-version";

const SUPPORTED_BRANCH_HINT = "Supported branches are main, develop, feature/*, and release/*.";

function fail(message: string): never {
    console.error(`[hook] branch policy check failed: ${message}`);
    process.exit(1);
}

function buildVersionMismatchMessage(branchName: string, currentVersion: string, expectedHint: string): string {
    return (
        `branch ${branchName} requires ${expectedHint}, ` +
        `but package.json version is ${currentVersion}. ${SUPPORTED_BRANCH_HINT}`
    );
}

function getCurrentBranch(): string {
    try {
        return execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] })
            .toString()
            .trim();
    } catch {
        return "";
    }
}

function main(): void {
    const projectRoot = process.cwd();
    const branchName = getCurrentBranch();

    if (!branchName || branchName === "HEAD") {
        fail("detached HEAD is not supported for versioned commit/push flow.");
    }

    const policy = getBranchVersionPolicy(branchName);

    let currentVersion = "";
    try {
        currentVersion = readAppVersion(projectRoot);
        assertSupportedAppVersion(currentVersion, "branch-policy");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(message);
    }

    if (!policy.enforce) {
        console.log(`[hook] branch policy check skipped: ${branchName} is unrestricted, version=${currentVersion}`);
        return;
    }

    if (!isVersionAllowedForPolicy(currentVersion, policy)) {
        fail(buildVersionMismatchMessage(branchName, currentVersion, getExpectedVersionHintForPolicy(policy)));
    }

    console.log(`[hook] branch policy check passed: ${branchName} -> ${currentVersion}`);
}

main();