import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { parseString } from "~/lib/cli";
import type { UninstallArgs, UninstallFlags } from "./impl";
import { runUninstall } from "./impl";

export const uninstallCommand = buildCommand<UninstallFlags, UninstallArgs, LocalContext>({
  parameters: {
    flags: {
      yes: {
        kind: "boolean",
        brief: "Skip confirmation prompts",
        optional: true,
      },
    },
    positional: {
      kind: "array",
      minimum: 0,
      parameter: {
        brief: "Extension name to uninstall",
        placeholder: "extension-name",
        parse: parseString,
      },
    },
  },
  docs: {
    brief: "Uninstall installed extensions",
  },
  func: async function (this: LocalContext, flags, ...extensionNames) {
    await runUninstall(this, flags, extensionNames);
  },
});
