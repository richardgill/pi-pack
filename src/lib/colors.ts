import chalk, { chalkStderr, type ChalkInstance } from "chalk";

export type ColorTheme = {
  success: (text: string) => string;
  failure: (text: string) => string;
  warning: (text: string) => string;
  accent: (text: string) => string;
  muted: (text: string) => string;
  label: (text: string) => string;
  pathText: (text: string) => string;
  heading: (text: string) => string;
  command: (text: string) => string;
  version: (text: string) => string;
};

export const createColorTheme = (writer: ChalkInstance): ColorTheme => ({
  success: (text) => writer.green(text),
  failure: (text) => writer.red(text),
  warning: (text) => writer.yellow(text),
  accent: (text) => writer.cyan(text),
  muted: (text) => writer.dim(text),
  label: (text) => writer.dim(text),
  pathText: (text) => writer.cyan(text),
  heading: (text) => writer.bold(text),
  command: (text) => writer.cyan(text),
  version: (text) => writer.green(text),
});

export const colors = createColorTheme(chalk);
export const stderrColors = createColorTheme(chalkStderr);
