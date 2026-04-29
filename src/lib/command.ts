import { spawn } from "node:child_process";
import type { LocalContext } from "~/context";

type CommandOutput = {
  stdout: Buffer[];
  stderr: Buffer[];
};

export const runCommand = async (command: string, args: string[], cwd: string): Promise<void> => {
  await runCommandWithOutput(command, args, cwd);
};

export const readCommandOutput = async (
  command: string,
  args: string[],
  cwd: string,
): Promise<string> => {
  const output = await runCommandWithOutput(command, args, cwd);
  return Buffer.concat(output.stdout).toString("utf8");
};

const runCommandWithOutput = (
  command: string,
  args: string[],
  cwd: string,
): Promise<CommandOutput> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(formatCommandError(command, args, code, stdout, stderr)));
    });
  });

type CommandAction = () => Promise<void> | void;

export const runCliCommand = async (
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
