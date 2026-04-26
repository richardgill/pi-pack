import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPiPackTestRunner, type RunPiPackCommand } from "./pi-pack";

export type TempDirContext = {
  cwd: string;
  run: RunPiPackCommand;
};

export const withTempDir = async <T>(
  callback: (context: TempDirContext) => Promise<T> | T,
): Promise<T> => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "pi-pack-"));

  try {
    return await callback(createTempDirContext(cwd));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
};

const createTempDirContext = (cwd: string): TempDirContext => ({
  cwd,
  run: createPiPackTestRunner(cwd),
});
