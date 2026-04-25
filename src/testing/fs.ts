import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { expect } from "vite-plus/test";

export const expectPathExists = (cwd: string, filePath: string): void => {
  expect(statSync(path.join(cwd, filePath)).isFile()).toBe(true);
};

export const expectDirExists = (cwd: string, filePath: string): void => {
  expect(statSync(path.join(cwd, filePath)).isDirectory()).toBe(true);
};

export const expectPathMissing = (cwd: string, filePath: string): void => {
  expect(existsSync(path.join(cwd, filePath))).toBe(false);
};
