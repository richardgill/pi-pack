import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { stringParser } from "~/lib/cli";
import { runCliCommand } from "~/lib/command";
import { verboseFlag } from "~/lib/flags";
import type { CreateArgs, CreateFlags } from "./impl";
import { runCreate } from "./impl";

export const createCommand = buildCommand<CreateFlags, CreateArgs, LocalContext>({
  parameters: {
    flags: {
      monoDir: {
        kind: "parsed",
        brief: "Set the monorepo extensions folder",
        parse: stringParser,
        optional: true,
      },
      mono: {
        kind: "boolean",
        brief: "Create a monorepo root",
        optional: true,
      },
      verbose: verboseFlag,
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Extension package name to create",
          parse: stringParser,
          optional: true,
        },
      ],
    },
  },
  docs: {
    brief: "Create an extension package",
  },
  func: async function (this: LocalContext, flags, name) {
    return runCliCommand(this, () => runCreate(this, flags, name));
  },
});
