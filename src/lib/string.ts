export const toPascalCase = (value: string): string => {
  const words = value.match(/[a-zA-Z0-9]+/g) ?? ["Extension"];
  return words.map(capitalize).join("");
};

const capitalize = (value: string): string => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
