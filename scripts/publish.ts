import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

type Mode = "release" | "preview";

const run = (command: string, args: string[]) =>
  new Promise<number>((resolve) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("close", (exitCode) => resolve(exitCode ?? 1));
  });

const getArg = (name: string) =>
  process.argv.find((arg) => arg.startsWith(`${name}=`))?.split("=")[1];

const parseMode = (value: string | undefined): Mode => {
  if (value === "release" || value === "preview") {
    return value;
  }

  throw new Error("--mode=release|preview is required");
};

const isPublished = async (name: string, version: string) => {
  const child = spawn("npm", ["view", `${name}@${version}`, "version"], {
    stdio: "ignore",
  });
  return (
    (await new Promise<number>((resolve) =>
      child.on("close", (exitCode) => resolve(exitCode ?? 1)),
    )) === 0
  );
};

const writeVersion = async (version: string) => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  pkg.version = version;
  await writeFile("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  return pkg.name as string;
};

const getPublishTag = (mode: Mode, pr: string | undefined) => {
  if (mode === "release") {
    return "latest";
  }

  if (!pr) {
    throw new Error("--pr=NUMBER is required for preview mode");
  }

  return `pr-${pr}`;
};

const publish = async (name: string, version: string, tag: string) => {
  if (await isPublished(name, version)) {
    console.log(`${name}@${version} already published, skipping`);
    return;
  }

  const exitCode = await run("npm", ["publish", "--access", "public", "--tag", tag]);
  process.exit(exitCode);
};

const main = async () => {
  const mode = parseMode(getArg("--mode"));
  const version = getArg("--version");

  if (!version) {
    throw new Error("--version=VERSION is required");
  }

  const name = await writeVersion(version);
  const tag = getPublishTag(mode, getArg("--pr"));
  await publish(name, version, tag);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
