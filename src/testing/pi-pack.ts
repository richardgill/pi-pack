import path from "node:path";
import { Writable } from "node:stream";
import { run } from "@stricli/core";
import { app } from "~/app";
import { buildContext, type LocalContext } from "~/context";
import { normalizeRootHelpArgs, readCliRunArgs } from "~/lib/cli";
import { withEnvVar } from "./env";
import type { PromptHandler } from "./prompt-testing-types";

export type RunResult = {
  stdout: string;
  stderr: string;
};

export type RunPiPackCommandOptions = {
  agentDir?: string;
  promptHandler?: PromptHandler;
};

export type RunPiPackCommand = (
  command: `pi-pack${string}`,
  options?: RunPiPackCommandOptions,
) => Promise<RunResult>;

type CapturedOutput = {
  stdout: Writable;
  stderr: Writable;
  readStdout: () => string;
  readStderr: () => string;
};

export const createPiPackTestRunner = (cwd: string): RunPiPackCommand => {
  const defaultAgentDir = path.join(cwd, "agent");

  return (command, options) =>
    runPiPack(
      cwd,
      options?.agentDir ?? defaultAgentDir,
      parsePiPackCommand(command),
      options?.promptHandler,
    );
};

export const parsePiPackCommand = (command: string): string[] => {
  const [binary, ...args] = command.trim().split(/\s+/);

  if (binary !== "pi-pack") throw new Error(`Expected pi-pack command, got: ${command}`);
  return args;
};

export const runPiPack = async (
  cwd: string,
  agentDir: string,
  args: string[],
  promptHandler?: PromptHandler,
): Promise<RunResult> => {
  const output = createCapturedOutput();
  const runArgs = readCliRunArgs(args);
  await withAgentDir(agentDir, async () => {
    await run(
      app,
      normalizeRootHelpArgs(runArgs.args),
      createContext(cwd, output, runArgs.verbose, promptHandler),
    );
  });
  return { stdout: output.readStdout(), stderr: output.readStderr() };
};

const createContext = (
  cwd: string,
  output: CapturedOutput,
  verbose: boolean,
  promptHandler?: PromptHandler,
): LocalContext => ({
  ...buildContext(process, cwd, { verbose }),
  process: { ...process, stdout: output.stdout, stderr: output.stderr } as NodeJS.Process,
  promptHandler,
});

const createCapturedOutput = (): CapturedOutput => {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  return {
    stdout: createWritable(stdoutChunks),
    stderr: createWritable(stderrChunks),
    readStdout: () => stdoutChunks.join(""),
    readStderr: () => stderrChunks.join(""),
  };
};

const createWritable = (chunks: string[]): Writable =>
  new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });

const withAgentDir = async (agentDir: string, callback: () => Promise<void>): Promise<void> =>
  withEnvVar("PI_CODING_AGENT_DIR", agentDir, callback);
