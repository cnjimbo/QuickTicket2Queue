import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
    assertSupportedAppVersion,
    formatPrereleaseAppVersion,
    getBranchVersionPolicy,
    isVersionAllowedForPolicy,
    parsePrereleaseAppVersion,
    readAppVersion,
    STABLE_APP_VERSION_PATTERN,
} from "./app-version";

const STABLE_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

function getCurrentBranch(): string {
    try {
        const branch = execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] })
            .toString()
            .trim();
        return branch;
    } catch {
        return "";
    }
}

function bumpStablePatch(version: string): string {
    const match = STABLE_PATTERN.exec(version);
    if (!match) return version;

    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]);
    return `${major}.${minor}.${patch + 1}`;
}

function toTargetPrerelease(version: string, channel: "alpha" | "beta" | "rc"): string {
    const prereleaseVersion = parsePrereleaseAppVersion(version);
    if (prereleaseVersion) {
        if (prereleaseVersion.channel === channel) {
            return version;
        }

        return formatPrereleaseAppVersion(
            prereleaseVersion.major,
            prereleaseVersion.minor,
            prereleaseVersion.patch,
            channel,
        );
    }

    const nextStable = bumpStablePatch(version);
    const match = STABLE_PATTERN.exec(nextStable);
    if (!match) {
        return version;
    }

    return formatPrereleaseAppVersion(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        channel,
    );
}

function toStableFromPrerelease(version: string): string {
    const prereleaseVersion = parsePrereleaseAppVersion(version);
    if (prereleaseVersion) {
        return `${prereleaseVersion.major}.${prereleaseVersion.minor}.${prereleaseVersion.patch}`;
    }

    return version;
}

function readPackageJson(projectRoot: string): Record<string, unknown> {
    const packageJsonPath = join(projectRoot, "package.json");
    const packageJsonRaw = readFileSync(packageJsonPath, "utf8");
    return JSON.parse(packageJsonRaw) as Record<string, unknown>;
}

function writePackageJson(projectRoot: string, packageJson: Record<string, unknown>): void {
    const packageJsonPath = join(projectRoot, "package.json");
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function stagePackageJson(projectRoot: string): void {
    execSync("git add package.json", { cwd: projectRoot, stdio: ["ignore", "ignore", "pipe"] });
}

function main(): void {
    const projectRoot = process.cwd();
    const shouldStage = process.argv.includes("--stage");
    const checkOnly = process.argv.includes("--check-only");
    const failIfUpdated = process.argv.includes("--fail-if-updated");
    const currentVersion = readAppVersion(projectRoot);
    const branchName = getCurrentBranch();
    const policy = getBranchVersionPolicy(branchName);

    assertSupportedAppVersion(currentVersion, "git-hook");

    let nextVersion = currentVersion;

    if (!policy.enforce) {
        console.log(`[hook] version unchanged on branch ${branchName || "<unknown>"}: ${currentVersion}`);
        return;
    }

    if (policy.allowedChannels.includes("stable")) {
        nextVersion = STABLE_APP_VERSION_PATTERN.test(currentVersion)
            ? currentVersion
            : toStableFromPrerelease(currentVersion);
    } else if (!isVersionAllowedForPolicy(currentVersion, policy) && policy.preferredPrereleaseChannel) {
        nextVersion = toTargetPrerelease(currentVersion, policy.preferredPrereleaseChannel);
    }

    if (nextVersion === currentVersion) {
        console.log(`[hook] version unchanged on branch ${branchName || "<unknown>"}: ${currentVersion}`);
        return;
    }

    if (checkOnly) {
        console.error(
            `[hook] version check failed on branch ${branchName || "<unknown>"}: ` +
            `${currentVersion} should be ${nextVersion}. Run commit flow to auto-fix package.json version.`,
        );
        process.exit(1);
    }

    const packageJson = readPackageJson(projectRoot);
    packageJson.version = nextVersion;
    writePackageJson(projectRoot, packageJson);

    if (shouldStage) {
        stagePackageJson(projectRoot);
    }

    console.log(`[hook] version updated on branch ${branchName || "<unknown>"}: ${currentVersion} -> ${nextVersion}`);

    if (failIfUpdated) {
        console.error("[hook] push aborted: package.json version was auto-updated. Please commit the changes and push again.");
        process.exit(1);
    }
}

main();