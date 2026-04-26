import type { LocalContext } from "~/context";
import type { DependencyUpgrade, UpgradeFailure, UpgradeResult } from "./runner";

export const printUpgradeSummary = (context: LocalContext, results: UpgradeResult[]): void => {
  if (results.length === 0) return;
  context.process.stdout.write(`${results.map(formatUpgradeResult).join("\n\n")}\n`);
};

export const printUpgradeFailures = (context: LocalContext, failures: UpgradeFailure[]): void => {
  if (failures.length === 0) return;
  context.process.stderr.write(`${failures.map(formatUpgradeFailure).join("\n\n")}\n`);
};

const formatUpgradeResult = (result: UpgradeResult): string =>
  [
    `${result.changed ? "Upgraded" : "Checked"} ${result.extensionName}`,
    `Root: ${result.root}`,
    `Dependencies: ${result.dependencies.map(formatDependencyUpgrade).join(", ")}`,
  ].join("\n");

const formatDependencyUpgrade = (dependency: DependencyUpgrade): string => {
  if (dependency.beforeVersion === dependency.afterVersion) {
    return `${dependency.name} ${dependency.afterVersion ?? "unknown"}`;
  }
  return `${dependency.name} ${dependency.beforeVersion ?? "unknown"} -> ${dependency.afterVersion ?? "unknown"}`;
};

const formatUpgradeFailure = (failure: UpgradeFailure): string =>
  [`Failed ${failure.extensionName}`, `Root: ${failure.root}`, errorMessage(failure.error)].join(
    "\n",
  );

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};
