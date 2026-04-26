import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { stringParser } from "~/lib/cli";
import { runUserCommand, verboseFlag } from "~/lib/command";
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
    return runUserCommand(this, () => runCreate(this, flags, name));
  },
});
