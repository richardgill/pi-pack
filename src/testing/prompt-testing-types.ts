export const acceptDefault = Symbol("acceptDefault");
export const cancel = Symbol("cancel");

export type PromptResponse = string | boolean | string[] | typeof acceptDefault | typeof cancel;

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

type MultiselectPromptInfo = {
  type: "multiselect";
  message: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  required?: boolean;
};

export type PromptInfo =
  | TextPromptInfo
  | ConfirmPromptInfo
  | SelectPromptInfo
  | MultiselectPromptInfo;

export type RecordedPrompt = PromptInfo & {
  response: string | boolean | string[];
};

export type PromptHandler = (prompt: PromptInfo) => PromptResponse | Promise<PromptResponse>;
