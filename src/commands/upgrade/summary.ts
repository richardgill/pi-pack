import type { LocalContext } from "~/context";
import { colors, stderrColors } from "~/lib/colors";
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
    `${formatUpgradeStatus(result.changed)} ${colors.accent(result.extensionName)}`,
    `${colors.label("Root:")} ${colors.pathText(result.root)}`,
    `${colors.label("Dependencies:")} ${result.dependencies.map(formatDependencyUpgrade).join(", ")}`,
  ].join("\n");

const formatUpgradeStatus = (changed: boolean): string =>
  changed ? colors.success("Upgraded") : colors.muted("Checked");

const formatDependencyUpgrade = (dependency: DependencyUpgrade): string => {
  const beforeVersion = dependency.beforeVersion ?? "unknown";
  const afterVersion = dependency.afterVersion ?? "unknown";
  if (dependency.beforeVersion === dependency.afterVersion) {
    return `${colors.accent(dependency.name)} ${colors.muted(afterVersion)}`;
  }
  return `${colors.accent(dependency.name)} ${colors.muted(beforeVersion)} -> ${colors.version(afterVersion)}`;
};

const formatUpgradeFailure = (failure: UpgradeFailure): string =>
  [
    `${stderrColors.failure("Failed")} ${stderrColors.accent(failure.extensionName)}`,
    `${stderrColors.label("Root:")} ${stderrColors.pathText(failure.root)}`,
    stderrColors.failure(errorMessage(failure.error)),
  ].join("\n");

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};
