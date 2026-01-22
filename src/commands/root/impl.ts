export type RootFlags = Record<string, never>;

export type RootArgs = [];

export const runRoot = (flags: RootFlags): void => {
  void flags;
};
