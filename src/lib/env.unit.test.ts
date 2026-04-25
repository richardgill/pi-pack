import { expect, test } from "vite-plus/test";
import type { LocalContext } from "~/context";
import { isAiAgent } from "./env";

const createContext = (env: NodeJS.ProcessEnv): LocalContext =>
  ({
    process: { env },
  }) as unknown as LocalContext;

test("isAiAgent detects pi coding agent sessions", () => {
  expect(isAiAgent(createContext({ PI_CODING_AGENT: "true" }))).toBe(true);
});
