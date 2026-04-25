import { mkdirSync } from "node:fs";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { readJson, writeJson } from "~/lib/json";
import {
  createExtensionPackage,
  packExtensionPackage,
  packExtensionPackageForRegistry,
  type PackedExtensionPackage,
  readText,
  updateExtensionPackageVersion,
} from "~/testing/extension-package";
import { withEnvVar } from "~/testing/env";
import { runPiPack } from "~/testing/pi-pack";
import { withTempDir } from "~/testing/temp-dir";

const runInstall = async (cwd: string, agentDir: string, args: string[]) =>
  runPiPack(cwd, agentDir, ["install", ...args]);

const runUpgrade = async (cwd: string, agentDir: string, args: string[]) =>
  runPiPack(cwd, agentDir, ["upgrade", ...args]);

const readInstalledPackageVersion = (extensionRoot: string, packageName: string): string =>
  readJson<{ version: string }>(
    path.join(extensionRoot, "node_modules", packageName, "package.json"),
  ).version;

type RegistryPackageVersion = PackedExtensionPackage & {
  version: string;
};

const withPackageRegistry = async (
  packageName: string,
  versions: RegistryPackageVersion[],
  callback: (registryUrl: string) => Promise<void>,
): Promise<void> => {
  const server = createPackageRegistryServer(packageName, versions);
  await listen(server);

  try {
    await callback(readServerUrl(server));
  } finally {
    await closeServer(server);
  }
};

const createPackageRegistryServer = (
  packageName: string,
  versions: RegistryPackageVersion[],
): Server =>
  createServer((request, response) => {
    handleRegistryRequest(packageName, versions, request.url, response);
  });

const handleRegistryRequest = (
  packageName: string,
  versions: RegistryPackageVersion[],
  requestUrl: string | undefined,
  response: ServerResponse,
): void => {
  if (requestUrl === `/${packageName}`) {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(createRegistryMetadata(packageName, versions)));
    return;
  }

  const version = versions.find(({ fileName }) => requestUrl === `/${packageName}/-/${fileName}`);
  if (version !== undefined) {
    response.end(version.tarball);
    return;
  }

  response.statusCode = 404;
  response.end(`Not found: ${requestUrl ?? ""}`);
};

const createRegistryMetadata = (
  packageName: string,
  versions: RegistryPackageVersion[],
): unknown => ({
  name: packageName,
  "dist-tags": { latest: readLatestVersion(versions) },
  versions: Object.fromEntries(
    versions.map((version) => [
      version.version,
      {
        name: packageName,
        version: version.version,
        dist: { tarball: `${readRegistryOrigin()}/${packageName}/-/${version.fileName}` },
      },
    ]),
  ),
});

const readRegistryOrigin = (): string => process.env["NPM_CONFIG_REGISTRY"] ?? "";

const readLatestVersion = (versions: RegistryPackageVersion[]): string => {
  const latest = versions[versions.length - 1];
  if (latest !== undefined) return latest.version;
  throw new Error("Registry needs at least one package version.");
};

const listen = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const readServerUrl = (server: Server): string => {
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Missing registry port.");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
};

const packRegistryVersion = (
  packageRoot: string,
  destinationRoot: string,
  version: string,
): RegistryPackageVersion => ({
  version,
  ...packExtensionPackageForRegistry(packageRoot, destinationRoot),
});

test("pi-pack upgrade extension-name upgrades the installed dependency", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const source = packExtensionPackage(packageRoot, cwd);
    await runInstall(cwd, agentDir, [source]);
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    packExtensionPackage(packageRoot, cwd);

    const result = await runUpgrade(cwd, agentDir, ["files"]);

    const extensionRoot = path.join(agentDir, "extensions", "files");
    expect(result.stdout).toContain("Upgraded files");
    expect(readInstalledPackageVersion(extensionRoot, "files")).toBe("2.0.0");
  });
});

test("pi-pack upgrade --bump upgrades to latest and rewrites dependency range", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const first = packRegistryVersion(packageRoot, cwd, "1.0.0");
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    const second = packRegistryVersion(packageRoot, cwd, "2.0.0");

    await withPackageRegistry("files", [first, second], async (registryUrl) => {
      await withEnvVar("NPM_CONFIG_REGISTRY", registryUrl, async () => {
        await runInstall(cwd, agentDir, ["npm:files@^1.0.0"]);

        const extensionRoot = path.join(agentDir, "extensions", "files");
        const result = await runUpgrade(cwd, agentDir, ["--bump", "files"]);

        expect(result.stdout).toContain("Upgraded files");
        expect(readInstalledPackageVersion(extensionRoot, "files")).toBe("2.0.0");
        expect(readJson(path.join(extensionRoot, "package.json"))).toMatchObject({
          dependencies: { files: "^2.0.0" },
        });
      });
    });
  });
});

test("pi-pack upgrade selected extension names", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const filesRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const tasksRoot = createExtensionPackage(cwd, "tasks", "1.0.0");
    const filesSource = packExtensionPackage(filesRoot, cwd);
    const tasksSource = packExtensionPackage(tasksRoot, cwd);
    await runInstall(cwd, agentDir, [filesSource]);
    await runInstall(cwd, agentDir, [tasksSource]);
    updateExtensionPackageVersion(filesRoot, "files", "2.0.0");
    updateExtensionPackageVersion(tasksRoot, "tasks", "3.0.0");
    packExtensionPackage(filesRoot, cwd);
    packExtensionPackage(tasksRoot, cwd);

    const result = await runUpgrade(cwd, agentDir, ["files", "tasks"]);

    expect(result.stdout).toContain("Upgraded files");
    expect(result.stdout).toContain("Upgraded tasks");
  });
});

test("pi-pack upgrade preserves the user's config.ts", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const source = packExtensionPackage(packageRoot, cwd);
    await runInstall(cwd, agentDir, [source]);

    const extensionRoot = path.join(agentDir, "extensions", "files");
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    packExtensionPackage(packageRoot, cwd);

    const result = await runUpgrade(extensionRoot, agentDir, []);

    expect(result.stdout).toContain("Upgraded files");
    expect(readText(extensionRoot, "config.ts")).toBe('export default "files@1.0.0";\n');
    expect(readInstalledPackageVersion(extensionRoot, "files")).toBe("2.0.0");
  });
});

test("pi-pack upgrade upgrades all installed extensions", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const filesRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const tasksRoot = createExtensionPackage(cwd, "tasks", "1.0.0");
    const filesSource = packExtensionPackage(filesRoot, cwd);
    const tasksSource = packExtensionPackage(tasksRoot, cwd);
    await runInstall(cwd, agentDir, [filesSource]);
    await runInstall(cwd, agentDir, [tasksSource]);
    updateExtensionPackageVersion(filesRoot, "files", "2.0.0");
    updateExtensionPackageVersion(tasksRoot, "tasks", "3.0.0");
    packExtensionPackage(filesRoot, cwd);
    packExtensionPackage(tasksRoot, cwd);

    const result = await runUpgrade(cwd, agentDir, []);

    expect(result.stdout).toContain("Upgraded files");
    expect(result.stdout).toContain("Upgraded tasks");
    expect(readInstalledPackageVersion(path.join(agentDir, "extensions", "files"), "files")).toBe(
      "2.0.0",
    );
    expect(readInstalledPackageVersion(path.join(agentDir, "extensions", "tasks"), "tasks")).toBe(
      "3.0.0",
    );
  });
});

test("pi-pack upgrade reports successes and failures", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const source = packExtensionPackage(packageRoot, cwd);
    await runInstall(cwd, agentDir, [source]);
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    packExtensionPackage(packageRoot, cwd);

    const brokenRoot = path.join(agentDir, "extensions", "z-broken");
    mkdirSync(brokenRoot, { recursive: true });
    writeJson(path.join(brokenRoot, "package.json"), {
      private: true,
      type: "module",
      "pi-pack": { managed: true },
    });

    const result = await runUpgrade(cwd, agentDir, []);

    expect(result.stdout).toContain("Upgraded files");
    expect(result.stderr).toContain("Failed z-broken");
    expect(result.stderr).toContain("No dependencies found");
  });
});

test("pi-pack upgrade skips extensions not managed by pi-pack", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const source = packExtensionPackage(packageRoot, cwd);
    await runInstall(cwd, agentDir, [source]);
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    packExtensionPackage(packageRoot, cwd);

    const unmanagedRoot = path.join(agentDir, "extensions", "skill-task");
    mkdirSync(unmanagedRoot, { recursive: true });
    writeJson(path.join(unmanagedRoot, "package.json"), {
      private: true,
      type: "module",
      dependencies: { "skill-task": "1.0.0" },
    });

    const result = await runUpgrade(cwd, agentDir, []);

    expect(result.stdout).toContain("Upgraded files");
    expect(result.stdout).not.toContain("skill-task");
  });
});

test("pi-pack upgrade errors when no extensions are installed", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");

    const result = await runUpgrade(cwd, agentDir, []);

    expect(result.stderr).toContain("No installed extensions found");
  });
});

test("pi-pack upgrade rejects unmanaged extension names", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const unmanagedRoot = path.join(agentDir, "extensions", "skill-task");
    mkdirSync(unmanagedRoot, { recursive: true });
    writeJson(path.join(unmanagedRoot, "package.json"), {
      private: true,
      type: "module",
      dependencies: { "skill-task": "1.0.0" },
    });

    const result = await runUpgrade(cwd, agentDir, ["skill-task"]);

    expect(result.stderr).toContain(`Installed pi-pack extension not found: ${unmanagedRoot}`);
  });
});

test("pi-pack upgrade rejects unsafe extension names", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");

    const result = await runUpgrade(cwd, agentDir, ["../outside"]);

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: ../outside.",
    );
  });
});
