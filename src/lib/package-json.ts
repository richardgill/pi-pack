// Ref: https://github.com/sindresorhus/type-fest/blob/main/source/package-json.d.ts
type PackageJsonDependency = Partial<Record<string, string>>;

type PackageJsonExportConditions = {
  [condition: string]: PackageJsonExports;
};

type PackageJsonExports =
  | null
  | string
  | Array<string | PackageJsonExportConditions>
  | PackageJsonExportConditions;

export type PackageJson = {
  name?: string;
  version?: string;
  private?: boolean;
  type?: "module" | "commonjs";
  exports?: PackageJsonExports;
  keywords?: string[];
  dependencies?: PackageJsonDependency;
  bin?: string | Partial<Record<string, string>>;
};

export type PiPackPackageConfig = {
  managed?: boolean;
  "extensions-folder"?: string;
  "default-config"?: string;
  "requires-config-edit"?: boolean;
};

type PiPackageConfig = {
  extensions?: string[];
};

export type PiPackPackageJson = PackageJson & {
  pi?: PiPackageConfig;
  "pi-pack"?: PiPackPackageConfig;
};

export const INSTALLED_EXTENSION_CONFIG_FILE = "config.ts";

export const INSTALLED_EXTENSION_PACKAGE_JSON: PiPackPackageJson = {
  private: true,
  type: "module",
  pi: { extensions: [`./${INSTALLED_EXTENSION_CONFIG_FILE}`] },
  "pi-pack": { managed: true },
};
