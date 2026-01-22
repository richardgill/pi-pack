export type UpdateFlags = {
  all?: boolean;
};

export type UpdateArgs = [extensionName?: string];

export const runUpdate = (flags: UpdateFlags, extensionName?: string): void => {
  void flags;
  void extensionName;
};
