import type { Configuration } from "electron-builder";
import { assertSupportedAppVersion, readAppVersion } from "./.husky/scripts/app-version";

const APP_VERSION = readAppVersion(__dirname);
const isReleaseBuild = process.env.ELECTRON_BUILDER_RELEASE_BUILD === "true";
const artifactCommit =
  process.env.ELECTRON_BUILDER_ARTIFACT_COMMIT?.trim().slice(0, 7) ||
  new Date().toISOString().slice(0, 10).replace(/-/g, "");

assertSupportedAppVersion(APP_VERSION, "electron-builder");

function isWindowsDomainEnvironment(): boolean {
  return (
    process.platform === "win32" &&
    Boolean(
      process.env.USERDNSDOMAIN ||
      (process.env.USERDOMAIN && process.env.USERDOMAIN !== process.env.COMPUTERNAME),
    )
  );
}

const isWindowsDomain = isWindowsDomainEnvironment();

if (isWindowsDomain) {
  console.warn(
    " ⚠️  Detected Windows domain environment. Code signing will be disabled to avoid potential issues with domain policies.",
  );
}



const config: Configuration = {
  appId: "com.beingknowing.quickticket2queue",
  productName: "Quick Ticket to Queue",
  artifactName: `Quick.Ticket2Queue-\${version}-\${arch}-\${os}${artifactCommit ? `-${artifactCommit}` : ""}.\${ext}`,
  asar: isReleaseBuild,
  generateUpdatesFilesForAllChannels: true,
  compression: "maximum",
  electronLanguages: ["en-US", "zh-CN"],
  directories: {
    output: "build",
  },
  npmRebuild: true,
  win: {
    target: isReleaseBuild ? ["nsis"] : ["dir"],
    executableName: "t2q",
    // artifactName: "quickticket2queue-${version}-${arch}.${ext}",
    signAndEditExecutable: !isWindowsDomain,
    icon: "assets/icons/icon-512.png",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
  },
  mac: {
    target: isReleaseBuild ? ["zip"] : ["dir"],
    icon: "assets/icons/icon-512.png",
    category: "public.app-category.productivity",
  },
  linux: {
    target: isReleaseBuild ? ["AppImage"] : ["dir"],
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
