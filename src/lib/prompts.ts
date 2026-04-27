import * as clackPrompts from "@clack/prompts";
import type { LocalContext } from "~/context";
import { isAiAgent, isCI } from "~/lib/env";
import {
  acceptDefault,
  cancel,
  type PromptHandler,
  type PromptInfo,
  type RecordedPrompt,
} from "~/testing/prompt-testing-types";

const testCancelSymbol = Symbol("test:cancel");

type TextOpts = Omit<Parameters<typeof clackPrompts.text>[0], "input" | "output">;
type ConfirmOpts = Omit<Parameters<typeof clackPrompts.confirm>[0], "input" | "output">;
type SelectOpts = { message: string; options: Array<{ value: string; label: string }> };
type MultiselectOpts = {
  message: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  required?: boolean;
};

export type Prompts = {
  text: (opts: TextOpts) => Promise<string | symbol>;
  confirm: (opts: ConfirmOpts) => Promise<boolean | symbol>;
  select: (opts: SelectOpts) => Promise<string | symbol>;
  multiselect: (opts: MultiselectOpts) => Promise<string[] | symbol>;
  isCancel: (value: unknown) => value is symbol;
  log: typeof clackPrompts.log;
  outro: typeof clackPrompts.outro;
};

export type Spinner = {
  start: (message?: string) => void;
  stop: (message?: string) => void;
};

const NOOP_SPINNER: Spinner = {
  start: () => {},
  stop: () => {},
};

export const createSpinner = (context: LocalContext): Spinner => {
  if (!canPrompt(context)) return NOOP_SPINNER;
  if (context.promptHandler !== undefined) return NOOP_SPINNER;
  return clackPrompts.spinner({ output: context.promptOutput });
};

export const maybeCreatePrompts = (context: LocalContext): Prompts | undefined => {
  if (!canPrompt(context)) return undefined;
  return createPrompts(context);
};

export const createPrompts = (context: LocalContext): Prompts => {
  if (context.promptHandler !== undefined) {
    return createTestablePrompts(context.promptHandler, context.onPromptRecord);
  }
  return createClackPrompts(context);
};

const createClackPrompts = (context: LocalContext): Prompts => {
  const streamOpts = { input: context.promptInput, output: context.promptOutput };
  return {
    text: (opts) => clackPrompts.text({ ...opts, ...streamOpts }),
    confirm: (opts) => clackPrompts.confirm({ ...opts, ...streamOpts }),
    select: (opts) => clackPrompts.select({ ...opts, ...streamOpts }),
    multiselect: (opts) => clackPrompts.multiselect({ ...opts, ...streamOpts }),
    isCancel: clackPrompts.isCancel,
    log: clackPrompts.log,
    outro: clackPrompts.outro,
  };
};

const createTestablePrompts = (
  promptHandler: PromptHandler,
  onPromptRecord?: (prompt: RecordedPrompt) => void,
): Prompts => {
  const dispatch = <T extends string | boolean | string[]>(
    promptInfo: PromptInfo,
    defaultValue?: T,
  ): Promise<T | symbol> =>
    processPromptResponse<T>(promptHandler, onPromptRecord, promptInfo, defaultValue);

  return {
    text: (opts) =>
      dispatch<string>(
        {
          type: "text",
          message: opts.message as string,
          placeholder: opts.placeholder,
          defaultValue: opts.initialValue,
        },
        opts.initialValue,
      ),
    confirm: (opts) =>
      dispatch<boolean>(
        { type: "confirm", message: opts.message as string, initialValue: opts.initialValue },
        opts.initialValue,
      ),
    select: (opts) =>
      dispatch<string>({ type: "select", message: opts.message, options: opts.options }),
    multiselect: (opts) =>
      dispatch<string[]>({
        type: "multiselect",
        message: opts.message,
        options: opts.options,
        required: opts.required,
      }),
    isCancel: (value: unknown): value is symbol =>
      clackPrompts.isCancel(value) || value === testCancelSymbol,
    log: clackPrompts.log,
    outro: clackPrompts.outro,
  };
};

const processPromptResponse = async <T extends string | boolean | string[]>(
  promptHandler: PromptHandler,
  onPromptRecord: ((prompt: RecordedPrompt) => void) | undefined,
  promptInfo: PromptInfo,
  defaultValue: T | undefined,
): Promise<T | symbol> => {
  const response = await promptHandler(promptInfo);

  if (response === cancel) {
    onPromptRecord?.({ ...promptInfo, response: "cancelled" });
    return testCancelSymbol;
  }
  if (response !== acceptDefault) {
    onPromptRecord?.({ ...promptInfo, response: response as T });
    return response as T;
  }
  if (defaultValue !== undefined) {
    onPromptRecord?.({ ...promptInfo, response: "default" });
    return defaultValue;
  }
  throw new Error(`acceptDefault used but prompt has no default value: ${promptInfo.message}`);
};

export const canPrompt = (context: LocalContext): boolean => {
  if (context.promptHandler !== undefined) return true;
  if (isCI(context) || isAiAgent(context)) return false;
  return isPromptInputTTY(context);
};

const isPromptInputTTY = (context: LocalContext): boolean => {
  const inputStream = context.promptInput as { readonly isTTY?: boolean } | undefined;
  return inputStream?.isTTY === true;
};
