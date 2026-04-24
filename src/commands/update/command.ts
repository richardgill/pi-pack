import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import type { UpdateArgs, UpdateFlags } from "./impl";
import { runUpdate } from "./impl";

const parseString = (input: string): string => input;

export const updateCommand = buildCommand<UpdateFlags, UpdateArgs, LocalContext>({
  parameters: {
    flags: {
      all: {
        kind: "boolean",
        brief: "Update all installed extensions",
        optional: true,
      },
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Extension name to update",
          parse: parseString,
          optional: true,
        },
      ],
    },
  },
  docs: {
    brief: "Update installed extensions",
  },
  func: runUpdate,
});
