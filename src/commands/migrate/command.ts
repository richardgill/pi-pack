import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import { runCliCommand } from "~/lib/command";
import type { MigrateArgs, MigrateFlags } from "./impl";
import { runMigrate } from "./impl";

export const migrateCommand = buildCommand<MigrateFlags, MigrateArgs, LocalContext>({
  parameters: {
    flags: {},
  },
  docs: {
    brief: "Print AI migration instructions for existing pi extensions",
  },
  func: function (this: LocalContext, flags) {
    return runCliCommand(this, () => runMigrate(this, flags));
  },
});
