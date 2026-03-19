import { execSync } from "node:child_process";
import {
    type AppReleaseChannel,
    assertSupportedAppVersion,
    detectTargetReleaseChannel,
    getExpectedVersionHint,
    parsePrereleaseAppVersion,
    readAppVersion,
    STABLE_APP_VERSION_PATTERN,
} from "./app-version";

const SUPPORTED_BRANCH_HINT = "Supported branches are main, develop, feature/*, and release/*.";

function fail(message: string): never {
    console.error(`[hook] branch policy check failed: ${message}`);
    process.exit(1);
}

function isVersionAllowedForChannel(version: string, channel: AppReleaseChannel): boolean {
    if (channel === "stable") {
        return STABLE_APP_VERSION_PATTERN.test(version);
    }

    const prereleaseVersion = parsePrereleaseAppVersion(version);
    return Boolean(prereleaseVersion && prereleaseVersion.channel === channel);
}

function buildVersionMismatchMessage(branchName: string, currentVersion: string, channel: AppReleaseChannel): string {
    return (
        `branch ${branchName} requires ${getExpectedVersionHint(channel)}, ` +
        `but package.json version is ${currentVersion}.`
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

    const targetReleaseChannel = detectTargetReleaseChannel(branchName);
    if (!targetReleaseChannel) {
        fail(`unsupported branch "${branchName}". ${SUPPORTED_BRANCH_HINT}`);
    }

    let currentVersion = "";
    try {
        currentVersion = readAppVersion(projectRoot);
        assertSupportedAppVersion(currentVersion, "branch-policy");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(message);
    }

    if (!isVersionAllowedForChannel(currentVersion, targetReleaseChannel)) {
        fail(buildVersionMismatchMessage(branchName, currentVersion, targetReleaseChannel));
    }

    console.log(`[hook] branch policy check passed: ${branchName} -> ${currentVersion}`);
}

main();