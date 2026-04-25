import type { LocalContext } from "~/context";

export type RootFlags = Record<string, never>;

export type RootArgs = [];

const helpText = `USAGE
  pi-pack install [--extension <extension-name>] [--as <extension-folder>] <source>
  pi-pack upgrade [--bump] [extension-name...]
  pi-pack uninstall [--yes] [extension-name...]
  pi-pack create [--mono-dir <extensions-folder>] [--mono] [name]

A packaging system for pi extensions

INSTALL SOURCES
  npm:<pkg>[@version]
  git:<host>/<repo>[@ref]
  file:<path> | ./path | ../path | ~/path | /path

FLAGS
  -h --help     Print help information and exit
  -v --version  Print version information and exit

COMMANDS
  install    Install an extension package
  upgrade    Upgrade installed extensions
  uninstall  Uninstall installed extensions
  create     Create an extension package
`;

export const runRoot = (context: LocalContext, flags: RootFlags): void => {
  void flags;
  context.process.stdout.write(helpText);
};
