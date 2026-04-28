export const formatMissingRequiredInputs = (inputs: string[]): string =>
  [`Missing required non-interactive input:`, ...inputs.map((input) => `- ${input}`)].join("\n");
