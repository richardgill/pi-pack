import { expect, test } from "vite-plus/test";
import { assertSafePathSegment, assertSafeRelativePath } from "./path";

test("assertSafePathSegment accepts single filesystem path segments", () => {
  expect(() => assertSafePathSegment("files", "Name")).not.toThrow();
  expect(() => assertSafePathSegment("pi-preset", "Name")).not.toThrow();
  expect(() => assertSafePathSegment("rich files", "Name")).not.toThrow();
  expect(() => assertSafePathSegment("config.json", "Name")).not.toThrow();
});

test("assertSafePathSegment rejects path-like values", () => {
  expect(() => assertSafePathSegment("../files", "Name")).toThrow(
    "Name must be a single filesystem path segment: ../files.",
  );
  expect(() => assertSafePathSegment("", "Name")).toThrow(
    "Name must be a single filesystem path segment: .",
  );
  expect(() => assertSafePathSegment(".", "Name")).toThrow(
    "Name must be a single filesystem path segment: ..",
  );
});

test("assertSafePathSegment rejects non-portable filesystem names", () => {
  expect(() => assertSafePathSegment("has:colon", "Name")).toThrow(
    "Name must be a single filesystem path segment: has:colon.",
  );
  expect(() => assertSafePathSegment("has?question", "Name")).toThrow(
    "Name must be a single filesystem path segment: has?question.",
  );
  expect(() => assertSafePathSegment("trailing.", "Name")).toThrow(
    "Name must be a single filesystem path segment: trailing..",
  );
  expect(() => assertSafePathSegment("trailing ", "Name")).toThrow(
    "Name must be a single filesystem path segment: trailing .",
  );
});

test("assertSafePathSegment rejects Windows reserved device names", () => {
  expect(() => assertSafePathSegment("CON", "Name")).toThrow(
    "Name must be a single filesystem path segment: CON.",
  );
  expect(() => assertSafePathSegment("nul.txt", "Name")).toThrow(
    "Name must be a single filesystem path segment: nul.txt.",
  );
  expect(() => assertSafePathSegment("LPT³.log", "Name")).toThrow(
    "Name must be a single filesystem path segment: LPT³.log.",
  );
});

test("assertSafeRelativePath accepts nested relative folders", () => {
  expect(() => assertSafeRelativePath("extensions", "Extensions folder")).not.toThrow();
  expect(() => assertSafeRelativePath("packages/extensions", "Extensions folder")).not.toThrow();
});

test("assertSafeRelativePath rejects paths that can escape the root", () => {
  expect(() => assertSafeRelativePath("../extensions", "Extensions folder")).toThrow(
    "Extensions folder must be a safe relative path: ../extensions.",
  );
  expect(() => assertSafeRelativePath("/tmp/extensions", "Extensions folder")).toThrow(
    "Extensions folder must be a safe relative path: /tmp/extensions.",
  );
  expect(() => assertSafeRelativePath("packages/../extensions", "Extensions folder")).toThrow(
    "Extensions folder must be a safe relative path: packages/../extensions.",
  );
});

test("assertSafeRelativePath rejects unsafe nested segments", () => {
  expect(() => assertSafeRelativePath("packages/NUL/config.json", "Extensions folder")).toThrow(
    "Extensions folder must be a safe relative path: packages/NUL/config.json.",
  );
  expect(() => assertSafeRelativePath("packages/C:/config.json", "Extensions folder")).toThrow(
    "Extensions folder must be a safe relative path: packages/C:/config.json.",
  );
});
