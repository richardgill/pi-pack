// stricli is missing a string helper for string cli args
export const stringParser = (input: string): string => input;

export type CliRunArgs = {
  args: string[];
  verbose: boolean;
};

// Example: `pi-pack --verbose install npm:foo` becomes `{ args: ["install", "npm:foo"], verbose: true }`.
export const readCliRunArgs = (args: string[]): CliRunArgs => ({
  args: args.filter((arg) => arg !== "--verbose"),
  verbose: args.some((arg) => arg === "--verbose"),
});

// Make stricli show root help for empty args: `pi-pack --help` becomes `pi-pack`.
// Command help still passes through unchanged: `pi-pack init --help` stays as-is.
export const normalizeRootHelpArgs = (args: string[]): string[] => {
  if (args.length !== 1) return args;
  return isHelpFlag(args[0]) ? [] : args;
};

const isHelpFlag = (arg: string): boolean => arg === "--help" || arg === "-h";
