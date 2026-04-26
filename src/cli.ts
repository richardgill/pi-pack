#!/usr/bin/env node

import { run } from "@stricli/core";
import { app } from "./app";
import type { LocalContext } from "./context";
import { buildContext } from "./context";
import { normalizeRootHelpArgs, readCliRunArgs } from "./lib/cli-args";

export const runCli = async (args: string[], context: LocalContext): Promise<void> => {
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
