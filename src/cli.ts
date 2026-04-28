#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { run } from "@stricli/core";
import { app } from "./app";
import type { LocalContext } from "./context";
import { buildContext } from "./context";
import { normalizeRootHelpArgs, readCliRunArgs } from "./lib/cli";
import { isAiAgent } from "./lib/env";

const readmePath = fileURLToPath(new URL("../README.md", import.meta.url));

const printAiReadmeHint = (context: LocalContext): void => {
  if (!isAiAgent(context)) return;
  context.process.stderr.write(
    `Hint: You can read ${readmePath} to understand how pi-pack works.\n`,
  );
};

export const runCli = async (args: string[], context: LocalContext): Promise<void> => {
  printAiReadmeHint(context);
  await run(app, normalizeRootHelpArgs(args), context);
};

try {
  const cwd = process.env["PI_PACK_CWD"] ?? process.cwd();
  const runArgs = readCliRunArgs(process.argv.slice(2));
  const context = buildContext(process, cwd, { verbose: runArgs.verbose });

  await runCli(runArgs.args, context);
} catch {
  process.exit(1);
}
