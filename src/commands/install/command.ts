import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { stringParser } from "~/lib/cli";
import { runCliCommand } from "~/lib/command";
import { verboseFlag } from "~/lib/flags";
import type { InstallArgs, InstallFlags } from "./impl";
import { runInstall } from "./impl";

const installFullDescription = [
  "Install an extension package into ~/.pi/agent/extensions/<extension-dir>",
  "",
  "INSTALL SOURCES",
  "  npm:<pkg>[@version]",
  "    Install from npm.",
  "",
  "  git:<host>/<repo>[@ref]",
  "    Install from a git repo. @ref can be a tag, branch, or commit.",
  "",
  "  file:<path> | ./path | ../path | ~/path | /path",
  "    Install from a local package directory.",
  "",
  "EXAMPLES",
  "  # From GitHub repo",
  '  pi-pack install "git:github.com/user/repo"',
  '  pi-pack install "git:github.com/user/repo@v1"',
  "",
  "  # From a GitHub monorepo",
  '  pi-pack install "git:github.com/user/mono-repo" --extension "extension-name"',
  "",
  "  # From npm",
  '  pi-pack install "npm:foo-bar"',
  '  pi-pack install "npm:foo-bar@1.0.0"',
  '  pi-pack install "npm:foo-bar" --as "baz"',
  "",
  "  # From local filesystem",
  '  pi-pack install "~/code/my-extension"',
  '  pi-pack install "~/code/my-extension-mono-repo" --extension "extension-name"',
].join("\n");

export const installCommand = buildCommand<InstallFlags, InstallArgs, LocalContext>({
  parameters: {
    flags: {
      extension: {
        kind: "parsed",
        brief: "Install an extension from a configured monorepo",
        placeholder: "extension-name",
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
          placeholder: "source",
          parse: stringParser,
        },
      ],
    },
  },
  docs: {
    brief: "Install an extension package",
    fullDescription: installFullDescription,
    customUsage: ["[--extension <extension-name>] [--as <extension-dir>] [--verbose] <source>"],
  },
  func: async function (this: LocalContext, flags, source) {
    return runCliCommand(this, () => runInstall(this, flags, source));
  },
});
