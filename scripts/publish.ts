#!/usr/bin/env bun

// Usage:
//   bun run scripts/publish.ts --mode=release --version=1.0.0
//   bun run scripts/publish.ts --mode=preview --pr=123

import path from "node:path";
import { fileURLToPath } from "node:url";
import { $ } from "bun";
import { getVersion } from "../src/version";

type Mode = "release" | "preview";

type Config = {
  version: string;
  npmTag: string;
  mode: Mode;
  prNumber?: number;
};

const PLATFORM_PACKAGES = [
  "linux-x64",
  "linux-arm64",
  "darwin-x64",
  "darwin-arm64",
  "windows-x64",
];

const isVersionPublished = async (
  packageName: string,
  version: string,
): Promise<boolean> => {
  const result = await $`npm view ${packageName}@${version} version`
    .quiet()
    .nothrow();
  return result.exitCode === 0;
};

const parseArgs = async (): Promise<Config> => {
  const args = process.argv.slice(2);
  const mode = args.find((a) => a.startsWith("--mode="))?.split("=")[1] as Mode;
  const prArg = args.find((a) => a.startsWith("--pr="))?.split("=")[1];
  const versionArg = args
    .find((a) => a.startsWith("--version="))
    ?.split("=")[1];

  if (!mode || !["release", "preview"].includes(mode)) {
    throw new Error("--mode=release|preview is required");
  }

  if (mode === "preview" && !prArg) {
    throw new Error("--pr=NUMBER is required for preview mode");
  }

  const prNumber = prArg ? Number.parseInt(prArg, 10) : undefined;

  // If --version is passed, use it directly (workflow already computed full version)
  // Otherwise, compute preview version from package.json base version
  const version = await (async () => {
    if (versionArg) {
      return versionArg;
    }
    const baseVersion = await getVersion();
    if (mode === "preview") {
      const shortSha = (await $`git rev-parse --short HEAD`.text()).trim();
      return `${baseVersion}-pr.${prNumber}.${shortSha}`;
    }
    return baseVersion;
  })();

  const npmTag = mode === "preview" ? `pr-${prNumber}` : "latest";

  return { version, npmTag, mode, prNumber };
};

const prepareReleaseAssets = async () => {
  console.log("Preparing release assets...");

  await $`mkdir -p release`;

  await $`cp dist/pi-pack-linux-x64/bin/pi-pack release/pi-pack-linux-x64`;
  await $`cp dist/pi-pack-linux-arm64/bin/pi-pack release/pi-pack-linux-arm64`;
  await $`cp dist/pi-pack-darwin-x64/bin/pi-pack release/pi-pack-darwin-x64`;
  await $`cp dist/pi-pack-darwin-arm64/bin/pi-pack release/pi-pack-darwin-arm64`;
  await $`cp dist/pi-pack-windows-x64/bin/pi-pack.exe release/pi-pack-windows-x64.exe`;

  const originalCwd = process.cwd();
  process.chdir("release");

  await $`tar -czf pi-pack-linux-x64.tar.gz pi-pack-linux-x64`;
  await $`tar -czf pi-pack-linux-arm64.tar.gz pi-pack-linux-arm64`;
  await $`zip pi-pack-darwin-x64.zip pi-pack-darwin-x64`;
  await $`zip pi-pack-darwin-arm64.zip pi-pack-darwin-arm64`;
  await $`zip pi-pack-windows-x64.zip pi-pack-windows-x64.exe`;
  await $`sha256sum *.tar.gz *.zip > checksums.txt`;
  await $`rm -f pi-pack-linux-x64 pi-pack-linux-arm64 pi-pack-darwin-x64 pi-pack-darwin-arm64 pi-pack-windows-x64.exe`;

  process.chdir(originalCwd);

  console.log("  ✓ Release assets prepared");
};

const publishPlatformPackages = async (config: Config) => {
  console.log(`Publishing platform packages with tag ${config.npmTag}...`);

  const originalCwd = process.cwd();

  for (const platform of PLATFORM_PACKAGES) {
    const distDir = `dist/pi-pack-${platform}`;
    const npmName = `pi-pack-${platform}`;
    const pkgPath = `${distDir}/package.json`;

    if (await isVersionPublished(npmName, config.version)) {
      console.log(
        `  ⏭ ${npmName}@${config.version} already published, skipping`,
      );
      continue;
    }

    const pkg = await Bun.file(pkgPath).json();
    pkg.name = npmName;
    pkg.version = config.version;
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

    console.log(`  Publishing ${npmName}@${config.version}...`);
    process.chdir(distDir);
    await $`npm publish --access public --tag ${config.npmTag}`;
    process.chdir(originalCwd);
  }

  console.log("  ✓ Platform packages published");
};

const publishMainPackage = async (config: Config) => {
  console.log(`Publishing main package with tag ${config.npmTag}...`);

  const pkg = await Bun.file("package.json").json();

  if (await isVersionPublished(pkg.name, config.version)) {
    console.log(
      `  ⏭ ${pkg.name}@${config.version} already published, skipping`,
    );
    return;
  }

  pkg.version = config.version;
  pkg.optionalDependencies = Object.fromEntries(
    PLATFORM_PACKAGES.map((p) => [`pi-pack-${p}`, config.version]),
  );
  await Bun.write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

  await $`npm publish --access public --tag ${config.npmTag}`;

  console.log("  ✓ Main package published");
};

const main = async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  process.chdir(path.resolve(__dirname, ".."));

  const config = await parseArgs();

  console.log(`\nPublishing ${config.mode} v${config.version}\n`);

  await prepareReleaseAssets();
  await publishPlatformPackages(config);
  await publishMainPackage(config);

  console.log(`\n✓ Published ${config.mode} v${config.version}`);

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const fs = await import("node:fs");
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `version=${config.version}\nnpm_tag=${config.npmTag}\n`,
    );
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
