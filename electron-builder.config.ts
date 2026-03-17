import type { Configuration } from "electron-builder";
import { assertSupportedAppVersion, readAppVersion } from "./scripts/app-version";

const DEFAULT_GITHUB_REPOSITORY = "cnjimbo/QuickTicket2Queue";
const APP_VERSION = readAppVersion(__dirname);
const IS_PRERELEASE_VERSION = /-/.test(APP_VERSION);
const OVERRIDE_RELEASE_TYPE = process.env.ELECTRON_BUILDER_RELEASE_TYPE;

assertSupportedAppVersion(APP_VERSION, "electron-builder");

function getReleaseType(): "release" | "prerelease" | "draft" {
  // In GitHub Actions matrix builds, always use draft so parallel OS jobs only
  // upload assets without racing to finalize the release. The finalize_release
  // job publishes the draft after all matrix jobs complete.
  if (process.env.GITHUB_ACTIONS === "true" && process.env.ELECTRON_BUILDER_PUBLISH === "always") {
    return "draft";
  }

  if (OVERRIDE_RELEASE_TYPE === "release" || OVERRIDE_RELEASE_TYPE === "prerelease") {
    return OVERRIDE_RELEASE_TYPE;
  }

  return IS_PRERELEASE_VERSION ? "prerelease" : "release";
}

function isWindowsDomainEnvironment(): boolean {
  return (
    process.platform === "win32" &&
    Boolean(
      process.env.USERDNSDOMAIN ||
      (process.env.USERDOMAIN && process.env.USERDOMAIN !== process.env.COMPUTERNAME),
    )
  );
}

function getGitHubRepository(): { owner: string; repo: string } {
  const rawRepository = process.env.GITHUB_REPOSITORY || DEFAULT_GITHUB_REPOSITORY;
  const [owner = "cnjimbo", repo = "QuickTicket2Queue"] = rawRepository.split("/");
  return { owner, repo };
}

function getPublishConfig(): Pick<Configuration, "publish"> | Record<string, never> {
  const wantsPublish = process.env.ELECTRON_BUILDER_PUBLISH === "always";
  if (!wantsPublish) {
    return {};
  }

  const { owner, repo } = getGitHubRepository();

  return {
    publish: [
      {
        provider: "github",
        owner,
        repo,
        releaseType: getReleaseType(),
      },
    ],
  };
}

const shouldDisableWindowsSigning = isWindowsDomainEnvironment();
const isPublishBuild = process.env.ELECTRON_BUILDER_PUBLISH === "always";
const isGitHubBuild = Boolean(process.env.GITHUB_ACTIONS);
const shouldSignAndEditExecutable =
  process.platform === "win32" &&
  !shouldDisableWindowsSigning &&
  process.env.ELECTRON_BUILDER_SIGN_AND_EDIT_EXECUTABLE === "true";

if (shouldDisableWindowsSigning) {
  console.warn(
    " ⚠️  Detected Windows domain environment. Code signing will be disabled to avoid potential issues with domain policies.",
  );
}

if (!shouldSignAndEditExecutable) {
  console.warn(
    " ⚠️  Windows executable resource editing is disabled. Set ELECTRON_BUILDER_SIGN_AND_EDIT_EXECUTABLE=true to enable rcedit metadata updates.",
  );
}

const config: Configuration = {
  appId: "com.beingknowing.quickticket2queue",
  productName: "quickticket2queue",
  asar: isGitHubBuild,
  generateUpdatesFilesForAllChannels: true,
  compression: "maximum",
  electronLanguages: ["en-US", "zh-CN"],
  directories: {
    output: "build",
  },
  ...getPublishConfig(),
  npmRebuild: true,
  win: {
    target: isPublishBuild ? ["nsis"] : ["dir"],
    executableName: "quickticket2queue",
    // artifactName: "quickticket2queue-${version}-${arch}.${ext}",
    signAndEditExecutable: shouldSignAndEditExecutable,
    icon: "assets/icons/icon-512.png",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
  },
  mac: {
    target: ["zip"],
    icon: "assets/icons/icon-512.png",
    category: "public.app-category.productivity",
  },
  linux: {
    target: ["AppImage"],
    icon: "assets/icons/icon-256.png",
    category: "Utility",
    maintainer: "cnjimbo",
  },
  files: [
    "dist/main/**/*",
    "dist/preload/**/*",
    "dist/render/**/*",
    // "node_modules",
    // "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme,LICENSE,LICENSE.txt,license.txt,History.md,history.md,Makefile,makefile}",
    // "!**/node_modules/*/*.{a,gyp,gypi,md,txt}",
    // "!**/node_modules/*/{test,tests,spec,specs,example,examples,doc,docs,website,www,benchmark,benchmarks,example.js,gulpfile.js}",
  ],
};

export default config;
