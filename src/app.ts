import { buildApplication, buildRouteMap } from "@stricli/core";
import { installCommand } from "./commands/install/command";
import { rootCommand } from "./commands/root/command";
import { updateCommand } from "./commands/update/command";
import { VERSION } from "./version";

const routes = buildRouteMap({
  routes: {
    install: installCommand,
    update: updateCommand,
    root: rootCommand,
  },
  defaultCommand: "root",
  docs: {
    brief: "A packaging system for pi extensions",
    hideRoute: {
      root: true,
    },
  },
});

export const app = buildApplication(routes, {
  name: "pi-pack",
  versionInfo: {
    currentVersion: VERSION,
  },
  // Use kebab-case for flags (--no-verbose instead of --noVerbose)
  scanner: {
    caseStyle: "allow-kebab-for-camel",
  },
});
