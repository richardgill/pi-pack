import { expect, test } from "vite-plus/test";
import { assertSafePathSegment, assertSafeRelativePath } from "./path";

test("assertSafePathSegment accepts single filesystem path segments", () => {
  expect(() => assertSafePathSegment("files", "Name")).not.toThrow();
  expect(() => assertSafePathSegment("pi-preset", "Name")).not.toThrow();
});

test("assertSafePathSegment rejects path-like values", () => {
  expect(() => assertSafePathSegment("../files", "Name")).toThrow(
    "Name must be a single filesystem path segment: ../files.",
  );
  expect(() => assertSafePathSegment("", "Name")).toThrow(
    "Name must be a single filesystem path segment: .",
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
