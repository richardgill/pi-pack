import path from "node:path";

export const assertSafePathSegment = (value: string, label: string): void => {
  if (isSafePathSegment(value)) return;
  throw new Error(`${label} must be a single filesystem path segment: ${value}.`);
};

export const assertSafeRelativePath = (value: string, label: string): void => {
  if (isSafeRelativePath(value)) return;
  throw new Error(`${label} must be a safe relative path: ${value}.`);
};

export const isSafePathSegment = (value: string): boolean =>
  value.length > 0 &&
  value !== "." &&
  value !== ".." &&
  !value.includes("/") &&
  !value.includes("\\") &&
  !value.includes("\0");

const isSafeRelativePath = (value: string): boolean =>
  value.length > 0 &&
  !path.posix.isAbsolute(value) &&
  !path.win32.isAbsolute(value) &&
  !value.includes("\\") &&
  !value.includes("\0") &&
  value.split("/").every(isSafePathSegment);
