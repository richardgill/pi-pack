import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { parseString } from "~/lib/cli";
import { runUserCommand, verboseFlag } from "~/lib/command";
import type { InstallArgs, InstallFlags } from "./impl";
import { runInstall } from "./impl";

export const installCommand = buildCommand<InstallFlags, InstallArgs, LocalContext>({
  parameters: {
    flags: {
      extension: {
        kind: "parsed",
        brief: "Install an extension from a configured monorepo",
        parse: parseString,
        optional: true,
      },
      as: {
        kind: "parsed",
        brief: "Install under a custom extension folder",
        placeholder: "extension-folder",
        parse: parseString,
        optional: true,
      },
      verbose: verboseFlag,
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Source specifier for the extension package",
          parse: parseString,
        },
      ],
    },
  },
  docs: {
    brief: "Install an extension package",
  },
  func: async function (this: LocalContext, flags, source) {
    return runUserCommand(this, () => runInstall(this, flags, source));
  },
});
