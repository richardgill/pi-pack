import path from "node:path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { isSafePathSegment } from "~/lib/path";

export const resolvePiExtensionsRoot = (): string => path.join(getAgentDir(), "extensions");

export const resolveExtensionRoot = (extensionName: string): string => {
  assertSafeExtensionName(extensionName);
  return path.join(resolvePiExtensionsRoot(), extensionName);
};

export const assertSafeExtensionName = (extensionName: string, hint?: string): void => {
  if (isSafePathSegment(extensionName)) return;
  throw new Error(formatUnsafeExtensionNameError(extensionName, hint));
};

const formatUnsafeExtensionNameError = (extensionName: string, hint?: string): string =>
  [`Extension name must be a single filesystem path segment: ${extensionName}.`, hint]
    .filter(Boolean)
    .join(" ");
