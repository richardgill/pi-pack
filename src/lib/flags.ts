export type VerboseFlags = {
  verbose?: boolean;
};

export const verboseFlag = {
  kind: "boolean",
  brief: "Show verbose logging",
  optional: true,
} as const;
