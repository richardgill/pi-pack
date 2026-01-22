export type InstallFlags = {
  path?: string;
  name?: string;
  force?: boolean;
};

export type InstallArgs = [source: string];

export const runInstall = (flags: InstallFlags, source: string): void => {
  void flags;
  void source;
};
