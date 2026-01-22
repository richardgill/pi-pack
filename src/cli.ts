#!/usr/bin/env node

import { run } from "@stricli/core";
import { app } from "./app";
import type { LocalContext } from "./context";
import { buildContext } from "./context";

export const runCli = async (
  args: string[],
  context: LocalContext,
): Promise<void> => {
  await run(app, args, context);
};

try {
  const cwd = process.env["PI_PACK_CWD"] ?? process.cwd();
  const args = process.argv.slice(2);
  const context = buildContext(process, cwd);

  await runCli(args, context);
} catch {
  process.exit(1);
}
