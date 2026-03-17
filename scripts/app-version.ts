import { readFileSync } from "node:fs";
import { join } from "node:path";

const STABLE_APP_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const PRERELEASE_APP_VERSION_PATTERN = /^\d+\.\d+\.\d+-(alpha|beta)\.\d+$/;

export function readAppVersion(projectRoot = process.cwd()): string {
    const packageJsonPath = join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        version?: unknown;
    };

    return String(packageJson.version ?? "").trim();
}

export function isSupportedAppVersion(version: string): boolean {
    return STABLE_APP_VERSION_PATTERN.test(version) || PRERELEASE_APP_VERSION_PATTERN.test(version);
}

export function assertSupportedAppVersion(version: string, context: string): void {
    if (isSupportedAppVersion(version)) {
        return;
    }

    throw new Error(
        `[Version] Invalid package.json version "${version || "<empty>"}" for ${context}. ` +
        "Supported formats: x.y.z, x.y.z-alpha.N, x.y.z-beta.N.",
    );
}