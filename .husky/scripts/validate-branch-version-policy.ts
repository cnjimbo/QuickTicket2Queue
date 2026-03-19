import { execSync } from "node:child_process";
import {
    assertSupportedAppVersion,
    getBranchVersionPolicy,
    getExpectedVersionHintForPolicy,
    isVersionAllowedForPolicy,
    readAppVersion,
} from "./app-version";

const SUPPORTED_BRANCH_HINT = "Supported branches are main, develop/*, feature/*, and release/*.";
type ValidationStatus = "passed" | "skipped" | "failed";

function shouldEmitGithubOutput(): boolean {
    return (process.env.VALIDATION_OUTPUT_FORMAT ?? "").trim().toLowerCase() === "github";
}

function emitGithubOutput(values: Record<string, string>): void {
    for (const [key, value] of Object.entries(values)) {
        console.log(`${key}=${value}`);
    }
}

function emitValidationStatus(status: ValidationStatus, policyEnforced: boolean, prerelease: boolean, releaseType: string): void {
    if (!shouldEmitGithubOutput()) {
        return;
    }

    emitGithubOutput({
        validation_status: status,
        release_enabled: policyEnforced ? "true" : "false",
        prerelease: prerelease ? "true" : "false",
        release_type: releaseType,
    });
}

function fail(message: string): never {
    emitValidationStatus("failed", true, false, "none");
    console.error(`[hook] 校验失败：${message}`);
    process.exit(1);
}

function failWithContext(branchName: string, expectedHint: string, currentVersion: string, reason: string): never {
    fail(
        `${reason}; current_branch=${branchName}; expected=${expectedHint}; ` +
        `actual=${currentVersion}; supported=${SUPPORTED_BRANCH_HINT}`,
    );
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

function getBranchFromContext(): string {
    const branchOverride = (process.env.BRANCH_NAME_OVERRIDE ?? "").trim();
    if (branchOverride) {
        return branchOverride;
    }

    return getCurrentBranch();
}

function getVersionFromContext(projectRoot: string): string {
    const versionOverride = (process.env.APP_VERSION_OVERRIDE ?? "").trim();
    if (versionOverride) {
        return versionOverride;
    }

    return readAppVersion(projectRoot);
}

function main(): void {
    const projectRoot = process.cwd();
    const branchName = getBranchFromContext();

    if (!branchName || branchName === "HEAD") {
        fail(
            "detached HEAD is not supported for versioned commit/push flow; " +
            `current_branch=${branchName || "HEAD"}; expected=main|develop/*|feature/*|release/*; actual=<unknown>; supported=${SUPPORTED_BRANCH_HINT}`,
        );
    }

    const policy = getBranchVersionPolicy(branchName);

    let currentVersion = "";
    try {
        currentVersion = getVersionFromContext(projectRoot);
        assertSupportedAppVersion(currentVersion, "branch-policy");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failWithContext(branchName, "x.y.z | x.y.z-alpha.N | x.y.z-beta.N | x.y.z-rc.N", currentVersion || "<empty>", message);
    }

    if (!policy.enforce) {
        emitValidationStatus("skipped", false, false, "none");
        console.log(`[hook] branch policy check skipped: ${branchName} is unrestricted, version=${currentVersion}`);
        return;
    }

    if (!isVersionAllowedForPolicy(currentVersion, policy)) {
        failWithContext(
            branchName,
            getExpectedVersionHintForPolicy(policy),
            currentVersion,
            buildVersionMismatchMessage(branchName, currentVersion, getExpectedVersionHintForPolicy(policy)),
        );
    }

    const prerelease = !policy.allowedChannels.includes("stable");
    const releaseType = prerelease ? "prerelease" : "release";
    emitValidationStatus("passed", true, prerelease, releaseType);
    console.log(`校验通过，分支与版本匹配: branch=${branchName}, version=${currentVersion}`);
}

main();