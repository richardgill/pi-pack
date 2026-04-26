// Mirrors es-toolkit's pascalCase.
// https://github.com/toss/es-toolkit/blob/main/src/string/pascalCase.ts
export const toPascalCase = (value: string): string => words(value).map(capitalize).join("");

// Mirrors es-toolkit's words / CASE_SPLIT_PATTERN.
// https://github.com/toss/es-toolkit/blob/main/src/string/words.ts
const CASE_SPLIT_PATTERN =
  /\p{Lu}?\p{Ll}+|[0-9]+|\p{Lu}+(?!\p{Ll})|\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{L}+/gu;

const words = (value: string): string[] => Array.from(value.match(CASE_SPLIT_PATTERN) ?? []);

// Mirrors es-toolkit's capitalize.
// https://github.com/toss/es-toolkit/blob/main/src/string/capitalize.ts
export const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
