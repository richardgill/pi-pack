import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { stringParser } from "~/lib/cli";
import { runCliCommand } from "~/lib/command";
import { verboseFlag } from "~/lib/flags";
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
      verbose: verboseFlag,
    },
    positional: {
      kind: "array",
      minimum: 0,
      parameter: {
        brief: "Extension name to uninstall",
        placeholder: "extension-name",
        parse: stringParser,
      },
    },
  },
  docs: {
    brief: "Uninstall installed extensions",
  },
  func: async function (this: LocalContext, flags, ...extensionNames) {
    return runCliCommand(this, () => runUninstall(this, flags, extensionNames));
  },
});
