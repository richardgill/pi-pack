import type { Readable, Writable } from "node:stream";
import type { CommandContext } from "@stricli/core";
import type { PromptHandler, RecordedPrompt } from "~/testing/prompt-testing-types";

export type LocalContext = CommandContext & {
  readonly process: NodeJS.Process;
  readonly verbose?: boolean;
  // used for testing
  readonly cwd: string;
  readonly promptInput?: Readable;
  readonly promptOutput?: Writable;
  readonly promptHandler?: PromptHandler;
  readonly onPromptRecord?: (prompt: RecordedPrompt) => void;
};

type BuildContextOptions = {
  verbose?: boolean;
};

export const buildContext = (
  proc: NodeJS.Process,
  cwd?: string,
  options: BuildContextOptions = {},
): LocalContext => ({
  process: proc,
  verbose: options.verbose,
  cwd: cwd ?? proc.cwd(),
  promptInput: proc.stdin,
  promptOutput: proc.stdout,
});
