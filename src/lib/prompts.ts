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

type TestablePromptsOptions = {
  promptHandler: PromptHandler;
  onPromptRecord?: (prompt: RecordedPrompt) => void;
};

const createTestablePrompts = ({ promptHandler, onPromptRecord }: TestablePromptsOptions) => {
  return {
    text: async (opts: Omit<Parameters<typeof clackPrompts.text>[0], "input" | "output">) => {
      const promptInfo: PromptInfo = {
        type: "text",
        message: opts.message as string,
        placeholder: opts.placeholder,
        defaultValue: opts.initialValue,
      };
      return processPromptResponse(promptHandler, onPromptRecord, promptInfo, opts.initialValue);
    },

    confirm: async (opts: Omit<Parameters<typeof clackPrompts.confirm>[0], "input" | "output">) => {
      const promptInfo: PromptInfo = {
        type: "confirm",
        message: opts.message as string,
        initialValue: opts.initialValue,
      };
      return processPromptResponse(promptHandler, onPromptRecord, promptInfo, opts.initialValue);
    },

    select: async (opts: { message: string; options: Array<{ value: string; label: string }> }) => {
      const promptInfo: PromptInfo = {
        type: "select",
        message: opts.message,
        options: opts.options,
      };
      return processPromptResponse<string>(promptHandler, onPromptRecord, promptInfo, undefined);
    },

    multiselect: async (opts: {
      message: string;
      options: Array<{ value: string; label: string; hint?: string }>;
      required?: boolean;
    }) => {
      const promptInfo: PromptInfo = {
        type: "multiselect",
        message: opts.message,
        options: opts.options,
        required: opts.required,
      };
      return processPromptResponse<string[]>(promptHandler, onPromptRecord, promptInfo, undefined);
    },

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

  if (response === cancel)
    return recordPromptResponse<T>(onPromptRecord, promptInfo, "cancelled", testCancelSymbol);
  if (response !== acceptDefault)
    return recordPromptResponse<T>(onPromptRecord, promptInfo, response as T, response as T);
  if (defaultValue !== undefined)
    return recordPromptResponse<T>(onPromptRecord, promptInfo, "default", defaultValue);

  throw new Error(`acceptDefault used but prompt has no default value: ${promptInfo.message}`);
};

const recordPromptResponse = <T extends string | boolean | string[]>(
  onPromptRecord: ((prompt: RecordedPrompt) => void) | undefined,
  promptInfo: PromptInfo,
  actualResponse: T | "cancelled" | "default",
  returnValue: T | symbol,
): T | symbol => {
  onPromptRecord?.({ ...promptInfo, response: actualResponse });
  return returnValue;
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

export type Prompts = ReturnType<typeof createPrompts>;

export const maybeCreatePrompts = (context: LocalContext): Prompts | undefined => {
  if (!canPrompt(context)) return undefined;
  return createPrompts(context);
};

export const createPrompts = (context: LocalContext) => {
  if (context.promptHandler) {
    return createTestablePrompts({
      promptHandler: context.promptHandler,
      onPromptRecord: context.onPromptRecord,
    });
  }

  const streamOpts = {
    input: context.promptInput,
    output: context.promptOutput,
  };

  return {
    text: (opts: Omit<Parameters<typeof clackPrompts.text>[0], "input" | "output">) =>
      clackPrompts.text({ ...opts, ...streamOpts }),

    confirm: (opts: Omit<Parameters<typeof clackPrompts.confirm>[0], "input" | "output">) =>
      clackPrompts.confirm({ ...opts, ...streamOpts }),

    select: (opts: { message: string; options: Array<{ value: string; label: string }> }) =>
      clackPrompts.select({
        message: opts.message,
        options: opts.options.map((o) => ({ value: o.value, label: o.label })),
        ...streamOpts,
      }),

    multiselect: (opts: {
      message: string;
      options: Array<{ value: string; label: string; hint?: string }>;
      required?: boolean;
    }) =>
      clackPrompts.multiselect({
        message: opts.message,
        options: opts.options.map((o) => ({ value: o.value, label: o.label, hint: o.hint })),
        required: opts.required,
        ...streamOpts,
      }),

    isCancel: clackPrompts.isCancel,
    log: clackPrompts.log,
    outro: clackPrompts.outro,
  };
};
