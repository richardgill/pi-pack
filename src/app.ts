import { buildApplication, buildRouteMap } from "@stricli/core";
import { installCommand } from "./commands/install/command";
import { upgradeCommand } from "./commands/upgrade/command";
import { uninstallCommand } from "./commands/uninstall/command";
import { createCommand } from "./commands/create/command";
import { migrateCommand } from "./commands/migrate/command";
import { rootCommand } from "./commands/root/command";
import { VERSION } from "./version";

const routes = buildRouteMap({
  routes: {
    install: installCommand,
    upgrade: upgradeCommand,
    uninstall: uninstallCommand,
    create: createCommand,
    migrate: migrateCommand,
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
