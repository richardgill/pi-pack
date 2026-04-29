import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readCommandOutput, runCommand } from "~/lib/command";
import {
  readPiPackExtensionNamesFromPackageRoot,
  readPiPackExtensionsDirFromPackageRoot,
  readRequiredPiPackExtensionsDir,
} from "~/lib/package-config";
import { assertSafeExtensionName } from "~/lib/pi";
import { isString } from "~/lib/string";

export const toPnpmDependency = async (
  cwd: string,
  source: string,
  extensionName?: string,
): Promise<string> => {
  assertExtensionNameIsSupported(source, extensionName);
  const packagePath = await resolveExtensionPackagePath(cwd, source, extensionName);
  if (source.startsWith("npm:")) return source.slice("npm:".length);
  if (source.startsWith("file:")) return toPnpmFileSource(cwd, source, packagePath);
  if (source.startsWith("git:")) return toPnpmGitSource(source.slice("git:".length), packagePath);
  if (isPathSource(source)) return resolvePathSource(cwd, source, packagePath);
  return source;
};

export const readInstallSourceExtensionNames = async (
  cwd: string,
  source: string,
): Promise<string[] | undefined> => {
  if (source.startsWith("git:"))
    return readGitInstallSourceExtensionNames(source.slice("git:".length));
  if (!source.startsWith("file:") && !isPathSource(source)) return undefined;
  return readPiPackExtensionNamesFromPackageRoot(resolveLocalSourceRoot(cwd, source));
};

const assertExtensionNameIsSupported = (source: string, extensionName?: string): void => {
  if (extensionName === undefined || supportsExtensionName(source)) return;
  throw new Error("--extension can only be used with git:, file:, or filesystem path sources.");
};

const supportsExtensionName = (source: string): boolean =>
  source.startsWith("file:") || source.startsWith("git:") || isPathSource(source);

const resolveExtensionPackagePath = async (
  cwd: string,
  source: string,
  extensionName?: string,
): Promise<string | undefined> => {
  if (extensionName === undefined) return undefined;
  assertSafeExtensionName(extensionName);

  const extensionsDir = await readExtensionsDir(cwd, source);
  return path.posix.join(extensionsDir, extensionName);
};

const readExtensionsDir = async (cwd: string, source: string): Promise<string> => {
  if (source.startsWith("git:")) return readGitExtensionsDir(source.slice("git:".length));
  return readLocalExtensionsDir(resolveLocalSourceRoot(cwd, source));
};

const readLocalExtensionsDir = (repoRoot: string): string =>
  readRequiredPiPackExtensionsDir(path.join(repoRoot, "package.json"));

const readGitExtensionsDir = async (source: string): Promise<string> => {
  const parsed = parseGitSource(source);
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "pi-pack-repo-"));

  try {
    await checkoutGitPackageJson(tempRoot, parsed);
    return readRequiredPiPackExtensionsDir(path.join(tempRoot, "package.json"));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
};

const readGitInstallSourceExtensionNames = async (
  source: string,
): Promise<string[] | undefined> => {
  const parsed = parseGitSource(source);
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "pi-pack-repo-"));

  try {
    await prepareGitCheckout(tempRoot, parsed);
    await checkoutGitPaths(tempRoot, ["package.json"]);
    const extensionsDir = readPiPackExtensionsDirFromPackageRoot(tempRoot);
    if (extensionsDir === undefined) return undefined;

    const packageJsonPaths = await readGitExtensionPackageJsonPaths(tempRoot, extensionsDir);
    await checkoutGitPaths(tempRoot, packageJsonPaths);
    return readPiPackExtensionNamesFromPackageRoot(tempRoot);
  } catch {
    return undefined;
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
};

const checkoutGitPackageJson = async (
  cwd: string,
  source: { repo: string; ref?: string },
): Promise<void> => {
  await prepareGitCheckout(cwd, source);
  await checkoutGitPaths(cwd, ["package.json"]);
};

const prepareGitCheckout = async (
  cwd: string,
  source: { repo: string; ref?: string },
): Promise<void> => {
  await runCommand("git", ["init"], cwd);
  await runCommand("git", ["remote", "add", "origin", toGitCloneUrl(source.repo)], cwd);
  await runCommand("git", ["fetch", "--depth=1", "origin", source.ref ?? "HEAD"], cwd);
};

const checkoutGitPaths = async (cwd: string, paths: string[]): Promise<void> => {
  if (paths.length === 0) return;
  await runCommand("git", ["checkout", "--force", "FETCH_HEAD", "--", ...paths], cwd);
};

const readGitExtensionPackageJsonPaths = async (
  cwd: string,
  extensionsDir: string,
): Promise<string[]> => {
  const output = await readCommandOutput(
    "git",
    ["ls-tree", "-r", "--name-only", "-z", "FETCH_HEAD", "--", extensionsDir],
    cwd,
  );
  return output
    .split("\0")
    .filter((packageJsonPath) => isDirectExtensionPackageJsonPath(extensionsDir, packageJsonPath));
};

const isDirectExtensionPackageJsonPath = (
  extensionsDir: string,
  packageJsonPath: string,
): boolean => {
  const relativePath = path.posix.relative(extensionsDir, packageJsonPath);
  return relativePath.split("/").length === 2 && relativePath.endsWith("/package.json");
};

const resolveLocalSourceRoot = (cwd: string, source: string): string => {
  if (source.startsWith("file:")) return resolveFileSourcePath(cwd, source);
  return resolvePathSource(cwd, source);
};

const toPnpmFileSource = (cwd: string, source: string, packagePath?: string): string =>
  pathToFileURL(path.resolve(resolveFileSourcePath(cwd, source), packagePath ?? "")).href;

const resolveFileSourcePath = (cwd: string, source: string): string => {
  const filePath = source.slice("file:".length);
  if (isHomePathSource(filePath)) return expandHomePath(filePath);
  return fileURLToPath(new URL(source, pathToFileURL(path.resolve(cwd) + path.sep)));
};

const toPnpmGitSource = (source: string, packagePath?: string): string => {
  const parsed = parseGitSource(source);
  const fragment = createGitFragment(parsed.ref, packagePath);
  if (parsed.repo.startsWith("github.com/")) return toGithubSource(parsed.repo, fragment);
  return `git+https://${parsed.repo}.git${fragment}`;
};

const parseGitSource = (source: string): { repo: string; ref?: string } => {
  const refIndex = source.lastIndexOf("@");
  if (refIndex <= 0) return { repo: source };
  return { repo: source.slice(0, refIndex), ref: source.slice(refIndex + 1) };
};

const createGitFragment = (ref?: string, packagePath?: string): string => {
  const entries = [ref, packagePath === undefined ? undefined : `path:${packagePath}`].filter(
    isString,
  );
  if (entries.length === 0) return "";
  return `#${entries.join("&")}`;
};

const toGitCloneUrl = (repo: string): string => `https://${repo}.git`;

const toGithubSource = (repo: string, fragment: string): string => {
  const repoPath = repo.slice("github.com/".length);
  return `github:${repoPath}${fragment}`;
};

const resolvePathSource = (cwd: string, source: string, packagePath?: string): string =>
  path.resolve(cwd, expandHomePath(source), packagePath ?? "");

const expandHomePath = (source: string): string => {
  if (source === "~") return readHomeDir();
  if (source.startsWith("~/")) return path.join(readHomeDir(), source.slice(2));
  return source;
};

const readHomeDir = (): string => process.env["HOME"] ?? os.homedir();

const isPathSource = (source: string): boolean =>
  isHomePathSource(source) ||
  source.startsWith("./") ||
  source.startsWith("../") ||
  path.isAbsolute(source);

const isHomePathSource = (source: string): boolean => source === "~" || source.startsWith("~/");
