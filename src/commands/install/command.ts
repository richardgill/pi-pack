import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import type { InstallArgs, InstallFlags } from "./impl";
import { runInstall } from "./impl";

const parseString = (input: string): string => input;

export const installCommand = buildCommand<InstallFlags, InstallArgs, LocalContext>({
  parameters: {
    flags: {
      path: {
        kind: "parsed",
        brief: "Install a package from a subdirectory",
        parse: parseString,
        optional: true,
      },
      name: {
        kind: "parsed",
        brief: "Set the target extension name",
        parse: parseString,
        optional: true,
      },
      force: {
        kind: "boolean",
        brief: "Allow overwriting existing extensions",
        optional: true,
      },
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
  func: runInstall,
});
