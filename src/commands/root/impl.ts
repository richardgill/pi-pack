import type { LocalContext } from "~/context";
import { colors } from "~/lib/colors";

export type RootFlags = Record<string, never>;

export type RootArgs = [];

const helpText = [
  colors.heading("USAGE"),
  `  ${colors.command("pi-pack install")} [${colors.command("--extension")} ${colors.accent("<extension-name>")}] [${colors.command("--as")} ${colors.accent("<extension-dir>")}] ${colors.accent("<source>")}`,
  `  ${colors.command("pi-pack upgrade")} [${colors.command("--bump")}] ${colors.accent("[extension-name...]")}`,
  `  ${colors.command("pi-pack uninstall")} [${colors.command("--yes")}] ${colors.accent("[extension-name...]")}`,
  `  ${colors.command("pi-pack create")} [${colors.command("--mono-dir")} ${colors.accent("<extensions-dir>")}] [${colors.command("--mono")}] ${colors.accent("[name]")}`,
  "",
  "A packaging system for pi extensions",
  "",
  colors.heading("INSTALL SOURCES"),
  `  ${colors.command("npm:<pkg>[@version]")}`,
  `  ${colors.command("git:<host>/<repo>[@ref]")}`,
  `  ${colors.command("file:<path>")} | ${colors.pathText("./path")} | ${colors.pathText("../path")} | ${colors.pathText("~/path")} | ${colors.pathText("/path")}`,
  "",
  colors.heading("FLAGS"),
  `  ${colors.command("-h --help")}     ${colors.muted("Print help information and exit")}`,
  `  ${colors.command("-v --version")}  ${colors.muted("Print version information and exit")}`,
  `  ${colors.command("--verbose")}     ${colors.muted("Show verbose logging")}`,
  "",
  colors.heading("COMMANDS"),
  `  ${colors.command("install")}    ${colors.muted("Install an extension package")}`,
  `  ${colors.command("upgrade")}    ${colors.muted("Upgrade installed extensions")}`,
  `  ${colors.command("uninstall")}  ${colors.muted("Uninstall installed extensions")}`,
  `  ${colors.command("create")}     ${colors.muted("Create an extension package")}`,
  "",
].join("\n");

export const runRoot = (context: LocalContext, flags: RootFlags): void => {
  void flags;
  context.process.stdout.write(helpText);
};
