import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { assertSupportedAppVersion, readAppVersion } from "./app-version";

const STABLE_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const ALPHA_PATTERN = /^(\d+)\.(\d+)\.(\d+)-alpha\.(\d+)$/;
const BETA_PATTERN = /^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/;

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

function toNextBetaFromStable(version: string): string {
    const nextStable = bumpStablePatch(version);
    return `${nextStable}-beta.1`;
}

function toStableFromPrerelease(version: string): string {
    const alphaMatch = ALPHA_PATTERN.exec(version);
    if (alphaMatch) {
        const major = Number(alphaMatch[1]);
        const minor = Number(alphaMatch[2]);
        const patch = Number(alphaMatch[3]);
        return `${major}.${minor}.${patch}`;
    }

    const betaMatch = BETA_PATTERN.exec(version);
    if (betaMatch) {
        const major = Number(betaMatch[1]);
        const minor = Number(betaMatch[2]);
        const patch = Number(betaMatch[3]);
        return `${major}.${minor}.${patch}`;
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
    const isMainBranch = branchName === "main";

    assertSupportedAppVersion(currentVersion, "git-hook");

    const isStable = STABLE_PATTERN.test(currentVersion);
    const isAlpha = ALPHA_PATTERN.test(currentVersion);
    const isBeta = BETA_PATTERN.test(currentVersion);

    let nextVersion = currentVersion;

    if (isMainBranch) {
        if (isStable) {
            nextVersion = currentVersion;
        } else if (isAlpha || isBeta) {
            nextVersion = toStableFromPrerelease(currentVersion);
        }
    } else {
        if (isStable) {
            nextVersion = toNextBetaFromStable(currentVersion);
        } else if (isAlpha || isBeta) {
            nextVersion = currentVersion;
        }
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
