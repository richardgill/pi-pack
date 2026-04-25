export const normalizeRootHelpArgs = (args: string[]): string[] => {
  if (args.length !== 1) return args;
  return isRootHelpArg(args[0]) ? [] : args;
};

const isRootHelpArg = (arg: string): boolean => arg === "--help" || arg === "-h";
