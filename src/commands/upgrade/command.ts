import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { stringParser } from "~/lib/cli";
import { runUserCommand, verboseFlag } from "~/lib/command";
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
        brief: "Extension name to upgrade",
        placeholder: "extension-name",
        parse: stringParser,
      },
    },
  },
  docs: {
    brief: "Upgrade installed extensions",
  },
  func: async function (this: LocalContext, flags, ...extensionNames) {
    return runUserCommand(this, () => runUpgrade(this, flags, extensionNames));
  },
});
