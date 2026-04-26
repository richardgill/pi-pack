import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect } from "vite-plus/test";
import { readJson } from "~/lib/json";

type ExpectedJsonFile = { json: object };
type ExpectedTextFile = { contains?: string | string[]; notContains?: string | string[] };
type ExpectedFile = true | string | RegExp | ExpectedJsonFile | ExpectedTextFile;

type ExpectedFileTree = {
  dirs?: string[];
  files?: Record<string, ExpectedFile>;
  missing?: string[];
};

export const expectPathExists = (cwd: string, filePath: string): void => {
  expect(statSync(path.join(cwd, filePath)).isFile()).toBe(true);
};

const expectDirExists = (cwd: string, filePath: string): void => {
  expect(statSync(path.join(cwd, filePath)).isDirectory()).toBe(true);
};

export const expectPathMissing = (cwd: string, filePath: string): void => {
  expect(existsSync(path.join(cwd, filePath))).toBe(false);
};

export const expectFileTree = (cwd: string, expected: ExpectedFileTree): void => {
  expected.dirs?.forEach((dirPath) => expectDirExists(cwd, dirPath));
  Object.entries(expected.files ?? {}).forEach(([filePath, file]) =>
    expectFile(cwd, filePath, file),
  );
  expected.missing?.forEach((filePath) => expectPathMissing(cwd, filePath));
};

const expectFile = (cwd: string, filePath: string, expected: ExpectedFile): void => {
  expectPathExists(cwd, filePath);
  if (expected === true) return;
  if (typeof expected === "string") return expectExactFile(cwd, filePath, expected);
  if (expected instanceof RegExp) return expect(readText(cwd, filePath)).toMatch(expected);
  if (hasJson(expected))
    return expect(readJson(path.join(cwd, filePath))).toMatchObject(expected.json);
  expectContainedText(cwd, filePath, expected);
};

const expectExactFile = (cwd: string, filePath: string, expected: string): void => {
  expect(readText(cwd, filePath)).toBe(expected);
};

const expectContainedText = (cwd: string, filePath: string, expected: ExpectedTextFile): void => {
  const text = readText(cwd, filePath);
  toArray(expected.contains).forEach((value) => expect(text).toContain(value));
  toArray(expected.notContains).forEach((value) => expect(text).not.toContain(value));
};

const hasJson = (expected: ExpectedFile): expected is ExpectedJsonFile =>
  typeof expected === "object" && expected !== null && Object.hasOwn(expected, "json");

const readText = (cwd: string, filePath: string): string =>
  readFileSync(path.join(cwd, filePath), "utf8");

const toArray = (value: string | string[] | undefined): string[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};
