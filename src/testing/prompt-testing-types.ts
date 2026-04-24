export const acceptDefault = Symbol("acceptDefault");
export const cancel = Symbol("cancel");

export type PromptResponse = string | boolean | typeof acceptDefault | typeof cancel;

type TextPromptInfo = {
  type: "text";
  message: string;
  placeholder?: string;
  defaultValue?: string;
};

type ConfirmPromptInfo = {
  type: "confirm";
  message: string;
  initialValue?: boolean;
};

type SelectPromptInfo = {
  type: "select";
  message: string;
  options: Array<{ value: string; label: string }>;
};

export type PromptInfo = TextPromptInfo | ConfirmPromptInfo | SelectPromptInfo;

export type RecordedPrompt = PromptInfo & {
  response: string | boolean;
};

export type PromptHandler = (prompt: PromptInfo) => PromptResponse | Promise<PromptResponse>;
