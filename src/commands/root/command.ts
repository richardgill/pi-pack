import { buildCommand } from "@stricli/core";
import type { LocalContext } from "~/context";
import type { RootArgs, RootFlags } from "./impl";
import { runRoot } from "./impl";

export const rootCommand = buildCommand<RootFlags, RootArgs, LocalContext>({
  parameters: {
    flags: {},
  },
  docs: {
    brief: "pi-pack command line interface",
  },
  func: function (this: LocalContext, flags) {
    runRoot(this, flags);
  },
});
