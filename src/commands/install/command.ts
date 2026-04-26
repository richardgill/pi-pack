import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { stringParser } from "~/lib/cli";
import { runCliCommand } from "~/lib/command";
import { verboseFlag } from "~/lib/flags";
import type { InstallArgs, InstallFlags } from "./impl";
import { runInstall } from "./impl";

export const installCommand = buildCommand<InstallFlags, InstallArgs, LocalContext>({
  parameters: {
    flags: {
      extension: {
        kind: "parsed",
        brief: "Install an extension from a configured monorepo",
        parse: stringParser,
        optional: true,
      },
      as: {
        kind: "parsed",
        brief: "Install under a custom extension dir",
        placeholder: "extension-dir",
        parse: stringParser,
        optional: true,
      },
      verbose: verboseFlag,
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Source specifier for the extension package",
          parse: stringParser,
        },
      ],
    },
  },
  docs: {
    brief: "Install an extension package",
  },
  func: async function (this: LocalContext, flags, source) {
    return runCliCommand(this, () => runInstall(this, flags, source));
  },
});
