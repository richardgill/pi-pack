import { expect, test } from "vite-plus/test";
import type { LocalContext } from "~/context";
import type { PromptHandler } from "~/testing/prompt-testing-types";
import { canPrompt } from "./prompts";

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

test("canPrompt allows test prompt handlers in CI", () => {
  expect(canPrompt(createContext({ CI: "true" }, { promptHandler }))).toBe(true);
});

test("canPrompt rejects non-interactive CI without a prompt handler", () => {
  expect(canPrompt(createContext({ CI: "true" }))).toBe(false);
});

test("canPrompt rejects AI agents even with an interactive input", () => {
  expect(canPrompt(createContext({ CLAUDECODE: "1" }, { isTTY: true }))).toBe(false);
});

test("canPrompt allows interactive human terminals", () => {
  expect(canPrompt(createContext({}, { isTTY: true }))).toBe(true);
});
