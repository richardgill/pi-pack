import { fileURLToPath } from "node:url";

export const readmePath = fileURLToPath(new URL("../README.md", import.meta.url));
