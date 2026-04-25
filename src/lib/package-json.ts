export type PiPackPackageConfig = {
  managed?: boolean;
  "extensions-folder"?: string;
  "default-config"?: string;
  "requires-config-edit"?: boolean;
};

type PiPackageConfig = {
  extensions?: string[];
};

export type PackageJson = {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  exports?: Record<string, string>;
  keywords?: string[];
  dependencies?: Record<string, string>;
  pi?: PiPackageConfig;
  "pi-pack"?: PiPackPackageConfig;
};

export const INSTALLED_EXTENSION_CONFIG_FILE = "config.ts";

export const installedExtensionPackageJson = (): PackageJson => ({
  private: true,
  type: "module",
  pi: { extensions: [`./${INSTALLED_EXTENSION_CONFIG_FILE}`] },
  "pi-pack": { managed: true },
});
