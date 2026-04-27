import path from "node:path";

// References: https://github.com/sindresorhus/filename-reserved-regex/blob/main/index.js and https://github.com/MartinKolarik/is-safe-path/blob/master/index.js
const reservedPathSegmentPattern = new RegExp(String.raw`[<>:"/\\|?*\u0000-\u001F]|[. ]$`, "u");
const windowsReservedPathSegmentPattern =
  /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/iu;
const parentTraversalPathPattern = /(?:^|\/)\.\.(?:\/|$)/u;

export const assertSafePathSegment = (value: string, label: string): void => {
  if (isSafePathSegment(value)) return;
  throw new Error(`${label} must be a single filesystem path segment: ${value}.`);
};

export const assertSafeRelativePath = (value: string, label: string): void => {
  if (isSafeRelativePath(value)) return;
  throw new Error(`${label} must be a safe relative path: ${value}.`);
};

// "Safe" means this is only a name, never a path: joining it cannot add parents, children, or absolute roots.
// Example: extensionName can become ~/.pi/extensions/<extensionName>, but not ~/.pi/extensions/../secrets.
export const isSafePathSegment = (value: string): boolean =>
  value.length > 0 &&
  value !== "." &&
  value !== ".." &&
  !reservedPathSegmentPattern.test(value) &&
  !windowsReservedPathSegmentPattern.test(value);

// "Safe" means this path stays under the trusted root when joined lexically; it cannot start absolute or contain .. segments.
// Example: defaultConfig can become <packageRoot>/config/default.ts, but not <packageRoot>/../secrets.ts.
const isSafeRelativePath = (value: string): boolean =>
  value.length > 0 &&
  !path.posix.isAbsolute(value) &&
  !path.win32.isAbsolute(value) &&
  !parentTraversalPathPattern.test(value) &&
  value.split("/").every(isSafePathSegment);
