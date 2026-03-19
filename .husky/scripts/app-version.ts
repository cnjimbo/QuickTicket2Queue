import { readFileSync } from "node:fs";
import { join } from "node:path";

export const STABLE_APP_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
export const PRERELEASE_APP_VERSION_PATTERN =
    /^(\d+)\.(\d+)\.(\d+)-(alpha|beta|rc)\.(\d+)$/;

export type AppPrereleaseChannel = "alpha" | "beta" | "rc";
export type AppReleaseChannel = AppPrereleaseChannel | "stable";
export type BranchVersionPolicy = {
    branchType: "main" | "develop" | "feature" | "release" | "other";
    enforce: boolean;
    releaseEnabled: boolean;
    allowedChannels: AppReleaseChannel[];
    preferredPrereleaseChannel?: AppPrereleaseChannel;
};

export function parsePrereleaseAppVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
    channel: AppPrereleaseChannel;
    sequence: number;
} | null {
    const match = PRERELEASE_APP_VERSION_PATTERN.exec(version);
    if (!match) {
        return null;
    }

    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        channel: match[4] as AppPrereleaseChannel,
        sequence: Number(match[5]),
    };
}

export function formatPrereleaseAppVersion(
    major: number,
    minor: number,
    patch: number,
    channel: AppPrereleaseChannel,
    sequence = 1,
): string {
    return `${major}.${minor}.${patch}-${channel}.${sequence}`;
}

export function getBranchVersionPolicy(branchName: string): BranchVersionPolicy {
    if (branchName === "main") {
        return {
            branchType: "main",
            enforce: true,
            releaseEnabled: true,
            allowedChannels: ["stable"],
        };
    }

    if (branchName === "develop") {
        return {
            branchType: "develop",
            enforce: true,
            releaseEnabled: true,
            allowedChannels: ["alpha", "beta"],
            preferredPrereleaseChannel: "beta",
        };
    }

    if (branchName.startsWith("release/")) {
        return {
            branchType: "release",
            enforce: true,
            releaseEnabled: true,
            allowedChannels: ["rc"],
            preferredPrereleaseChannel: "rc",
        };
    }

    if (branchName.startsWith("feature/")) {
        return {
            branchType: "feature",
            enforce: true,
            releaseEnabled: true,
            allowedChannels: ["alpha", "beta"],
            preferredPrereleaseChannel: "alpha",
        };
    }

    return {
        branchType: "other",
        enforce: false,
        releaseEnabled: false,
        allowedChannels: ["stable", "alpha", "beta", "rc"],
    };
}

export function detectTargetReleaseChannel(branchName: string): AppReleaseChannel | null {
    const policy = getBranchVersionPolicy(branchName);
    if (!policy.enforce) {
        return null;
    }

    return policy.allowedChannels[0] ?? null;
}

export function getExpectedVersionHint(channel: AppReleaseChannel): string {
    switch (channel) {
        case "stable":
            return "x.y.z";
        case "alpha":
            return "x.y.z-alpha.N";
        case "beta":
            return "x.y.z-beta.N";
        case "rc":
            return "x.y.z-rc.N";
    }
}

export function getExpectedVersionHintForPolicy(policy: BranchVersionPolicy): string {
    if (!policy.enforce) {
        return "x.y.z | x.y.z-alpha.N | x.y.z-beta.N | x.y.z-rc.N";
    }

    return policy.allowedChannels
        .map((channel) => getExpectedVersionHint(channel))
        .join(" or ");
}

export function isVersionAllowedForPolicy(version: string, policy: BranchVersionPolicy): boolean {
    if (policy.allowedChannels.includes("stable") && STABLE_APP_VERSION_PATTERN.test(version)) {
        return true;
    }

    const prereleaseVersion = parsePrereleaseAppVersion(version);
    if (!prereleaseVersion) {
        return false;
    }

    return policy.allowedChannels.includes(prereleaseVersion.channel);
}

export function readAppVersion(projectRoot = process.cwd()): string {
    const packageJsonPath = join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        version?: unknown;
    };

    return String(packageJson.version ?? "").trim();
}

export function isSupportedAppVersion(version: string): boolean {
    return STABLE_APP_VERSION_PATTERN.test(version) || Boolean(parsePrereleaseAppVersion(version));
}

export function assertSupportedAppVersion(version: string, context: string): void {
    if (isSupportedAppVersion(version)) {
        return;
    }

    throw new Error(
        `[Version] Invalid package.json version "${version || "<empty>"}" for ${context}. ` +
        "Supported formats: x.y.z, x.y.z-alpha.N, x.y.z-beta.N, x.y.z-rc.N.",
    );
}