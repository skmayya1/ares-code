export const BRAND_ASSET_PATHS = {
  developmentIconComposerProject: "assets/ares/app-icon.icon",
  developmentIosIconPng: "assets/ares/icon-1024.png",
  developmentUniversalIconPng: "assets/ares/icon-1024.png",

  productionIconComposerProject: "assets/ares/app-icon.icon",
  productionIosIconPng: "assets/ares/icon-1024.png",
  productionMacIconPng: "assets/ares/icon-1024.png",
  productionLinuxIconPng: "assets/ares/icon-1024.png",
  productionWindowsIconIco: "assets/ares/icon.ico",
  productionWebFaviconIco: "assets/ares/icon.ico",
  productionWebFavicon16Png: "assets/ares/favicon-16x16.png",
  productionWebFavicon32Png: "assets/ares/favicon-32x32.png",
  productionWebAppleTouchIconPng: "assets/ares/apple-touch-icon.png",

  nightlyIconComposerProject: "assets/ares/app-icon.icon",
  nightlyIosIconPng: "assets/ares/icon-1024.png",
  nightlyMacIconPng: "assets/ares/icon-1024.png",
  nightlyLinuxIconPng: "assets/ares/icon-1024.png",
  nightlyWindowsIconIco: "assets/ares/icon.ico",
  nightlyWebFaviconIco: "assets/ares/icon.ico",
  nightlyWebFavicon16Png: "assets/ares/favicon-16x16.png",
  nightlyWebFavicon32Png: "assets/ares/favicon-32x32.png",
  nightlyWebAppleTouchIconPng: "assets/ares/apple-touch-icon.png",

  developmentDesktopIconPng: "assets/ares/icon-1024.png",
  developmentWindowsIconIco: "assets/ares/icon.ico",
  developmentWebFaviconIco: "assets/ares/icon.ico",
  developmentWebFavicon16Png: "assets/ares/favicon-16x16.png",
  developmentWebFavicon32Png: "assets/ares/favicon-32x32.png",
  developmentWebAppleTouchIconPng: "assets/ares/apple-touch-icon.png",
} as const;

export type WebAssetBrand = "development" | "nightly" | "production";

export const WEB_ASSET_CHANNELS = ["latest", "nightly"] as const;

export type WebAssetChannel = (typeof WEB_ASSET_CHANNELS)[number];

export function resolveWebAssetBrandForChannel(channel: WebAssetChannel): WebAssetBrand {
  return channel === "nightly" ? "nightly" : "production";
}

export interface IconOverride {
  readonly sourceRelativePath: string;
  readonly targetRelativePath: string;
}

const WEB_ICON_TARGET_FILENAMES = {
  faviconIco: "favicon.ico",
  favicon16Png: "favicon-16x16.png",
  favicon32Png: "favicon-32x32.png",
  appleTouchIconPng: "apple-touch-icon.png",
} as const;

const WEB_ICON_SOURCE_PATHS_BY_BRAND = {
  development: {
    faviconIco: BRAND_ASSET_PATHS.developmentWebFaviconIco,
    favicon16Png: BRAND_ASSET_PATHS.developmentWebFavicon16Png,
    favicon32Png: BRAND_ASSET_PATHS.developmentWebFavicon32Png,
    appleTouchIconPng: BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng,
  },
  nightly: {
    faviconIco: BRAND_ASSET_PATHS.nightlyWebFaviconIco,
    favicon16Png: BRAND_ASSET_PATHS.nightlyWebFavicon16Png,
    favicon32Png: BRAND_ASSET_PATHS.nightlyWebFavicon32Png,
    appleTouchIconPng: BRAND_ASSET_PATHS.nightlyWebAppleTouchIconPng,
  },
  production: {
    faviconIco: BRAND_ASSET_PATHS.productionWebFaviconIco,
    favicon16Png: BRAND_ASSET_PATHS.productionWebFavicon16Png,
    favicon32Png: BRAND_ASSET_PATHS.productionWebFavicon32Png,
    appleTouchIconPng: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
  },
} as const satisfies Record<WebAssetBrand, Record<keyof typeof WEB_ICON_TARGET_FILENAMES, string>>;

export function resolveWebIconOverrides(
  brand: WebAssetBrand,
  targetDirectory: string,
): ReadonlyArray<IconOverride> {
  const sourcePaths = WEB_ICON_SOURCE_PATHS_BY_BRAND[brand];
  return [
    {
      sourceRelativePath: sourcePaths.faviconIco,
      targetRelativePath: `${targetDirectory}/${WEB_ICON_TARGET_FILENAMES.faviconIco}`,
    },
    {
      sourceRelativePath: sourcePaths.favicon16Png,
      targetRelativePath: `${targetDirectory}/${WEB_ICON_TARGET_FILENAMES.favicon16Png}`,
    },
    {
      sourceRelativePath: sourcePaths.favicon32Png,
      targetRelativePath: `${targetDirectory}/${WEB_ICON_TARGET_FILENAMES.favicon32Png}`,
    },
    {
      sourceRelativePath: sourcePaths.appleTouchIconPng,
      targetRelativePath: `${targetDirectory}/${WEB_ICON_TARGET_FILENAMES.appleTouchIconPng}`,
    },
  ];
}

export const DEVELOPMENT_ICON_OVERRIDES = resolveWebIconOverrides("development", "dist/client");

export const DEVELOPMENT_PUBLIC_ICON_OVERRIDES = resolveWebIconOverrides(
  "development",
  "apps/web/public",
);
