import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const withTempDir = async <T>(callback: (dir: string) => Promise<T> | T): Promise<T> => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pi-pack-"));

  try {
    return await callback(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
