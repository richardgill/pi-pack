import path from "node:path";
import type { LocalContext } from "~/context";
import { assertSafeRelativePath, assertSafePathSegment } from "~/lib/path";
import { assertSafeExtensionName } from "~/lib/pi";
import { createPrompts, maybeCreatePrompts } from "~/lib/prompts";
import {
  createExtension,
  createMono,
  readConfiguredExtensionsFolder,
  readConfiguredRepoName,
} from "./scaffold";

export type CreateFlags = {
  mono?: boolean;
  monoDir?: string;
};

export type CreateArgs = [name?: string];

type CreateTarget = "extension" | "mono";

type Prompts = ReturnType<typeof createPrompts>;

const DEFAULT_EXTENSIONS_FOLDER = "extensions";

export const runCreate = async (
  context: LocalContext,
  flags: CreateFlags,
  name?: string,
): Promise<void> => {
  const prompts = maybeCreatePrompts(context);
  const isMonorepoMode = await readMonorepoMode(prompts, flags, context.cwd, name);
  if (isMonorepoMode === undefined) return;

  if (isMonorepoMode) {
    const repoName = await readRepoName(prompts, name);
    if (repoName === undefined) return;
    assertSafePathSegment(repoName, "Repo name");

    const extensionsFolder = await readExtensionsFolder(prompts, flags);
    if (extensionsFolder === undefined) return;
    assertSafeRelativePath(extensionsFolder, "Extensions folder");

    const firstExtensionName = await readFirstMonorepoExtensionName(prompts);
    if (prompts !== undefined && firstExtensionName === undefined) return;
    if (firstExtensionName !== undefined) assertSafeExtensionName(firstExtensionName);

    const monoRoot = path.join(context.cwd, repoName);
    createMono({
      type: "mono",
      cwd: context.cwd,
      repoName,
      extensionsFolder,
      firstExtensionName,
    });
    const firstExtension = createFirstMonorepoExtension(
      monoRoot,
      extensionsFolder,
      firstExtensionName,
    );
    writeMonorepoCreateResult(context, monoRoot, firstExtension?.root);
    return;
  }

  const extensionName = await readExtensionName(prompts, name);
  if (extensionName === undefined) return;
  assertSafeExtensionName(extensionName);

  const extensionRoot = resolveExtensionRoot(context.cwd, extensionName);
  createExtension({
    type: "extension",
    extensionName,
    extensionRoot,
    readmeContext: extensionReadmeContext(context.cwd),
  });
  writeCreateResult(context, "extension package", extensionName, extensionRoot);
};

const readMonorepoMode = async (
  prompts: Prompts | undefined,
  flags: CreateFlags,
  cwd: string,
  name?: string,
): Promise<boolean | undefined> => {
  if (flags.mono === true || flags.monoDir !== undefined) return true;
  if (name !== undefined || readConfiguredExtensionsFolder(cwd) !== undefined) return false;
  if (prompts === undefined)
    throw new Error("Usage: pi-pack create <name> or pi-pack create --mono <repo>");

  const target = await promptForCreateTarget(prompts);
  if (prompts.isCancel(target)) return undefined;
  return target === "mono";
};

const readRepoName = async (
  prompts: Prompts | undefined,
  name?: string,
): Promise<string | undefined> => {
  if (name !== undefined) return name;
  if (prompts === undefined) throw new Error("Missing repo name.");

  const repoName = await prompts.text({
    message: "Repo name",
    placeholder: "pi-extensions",
  });
  if (prompts.isCancel(repoName)) return undefined;
  return repoName;
};

const readExtensionName = async (
  prompts: Prompts | undefined,
  name?: string,
): Promise<string | undefined> => {
  if (name !== undefined) return name;
  if (prompts === undefined) throw new Error("Missing extension name.");

  const extensionName = await prompts.text({
    message: "Extension name. e.g. pi-preset",
    placeholder: "pi-",
  });
  if (prompts.isCancel(extensionName)) return undefined;
  return extensionName;
};

const readExtensionsFolder = async (
  prompts: Prompts | undefined,
  flags: CreateFlags,
): Promise<string | undefined> => {
  if (flags.monoDir !== undefined) return flags.monoDir;
  if (prompts === undefined) return DEFAULT_EXTENSIONS_FOLDER;

  const folder = await prompts.text({
    message: "Extensions folder",
    placeholder: DEFAULT_EXTENSIONS_FOLDER,
    initialValue: DEFAULT_EXTENSIONS_FOLDER,
  });
  if (prompts.isCancel(folder)) return undefined;
  return folder;
};

const readFirstMonorepoExtensionName = async (
  prompts: Prompts | undefined,
): Promise<string | undefined> => {
  if (prompts === undefined) return undefined;

  const extensionName = await prompts.text({
    message: "First extension name. e.g. pi-preset",
    placeholder: "pi-",
  });
  if (prompts.isCancel(extensionName)) return undefined;
  return extensionName;
};

const promptForCreateTarget = async (prompts: Prompts): Promise<CreateTarget | symbol> => {
  const target = await prompts.select({
    message: "What do you want to create?",
    options: [
      { value: "extension", label: "Single extension" },
      { value: "mono", label: "Extension monorepo (multiple extensions in a single repo)" },
    ],
  });

  if (prompts.isCancel(target)) return target;
  if (target === "mono") return "mono";
  return "extension";
};

const createFirstMonorepoExtension = (
  monoRoot: string,
  extensionsFolder: string,
  extensionName: string | undefined,
): { name: string; root: string } | undefined => {
  if (extensionName === undefined) return undefined;

  const extensionRoot = path.join(monoRoot, extensionsFolder, extensionName);
  createExtension({
    type: "extension",
    extensionName,
    extensionRoot,
    readmeContext: { type: "monorepo", repoName: path.basename(monoRoot), repoRoot: monoRoot },
  });
  return { name: extensionName, root: extensionRoot };
};

const resolveExtensionRoot = (cwd: string, extensionName: string): string => {
  const configured = readConfiguredExtensionsFolder(cwd);
  if (configured === undefined) return path.join(cwd, extensionName);
  return path.join(cwd, configured, extensionName);
};

const extensionReadmeContext = (
  cwd: string,
): Parameters<typeof createExtension>[0]["readmeContext"] => {
  const configured = readConfiguredExtensionsFolder(cwd);
  if (configured === undefined) return { type: "standalone" };
  return { type: "monorepo", repoName: readConfiguredRepoName(cwd), repoRoot: cwd };
};

const writeCreateResult = (
  context: LocalContext,
  label: "extension package" | "extension monorepo",
  name: string,
  root: string,
): void => {
  context.process.stdout.write(
    `\nCreated ${label} ${name} at ${formatRelativePath(context.cwd, root)}\n`,
  );
};

const writeMonorepoCreateResult = (
  context: LocalContext,
  repoRoot: string,
  firstExtensionRoot?: string,
): void => {
  const repoPath = formatRelativePath(context.cwd, repoRoot);
  if (firstExtensionRoot === undefined) {
    context.process.stdout.write(`\nCreated extension monorepo:\n\n  Repo: ${repoPath}\n`);
    return;
  }

  context.process.stdout.write(
    `\nCreated extension monorepo:\n\n  Repo:            ${repoPath}\n  First extension: ${formatRelativePath(context.cwd, firstExtensionRoot)}\n`,
  );
};

const formatRelativePath = (from: string, to: string): string => {
  const relativePath = path.relative(from, to) || ".";
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};
