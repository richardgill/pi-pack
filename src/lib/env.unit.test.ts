import { expect, test } from "vite-plus/test";
import type { LocalContext } from "~/context";
import { isAiAgent, isCI } from "./env";

const createContext = (env: NodeJS.ProcessEnv): LocalContext =>
  ({
    process: { env },
  }) as unknown as LocalContext;

const aiAgentCases = [
  {
    name: "detects pi coding agent sessions",
    input: { PI_CODING_AGENT: "true" },
    expected: true,
  },
  {
    name: "detects Claude Code sessions",
    input: { CLAUDE_CODE: "true" },
    expected: true,
  },
  {
    name: "detects Cursor agent sessions",
    input: { CURSOR_AGENT: "true" },
    expected: true,
  },
];

aiAgentCases.forEach(({ name, input, expected }) => {
  test(`isAiAgent ${name}`, () => {
    expect(isAiAgent(createContext(input))).toBe(expected);
  });
});

const ciCases = [
  {
    name: "detects CI=true",
    input: { CI: "true" },
    expected: true,
  },
  {
    name: "detects CI=1",
    input: { CI: "1" },
    expected: true,
  },
  {
    name: "ignores other CI values",
    input: { CI: "false" },
    expected: false,
  },
];

ciCases.forEach(({ name, input, expected }) => {
  test(`isCI ${name}`, () => {
    expect(isCI(createContext(input))).toBe(expected);
  });
});
