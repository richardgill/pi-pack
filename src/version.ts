import { readFileSync } from "node:fs";

declare const __PI_PACK_VERSION__: string | undefined;

type PackageMetadata = {
  version?: string;
};

const FALLBACK_VERSION = "0.0.0";
const PACKAGE_JSON_URL = new URL("../package.json", import.meta.url);

const readVersion = (): string => readInjectedVersion() ?? readPackageVersion() ?? FALLBACK_VERSION;

const readInjectedVersion = (): string | undefined => {
  if (typeof __PI_PACK_VERSION__ !== "string") return undefined;
  if (__PI_PACK_VERSION__.length === 0) return undefined;
  return __PI_PACK_VERSION__;
};

const readPackageVersion = (): string | undefined => {
  const version = readPackageJson().version;
  if (typeof version === "string") return version;
  return undefined;
};

const readPackageJson = (): PackageMetadata => {
  try {
    return JSON.parse(readFileSync(PACKAGE_JSON_URL, "utf8")) as PackageMetadata;
  } catch {
    return {};
  }
};

export const VERSION = readVersion();
