// Make stricli show root help for empty args: `pi-pack --help` becomes `pi-pack`.
// Command help still passes through unchanged: `pi-pack init --help` stays as-is.
export const normalizeRootHelpArgs = (args: string[]): string[] => {
  if (args.length !== 1) return args;
  return isHelpFlag(args[0]) ? [] : args;
};

const isHelpFlag = (arg: string): boolean => arg === "--help" || arg === "-h";
