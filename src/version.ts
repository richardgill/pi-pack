import { readFile } from "node:fs/promises";

// At build time, PI_PACK_VERSION is injected via `define` in vite.config.ts
// At runtime in dev, we read from package.json
// Falls back to "0.0.0" if neither is available

// Must use literal string for bundler's define replacement to work (not dynamic property access)
const INJECTED_VERSION = process.env["PI_PACK_VERSION"];

const getVersionFromPackageJson = async (): Promise<string> => {
  try {
    const pkg = JSON.parse(await readFile("./package.json", "utf8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
};

export const getVersion = async (): Promise<string> => {
  return INJECTED_VERSION ?? (await getVersionFromPackageJson());
};

// Synchronous version for CLI --version flag (injected at build time, falls back to 0.0.0 in dev)
export const VERSION = INJECTED_VERSION ?? "0.0.0";

export const getSchemaUrl = async () =>
  `https://unpkg.com/pi-pack@${await getVersion()}/schema.json`;
