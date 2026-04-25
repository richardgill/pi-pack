import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "~/lib/json";
import type { PackageJson } from "~/lib/package-json";
import { assertSafePathSegment, assertSafeRelativePath } from "~/lib/path";
import { assertSafeExtensionName } from "~/lib/pi";
import {
  extensionPackageJson,
  indexDotTs,
  rootPackageJson,
  defaultConfigSource,
  monorepoExtensionReadme,
  monorepoReadme,
  standaloneExtensionReadme,
  tsconfig,
} from "./templates";

export type MonoCreateSelection = {
  type: "mono";
  cwd: string;
  repoName: string;
  extensionsFolder: string;
  firstExtensionName?: string;
};

type ExtensionReadmeContext =
  | { type: "standalone" }
  | { type: "monorepo"; repoName: string; repoRoot: string };

export type ExtensionCreateSelection = {
  type: "extension";
  extensionName: string;
  extensionRoot: string;
  readmeContext: ExtensionReadmeContext;
};

export const createMono = (params: MonoCreateSelection): void => {
  assertSafePathSegment(params.repoName, "Repo name");
  assertSafeRelativePath(params.extensionsFolder, "Extensions folder");

  const root = path.join(params.cwd, params.repoName);
  assertCanWrite(root);
  mkdirSync(path.join(root, params.extensionsFolder), { recursive: true });
  writeJson(
    path.join(root, "package.json"),
    rootPackageJson(params.repoName, params.extensionsFolder),
  );
  writeFileSync(
    path.join(root, "README.md"),
    monorepoReadme(params.repoName, params.extensionsFolder, params.firstExtensionName),
    "utf8",
  );
};

export const createExtension = (params: ExtensionCreateSelection): void => {
  assertSafeExtensionName(params.extensionName);

  assertCanWrite(params.extensionRoot);
  writeExtensionFiles(params.extensionRoot, params.extensionName, params.readmeContext);
};

export const readConfiguredExtensionsFolder = (cwd: string): string | undefined => {
  const extensionsFolder = readPackage(path.join(cwd, "package.json"))["pi-pack"]?.[
    "extensions-folder"
  ];
  if (extensionsFolder === undefined) return undefined;
  assertSafeRelativePath(extensionsFolder, "pi-pack.extensions-folder");
  return extensionsFolder;
};

export const readConfiguredRepoName = (cwd: string): string =>
  readPackage(path.join(cwd, "package.json")).name ?? path.basename(cwd);

const writeExtensionFiles = (
  extensionRoot: string,
  name: string,
  readmeContext: ExtensionReadmeContext,
): void => {
  const srcFolder = path.join(extensionRoot, "src");
  mkdirSync(srcFolder, { recursive: true });
  writeJson(path.join(extensionRoot, "package.json"), extensionPackageJson(name));
  writeFileSync(
    path.join(extensionRoot, "README.md"),
    extensionReadme(name, extensionRoot, readmeContext),
    "utf8",
  );
  writeFileSync(path.join(extensionRoot, "tsconfig.json"), tsconfig(), "utf8");
  writeFileSync(path.join(srcFolder, "extension.ts"), indexDotTs(name), "utf8");
  writeFileSync(
    path.join(extensionRoot, "src", "default-config.ts"),
    defaultConfigSource(name),
    "utf8",
  );
};

const extensionReadme = (
  name: string,
  extensionRoot: string,
  readmeContext: ExtensionReadmeContext,
): string => {
  if (readmeContext.type === "standalone") return standaloneExtensionReadme(name);

  return monorepoExtensionReadme(
    name,
    readmeContext.repoName,
    formatMarkdownPath(
      path.relative(extensionRoot, path.join(readmeContext.repoRoot, "README.md")),
    ),
  );
};

const formatMarkdownPath = (markdownPath: string): string =>
  markdownPath.startsWith(".") ? markdownPath : `./${markdownPath}`;

const readPackage = (packagePath: string): PackageJson => {
  if (!existsSync(packagePath)) return {};
  return readJson<PackageJson>(packagePath);
};

const assertCanWrite = (targetPath: string): void => {
  if (!existsSync(targetPath)) return;
  const entries = readdirSync(targetPath);
  if (entries.length === 0) return;
  throw new Error(`Refusing to write into non-empty directory: ${targetPath}`);
};
