import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeJson } from "~/lib/json";
import { assertSafePathSegment, assertSafeRelativePath } from "~/lib/path";
import { assertSafeExtensionName } from "~/lib/pi";
import {
  extensionPackageJson,
  indexDotTs,
  monorepoRootPackageJson,
  defaultConfigSource,
  monorepoExtensionReadme,
  monorepoReadme,
  standaloneExtensionReadme,
  tsconfig,
} from "./templates";

type ExtensionReadmeContext =
  | { type: "standalone" }
  | { type: "monorepo"; repoName: string; repoRoot: string };

export const createMono = ({
  cwd,
  repoName,
  extensionsDir,
  firstExtensionName,
}: {
  cwd: string;
  repoName: string;
  extensionsDir: string;
  firstExtensionName?: string;
}): void => {
  assertSafePathSegment(repoName, "Repo name");
  assertSafeRelativePath(extensionsDir, "Extensions dir");

  const monorepoRoot = path.join(cwd, repoName);
  assertDirEmpty(monorepoRoot);
  mkdirSync(path.join(monorepoRoot, extensionsDir), { recursive: true });
  writeJson(
    path.join(monorepoRoot, "package.json"),
    monorepoRootPackageJson(repoName, extensionsDir),
  );
  writeFileSync(
    path.join(monorepoRoot, "README.md"),
    monorepoReadme(repoName, extensionsDir, firstExtensionName),
    "utf8",
  );
};

export const createExtension = ({
  extensionName,
  extensionRoot,
  readmeContext,
}: {
  extensionName: string;
  extensionRoot: string;
  readmeContext: ExtensionReadmeContext;
}): void => {
  assertSafeExtensionName(extensionName);

  assertDirEmpty(extensionRoot);
  writeExtensionFiles(extensionRoot, extensionName, readmeContext);
};

const writeExtensionFiles = (
  extensionRoot: string,
  name: string,
  readmeContext: ExtensionReadmeContext,
): void => {
  const srcDir = path.join(extensionRoot, "src");
  mkdirSync(srcDir, { recursive: true });
  writeJson(path.join(extensionRoot, "package.json"), extensionPackageJson(name));
  writeFileSync(
    path.join(extensionRoot, "README.md"),
    extensionReadme(name, extensionRoot, readmeContext),
    "utf8",
  );
  writeFileSync(path.join(extensionRoot, "tsconfig.json"), tsconfig(), "utf8");
  writeFileSync(path.join(srcDir, "extension.ts"), indexDotTs(name), "utf8");
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

const assertDirEmpty = (targetPath: string): void => {
  if (!existsSync(targetPath)) return;
  const entries = readdirSync(targetPath);
  if (entries.length === 0) return;
  throw new Error(`Refusing to write into non-empty directory: ${targetPath}`);
};
