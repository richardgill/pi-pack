import { spawn } from "node:child_process";

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
