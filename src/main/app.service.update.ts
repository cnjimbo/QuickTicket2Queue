import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";
import { app, BrowserWindow } from "electron";
import Store from "electron-store";
import { autoUpdater, type UpdateInfo } from "electron-updater";

const DEFAULT_GITHUB_REPOSITORY = "cnjimbo/QuickTicket2Queue";
const ENABLE_DEV_UPDATER = process.env.ELECTRON_ENABLE_DEV_UPDATER === "true";
const APP_UPDATE_DOWNLOAD_PROGRESS_CHANNEL = "app-update-download-progress";

type UpdatePreferences = {
    includeBeta: boolean;
    allowDowngrade: boolean;
    allowAllVersions: boolean;
};

type ManualUpdateResult = {
    status: "disabled" | "up-to-date" | "update-available" | "downloaded" | "portable" | "error";
    version?: string;
    releaseUrl?: string;
    message?: string;
    preferences?: UpdatePreferences;
};

type DownloadProgressPayload = {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
};

type AppPrereleaseChannel = "alpha" | "beta" | "rc";
type ParsedAppVersion = {
    major: number;
    minor: number;
    patch: number;
    channel?: AppPrereleaseChannel;
    sequence?: number;
};

const APP_PRERELEASE_VERSION_PATTERN = /^v?\d+\.\d+\.\d+-(alpha|beta|rc)(?:\.\d+)?$/;
const APP_STABLE_VERSION_PATTERN = /^v?\d+\.\d+\.\d+$/;
const APP_STABLE_VERSION_CAPTURE_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const APP_PRERELEASE_VERSION_CAPTURE_PATTERN = /^(\d+)\.(\d+)\.(\d+)-(alpha|beta|rc)(?:\.(\d+))?$/;
const APP_PRERELEASE_CHANNEL_WEIGHT: Record<AppPrereleaseChannel, number> = {
    alpha: 0,
    beta: 1,
    rc: 2,
};

@Injectable()
export class AppServiceUpdate {
    private initialized = false;
    private availableUpdateInfo: UpdateInfo | null = null;
    private downloadedUpdateInfo: UpdateInfo | null = null;
    private readonly updatePreferencesStore = new Store<UpdatePreferences>({
        name: "update-preferences",
        defaults: {
            includeBeta: false,
            allowDowngrade: true,
            allowAllVersions: false,
        },
    });

    private broadcastAppUpdateDownloadProgress(progress: DownloadProgressPayload): void {
        for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send(APP_UPDATE_DOWNLOAD_PROGRESS_CHANNEL, progress);
        }
    }

    private isPortableWindowsBuild(): boolean {
        return process.platform === "win32" && Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
    }

    private getUpdatePreferencesValue(): UpdatePreferences {
        return {
            includeBeta: this.updatePreferencesStore.get("includeBeta", false),
            allowDowngrade: this.updatePreferencesStore.get("allowDowngrade", true),
            allowAllVersions: this.updatePreferencesStore.get("allowAllVersions", false),
        };
    }

    private normalizeAppVersion(version: string): string {
        return version.trim().replace(/^v/i, "");
    }

    private resolveUpdaterChannel(preferences: UpdatePreferences): "latest" | AppPrereleaseChannel {
        if (preferences.allowAllVersions) {
            // alpha channel can consume prerelease feeds most aggressively.
            return "alpha";
        }

        if (!preferences.includeBeta) {
            return "latest";
        }

        return "rc";
    }

    private isAllowedUpdateVersion(version: string, preferences: UpdatePreferences): boolean {
        const normalizedVersion = this.normalizeAppVersion(version);

        if (APP_STABLE_VERSION_PATTERN.test(normalizedVersion)) {
            return true;
        }

        const prereleaseChannel = APP_PRERELEASE_VERSION_PATTERN.exec(normalizedVersion)?.[1] as AppPrereleaseChannel | undefined;
        if (!prereleaseChannel) {
            return false;
        }

        if (preferences.allowAllVersions) {
            return prereleaseChannel === "alpha" || prereleaseChannel === "beta" || prereleaseChannel === "rc";
        }

        if (!preferences.includeBeta) {
            return false;
        }

        return prereleaseChannel === "rc";
    }

    private parseAppVersion(version: string): ParsedAppVersion | null {
        const normalizedVersion = this.normalizeAppVersion(version);
        const stableMatch = APP_STABLE_VERSION_CAPTURE_PATTERN.exec(normalizedVersion);
        if (stableMatch) {
            return {
                major: Number(stableMatch[1]),
                minor: Number(stableMatch[2]),
                patch: Number(stableMatch[3]),
            };
        }

        const prereleaseMatch = APP_PRERELEASE_VERSION_CAPTURE_PATTERN.exec(normalizedVersion);
        if (!prereleaseMatch) {
            return null;
        }

        return {
            major: Number(prereleaseMatch[1]),
            minor: Number(prereleaseMatch[2]),
            patch: Number(prereleaseMatch[3]),
            channel: prereleaseMatch[4] as AppPrereleaseChannel,
            sequence: Number(prereleaseMatch[5] ?? 0),
        };
    }

    private compareAppVersion(candidateVersion: string, currentVersion: string): number {
        const candidate = this.parseAppVersion(candidateVersion);
        const current = this.parseAppVersion(currentVersion);
        if (!candidate || !current) {
            return 0;
        }

        if (candidate.major !== current.major) {
            return candidate.major - current.major;
        }

        if (candidate.minor !== current.minor) {
            return candidate.minor - current.minor;
        }

        if (candidate.patch !== current.patch) {
            return candidate.patch - current.patch;
        }

        const candidateStable = !candidate.channel;
        const currentStable = !current.channel;

        if (candidateStable && currentStable) {
            return 0;
        }

        if (candidateStable) {
            return 1;
        }

        if (currentStable) {
            return -1;
        }

        const channelDelta = APP_PRERELEASE_CHANNEL_WEIGHT[candidate.channel!] - APP_PRERELEASE_CHANNEL_WEIGHT[current.channel!];
        if (channelDelta !== 0) {
            return channelDelta;
        }

        return (candidate.sequence ?? 0) - (current.sequence ?? 0);
    }

    private applyUpdatePreferences(preferences = this.getUpdatePreferencesValue()): UpdatePreferences {
        autoUpdater.allowPrerelease = preferences.includeBeta || preferences.allowAllVersions;
        autoUpdater.allowDowngrade = preferences.allowDowngrade || preferences.allowAllVersions;
        autoUpdater.channel = this.resolveUpdaterChannel(preferences);
        return preferences;
    }

    private updateReleaseStateForPreferenceChange(): void {
        this.availableUpdateInfo = null;
        this.downloadedUpdateInfo = null;
    }

    private getGitHubReleasesUrl(includeBeta = this.getUpdatePreferencesValue().includeBeta): string {
        const repository = process.env.GITHUB_REPOSITORY || DEFAULT_GITHUB_REPOSITORY;
        return includeBeta
            ? `https://github.com/${repository}/releases`
            : `https://github.com/${repository}/releases/latest`;
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error && error.message) {
            return error.message;
        }

        return String(error);
    }

    private initializeAutoUpdater(): void {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        if (!app.isPackaged && ENABLE_DEV_UPDATER) {
            const devUpdateConfigPath = join(process.cwd(), "dev-app-update.yml");
            if (!existsSync(devUpdateConfigPath)) {
                console.warn(
                    `[Update] Dev updater config not found: ${devUpdateConfigPath}. `
                    + "Create dev-app-update.yml in project root to enable update debugging.",
                );
            } else {
                autoUpdater.updateConfigPath = devUpdateConfigPath;
                autoUpdater.forceDevUpdateConfig = true;
                console.log(
                    `[Update] Dev updater mode enabled (ELECTRON_ENABLE_DEV_UPDATER=true), config=${devUpdateConfigPath}`,
                );
            }
        }

        this.applyUpdatePreferences();
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;

        autoUpdater.on("error", (error) => {
            console.error("Auto update error:", error);
        });

        autoUpdater.on("update-available", (info) => {
            this.availableUpdateInfo = info;
            this.downloadedUpdateInfo = null;
            console.log("Update available:", info.version);
        });

        autoUpdater.on("update-not-available", () => {
            this.availableUpdateInfo = null;
            this.downloadedUpdateInfo = null;
            console.log("No updates available");
        });

        autoUpdater.on("update-downloaded", (info) => {
            this.downloadedUpdateInfo = info;
            this.availableUpdateInfo = info;
            this.broadcastAppUpdateDownloadProgress({
                percent: 100,
                transferred: 0,
                total: 0,
                bytesPerSecond: 0,
            });
            console.log("Update downloaded:", info.version);
        });

        autoUpdater.on("download-progress", (progress) => {
            this.broadcastAppUpdateDownloadProgress({
                percent: Number.isFinite(progress.percent) ? progress.percent : 0,
                transferred: progress.transferred,
                total: progress.total,
                bytesPerSecond: progress.bytesPerSecond,
            });
        });
    }

    private getCurrentAppVersion(): string {
        if (app.isPackaged) {
            return app.getVersion();
        }

        try {
            const packageJsonPath = join(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version?: unknown };
            if (typeof packageJson.version === "string" && packageJson.version.trim()) {
                return packageJson.version.trim();
            }
        } catch (error) {
            console.warn("[Version] Failed to read package.json version in dev mode:", error);
        }

        return app.getVersion();
    }

    public async checkForAppUpdates(): Promise<ManualUpdateResult> {
        this.initializeAutoUpdater();

        const preferences = this.applyUpdatePreferences();

        if (!app.isPackaged && !ENABLE_DEV_UPDATER) {
            return {
                status: "disabled",
                message: "自动更新仅在打包环境或开发调试开关启用时可用。",
                releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                preferences,
            };
        }

        try {
            const result = await autoUpdater.checkForUpdates();
            const updateInfo = result?.updateInfo ?? this.availableUpdateInfo;
            const currentVersion = this.getCurrentAppVersion();
            const versionDelta = updateInfo
                ? this.compareAppVersion(updateInfo.version, currentVersion)
                : 0;

            if (
                !updateInfo
                || versionDelta === 0
                || (versionDelta < 0 && !preferences.allowDowngrade)
            ) {
                this.availableUpdateInfo = null;
                this.downloadedUpdateInfo = null;
                return {
                    status: "up-to-date",
                    version: currentVersion,
                    releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                    message:
                        versionDelta < 0 && !preferences.allowDowngrade
                            ? `检测到可回退版本 ${updateInfo?.version}，但当前未启用向下更新。`
                            : undefined,
                    preferences,
                };
            }

            if (!this.isAllowedUpdateVersion(updateInfo.version, preferences)) {
                this.availableUpdateInfo = null;
                this.downloadedUpdateInfo = null;
                return {
                    status: "up-to-date",
                    version: currentVersion,
                    releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                    message: `检测到不受支持的更新版本 ${updateInfo.version}，已忽略。`,
                    preferences,
                };
            }

            this.availableUpdateInfo = updateInfo;

            if (this.isPortableWindowsBuild()) {
                return {
                    status: "portable",
                    version: updateInfo.version,
                    releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                    preferences,
                };
            }

            if (this.downloadedUpdateInfo?.version === updateInfo.version) {
                return {
                    status: "downloaded",
                    version: updateInfo.version,
                    releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                    preferences,
                };
            }

            return {
                status: "update-available",
                version: updateInfo.version,
                releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                preferences,
            };
        } catch (error) {
            const message = this.getErrorMessage(error);
            console.error("Failed to check for updates:", error);
            return {
                status: "error",
                message,
                releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                preferences,
            };
        }
    }

    public async downloadAppUpdate(): Promise<ManualUpdateResult> {
        this.initializeAutoUpdater();

        const preferences = this.applyUpdatePreferences();

        if (this.isPortableWindowsBuild()) {
            return {
                status: "portable",
                version: this.availableUpdateInfo?.version,
                releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                preferences,
            };
        }

        try {
            if (!this.availableUpdateInfo) {
                const checkResult = await this.checkForAppUpdates();
                if (checkResult.status !== "update-available" && checkResult.status !== "downloaded") {
                    return checkResult;
                }
            }

            if (!this.availableUpdateInfo) {
                return {
                    status: "up-to-date",
                    version: app.getVersion(),
                    releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                    preferences,
                };
            }

            this.broadcastAppUpdateDownloadProgress({
                percent: 0,
                transferred: 0,
                total: 0,
                bytesPerSecond: 0,
            });

            await autoUpdater.downloadUpdate();
            this.downloadedUpdateInfo = this.availableUpdateInfo;

            return {
                status: "downloaded",
                version: this.downloadedUpdateInfo.version,
                releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                preferences,
            };
        } catch (error) {
            const message = this.getErrorMessage(error);
            console.error("Failed to download update:", error);
            return {
                status: "error",
                message,
                version: this.availableUpdateInfo?.version,
                releaseUrl: this.getGitHubReleasesUrl(preferences.includeBeta),
                preferences,
            };
        }
    }

    public async installDownloadedAppUpdate(): Promise<boolean> {
        this.initializeAutoUpdater();

        if (!this.downloadedUpdateInfo || this.isPortableWindowsBuild()) {
            return false;
        }

        setImmediate(() => {
            autoUpdater.quitAndInstall();
        });

        return true;
    }

    public async getAppVersion(): Promise<string> {
        return this.getCurrentAppVersion();
    }

    public async getUpdatePreferences(): Promise<UpdatePreferences> {
        this.initializeAutoUpdater();
        return this.getUpdatePreferencesValue();
    }

    public async setUpdatePreferences(partialPreferences: Partial<UpdatePreferences> | undefined): Promise<UpdatePreferences> {
        this.initializeAutoUpdater();

        const currentPreferences = this.getUpdatePreferencesValue();

        const nextPreferences: UpdatePreferences = {
            includeBeta: partialPreferences?.includeBeta ?? currentPreferences.includeBeta,
            allowDowngrade: partialPreferences?.allowDowngrade ?? currentPreferences.allowDowngrade,
            allowAllVersions: partialPreferences?.allowAllVersions ?? currentPreferences.allowAllVersions,
        };

        this.updatePreferencesStore.set(nextPreferences);
        this.applyUpdatePreferences(nextPreferences);
        this.updateReleaseStateForPreferenceChange();
        return nextPreferences;
    }
}