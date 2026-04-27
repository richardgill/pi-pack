import { expect, test } from "vite-plus/test";
import type { LocalContext } from "~/context";
import type { PromptHandler } from "~/testing/prompt-testing-types";
import { canPrompt, createSpinner } from "./prompts";

const promptHandler: PromptHandler = () => "value";

type CreateContextOptions = {
  promptHandler?: PromptHandler;
  isTTY?: boolean;
};

const createContext = (env: NodeJS.ProcessEnv, options: CreateContextOptions = {}): LocalContext =>
  ({
    process: { env },
    promptHandler: options.promptHandler,
    promptInput: { isTTY: options.isTTY },
  }) as unknown as LocalContext;

type CanPromptCase = {
  name: string;
  env: NodeJS.ProcessEnv;
  options: CreateContextOptions;
  expected: boolean;
};

const cases: CanPromptCase[] = [
  {
    name: "allows test prompt handlers in CI",
    env: { CI: "true" },
    options: { promptHandler },
    expected: true,
  },
  {
    name: "rejects non-interactive CI without a prompt handler",
    env: { CI: "true" },
    options: {},
    expected: false,
  },
  {
    name: "rejects AI agents even with an interactive input",
    env: { CLAUDECODE: "1" },
    options: { isTTY: true },
    expected: false,
  },
  {
    name: "allows interactive human terminals",
    env: {},
    options: { isTTY: true },
    expected: true,
  },
];

cases.forEach(({ name, env, options, expected }) => {
  test(`canPrompt ${name}`, () => {
    expect(canPrompt(createContext(env, options))).toBe(expected);
  });
});

test("createSpinner is a no-op when prompts are unavailable", () => {
  const spinner = createSpinner(createContext({ CI: "true" }));

  expect(() => {
    spinner.start("Working");
    spinner.stop("Done");
  }).not.toThrow();
});

test("createSpinner is a no-op for test prompt handlers", () => {
  const spinner = createSpinner(createContext({}, { promptHandler }));

  expect(() => {
    spinner.start("Working");
    spinner.stop("Done");
  }).not.toThrow();
});
