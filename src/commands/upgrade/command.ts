import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { stringParser } from "~/lib/cli";
import { runCliCommand } from "~/lib/command";
import { verboseFlag } from "~/lib/flags";
import type { UpgradeArgs, UpgradeFlags } from "./impl";
import { runUpgrade } from "./impl";

export const upgradeCommand = buildCommand<UpgradeFlags, UpgradeArgs, LocalContext>({
  parameters: {
    flags: {
      bump: {
        kind: "boolean",
        brief: "Upgrade to the latest version and rewrite dependency ranges",
        optional: true,
      },
      verbose: verboseFlag,
    },
    positional: {
      kind: "array",
      minimum: 0,
      parameter: {
        brief: "Extension name to upgrade (omit to upgrade all managed extensions)",
        placeholder: "extension-name",
        parse: stringParser,
      },
    },
  },
  docs: {
    brief: "Upgrade installed extensions",
    customUsage: ["[--bump] [--verbose] [extension-name...]"],
  },
  func: async function (this: LocalContext, flags, ...extensionNames) {
    return runCliCommand(this, () => runUpgrade(this, flags, extensionNames));
  },
});
