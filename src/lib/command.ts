import { spawn } from "node:child_process";
import type { LocalContext } from "~/context";

export type VerboseFlags = {
  verbose?: boolean;
};

type CommandAction = () => Promise<void> | void;

export const verboseFlag = {
  kind: "boolean",
  brief: "Show verbose logging",
  optional: true,
} as const;

export const runCommand = (command: string, args: string[], cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(formatCommandError(command, args, code, stdout, stderr)));
    });
  });

export const runUserCommand = async (
  context: LocalContext,
  action: CommandAction,
): Promise<void | Error> => {
  try {
    await action();
  } catch (error) {
    if (context.verbose === true) throw error;
    return toCommandError(error);
  }
};

const toCommandError = (error: unknown): Error => {
  if (error instanceof Error) return new Error(error.message);
  return new Error(String(error));
};

const formatCommandError = (
  command: string,
  args: string[],
  code: number | null,
  stdout: Buffer[],
  stderr: Buffer[],
): string =>
  [
    `${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
    Buffer.concat(stdout).toString("utf8").trim(),
    Buffer.concat(stderr).toString("utf8").trim(),
  ]
    .filter(Boolean)
    .join("\n");
