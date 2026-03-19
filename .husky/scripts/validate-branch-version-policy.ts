import { execSync } from "node:child_process";
import {
    assertSupportedAppVersion,
    detectTargetReleaseChannel,
    getExpectedVersionHint,
    parsePrereleaseAppVersion,
    readAppVersion,
    STABLE_APP_VERSION_PATTERN,
} from "./app-version";

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
    const currentVersion = readAppVersion(projectRoot);

    if (!branchName || branchName === "HEAD") {
        console.error("[hook] branch policy check failed: detached HEAD is not supported for versioned commit/push flow.");
        process.exit(1);
    }

    const targetReleaseChannel = detectTargetReleaseChannel(branchName);
    if (!targetReleaseChannel) {
        console.error(
            `[hook] branch policy check failed: unsupported branch "${branchName}". ` +
            "Supported branches are main, develop, feature/*, and release/*.",
        );
        process.exit(1);
    }

    assertSupportedAppVersion(currentVersion, "branch-policy");

    if (targetReleaseChannel === "stable") {
        if (!STABLE_APP_VERSION_PATTERN.test(currentVersion)) {
            console.error(
                `[hook] branch policy check failed: branch ${branchName} requires ${getExpectedVersionHint(targetReleaseChannel)}, ` +
                `but package.json version is ${currentVersion}.`,
            );
            process.exit(1);
        }
    } else {
        const prereleaseVersion = parsePrereleaseAppVersion(currentVersion);
        if (!prereleaseVersion || prereleaseVersion.channel !== targetReleaseChannel) {
            console.error(
                `[hook] branch policy check failed: branch ${branchName} requires ${getExpectedVersionHint(targetReleaseChannel)}, ` +
                `but package.json version is ${currentVersion}.`,
            );
            process.exit(1);
        }
    }

    console.log(`[hook] branch policy check passed: ${branchName} -> ${currentVersion}`);
}

main();