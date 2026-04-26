import path from "node:path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { isSafePathSegment } from "~/lib/path";

export const resolvePiExtensionsFolder = (): string => path.resolve(getAgentDir(), "extensions");

export const resolveExtensionFolder = (extensionName: string): string => {
  assertSafeExtensionName(extensionName);
  return path.join(resolvePiExtensionsFolder(), extensionName);
};

export const assertSafeExtensionName = (extensionName: string, hint?: string): void => {
  if (isSafePathSegment(extensionName)) return;
  throw new Error(formatUnsafeExtensionNameError(extensionName, hint));
};

const formatUnsafeExtensionNameError = (extensionName: string, hint?: string): string =>
  [`Extension name must be a single filesystem path segment: ${extensionName}.`, hint]
    .filter(Boolean)
    .join(" ");
