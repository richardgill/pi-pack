import { Writable } from "node:stream";
import { run } from "@stricli/core";
import { app } from "~/app";
import { buildContext, type LocalContext } from "~/context";
import { normalizeRootHelpArgs } from "~/lib/root-help";
import { withEnvVar } from "./env";
import type { PromptHandler } from "./prompt-testing-types";

export type RunResult = {
  stdout: string;
  stderr: string;
};

type CapturedOutput = {
  stdout: Writable;
  stderr: Writable;
  readStdout: () => string;
  readStderr: () => string;
};

export const runPiPack = async (
  cwd: string,
  agentDir: string,
  args: string[],
  promptHandler?: PromptHandler,
): Promise<RunResult> => {
  const output = createCapturedOutput();
  await withAgentDir(agentDir, async () => {
    await run(app, normalizeRootHelpArgs(args), createContext(cwd, output, promptHandler));
  });
  return { stdout: output.readStdout(), stderr: output.readStderr() };
};

const createContext = (
  cwd: string,
  output: CapturedOutput,
  promptHandler?: PromptHandler,
): LocalContext => ({
  ...buildContext(process, cwd),
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
