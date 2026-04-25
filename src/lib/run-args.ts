export type CliRunArgs = {
  args: string[];
  verbose: boolean;
};

export const readCliRunArgs = (args: string[]): CliRunArgs => ({
  args: args.filter((arg) => arg !== "--verbose"),
  verbose: args.some((arg) => arg === "--verbose"),
});
