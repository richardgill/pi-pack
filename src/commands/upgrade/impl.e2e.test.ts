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
  updateExtensionPackageVersion,
} from "~/testing/extension-package";
import { withEnvVar } from "~/testing/env";
import { expectFileTree } from "~/testing/fs";
import { withTempDir } from "~/testing/temp-dir";

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
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const source = packExtensionPackage(packageRoot, cwd);
    await run(`pi-pack install ${source}`);
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    packExtensionPackage(packageRoot, cwd);

    const result = await run("pi-pack upgrade files");

    const extensionRoot = path.join(agentDir, "extensions", "files");
    expect(result.stdout).toContain("Upgraded files");
    expect(readInstalledPackageVersion(extensionRoot, "files")).toBe("2.0.0");
  });
});

test("pi-pack upgrade --bump upgrades to latest and rewrites dependency range", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const first = packRegistryVersion(packageRoot, cwd, "1.0.0");
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    const second = packRegistryVersion(packageRoot, cwd, "2.0.0");

    await withPackageRegistry("files", [first, second], async (registryUrl) => {
      await withEnvVar("NPM_CONFIG_REGISTRY", registryUrl, async () => {
        await run("pi-pack install npm:files@^1.0.0");

        const extensionRoot = path.join(agentDir, "extensions", "files");
        const result = await run("pi-pack upgrade --bump files");

        expect(result.stdout).toContain("Upgraded files");
        expect(readInstalledPackageVersion(extensionRoot, "files")).toBe("2.0.0");
        expectFileTree(extensionRoot, {
          files: { "package.json": { json: { dependencies: { files: "^2.0.0" } } } },
        });
      });
    });
  });
});

test("pi-pack upgrade selected extension names", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const filesRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const tasksRoot = createExtensionPackage(cwd, "tasks", "1.0.0");
    const filesSource = packExtensionPackage(filesRoot, cwd);
    const tasksSource = packExtensionPackage(tasksRoot, cwd);
    await run(`pi-pack install ${filesSource}`);
    await run(`pi-pack install ${tasksSource}`);
    updateExtensionPackageVersion(filesRoot, "files", "2.0.0");
    updateExtensionPackageVersion(tasksRoot, "tasks", "3.0.0");
    packExtensionPackage(filesRoot, cwd);
    packExtensionPackage(tasksRoot, cwd);

    const result = await run("pi-pack upgrade files tasks");

    expect(result.stdout).toContain("Upgraded files");
    expect(result.stdout).toContain("Upgraded tasks");
  });
}, 20_000);

test("pi-pack upgrade preserves the user's config.ts", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const source = packExtensionPackage(packageRoot, cwd);
    await run(`pi-pack install ${source}`);

    const extensionRoot = path.join(agentDir, "extensions", "files");
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    packExtensionPackage(packageRoot, cwd);

    const result = await run("pi-pack upgrade", { cwd: extensionRoot });

    expect(result.stdout).toContain("Upgraded files");
    expectFileTree(extensionRoot, {
      files: { "config.ts": 'export default "files@1.0.0";\n' },
    });
    expect(readInstalledPackageVersion(extensionRoot, "files")).toBe("2.0.0");
  });
});

test("pi-pack upgrade upgrades all installed extensions", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const filesRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const tasksRoot = createExtensionPackage(cwd, "tasks", "1.0.0");
    const filesSource = packExtensionPackage(filesRoot, cwd);
    const tasksSource = packExtensionPackage(tasksRoot, cwd);
    await run(`pi-pack install ${filesSource}`);
    await run(`pi-pack install ${tasksSource}`);
    updateExtensionPackageVersion(filesRoot, "files", "2.0.0");
    updateExtensionPackageVersion(tasksRoot, "tasks", "3.0.0");
    packExtensionPackage(filesRoot, cwd);
    packExtensionPackage(tasksRoot, cwd);

    const result = await run("pi-pack upgrade");

    expect(result.stdout).toContain("Upgraded files");
    expect(result.stdout).toContain("Upgraded tasks");
    expect(readInstalledPackageVersion(path.join(agentDir, "extensions", "files"), "files")).toBe(
      "2.0.0",
    );
    expect(readInstalledPackageVersion(path.join(agentDir, "extensions", "tasks"), "tasks")).toBe(
      "3.0.0",
    );
  });
}, 20_000);

test("pi-pack upgrade reports successes and failures", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const source = packExtensionPackage(packageRoot, cwd);
    await run(`pi-pack install ${source}`);
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    packExtensionPackage(packageRoot, cwd);

    const brokenRoot = path.join(agentDir, "extensions", "z-broken");
    mkdirSync(brokenRoot, { recursive: true });
    writeJson(path.join(brokenRoot, "package.json"), {
      private: true,
      type: "module",
      "pi-pack": { managed: true },
    });

    const result = await run("pi-pack upgrade");

    expect(result.stdout).toContain("Upgraded files");
    expect(result.stderr).toContain("Failed z-broken");
    expect(result.stderr).toContain("No dependencies found");
  });
});

test("pi-pack upgrade rejects managed extensions with multiple dependencies", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const extensionRoot = path.join(agentDir, "extensions", "multi");
    mkdirSync(extensionRoot, { recursive: true });
    writeJson(path.join(extensionRoot, "package.json"), {
      private: true,
      type: "module",
      dependencies: { files: "1.0.0", tasks: "1.0.0" },
      "pi-pack": { managed: true },
    });

    const result = await run("pi-pack upgrade multi");

    expect(result.stderr).toContain("Expected one dependency");
    expect(result.stderr).toContain("found 2: files, tasks");
  });
});

test("pi-pack upgrade rejects managed extensions with non-pi-pack dependencies", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const extensionRoot = path.join(agentDir, "extensions", "not-extension");
    mkdirSync(path.join(extensionRoot, "node_modules", "not-extension"), { recursive: true });
    writeJson(path.join(extensionRoot, "package.json"), {
      private: true,
      type: "module",
      dependencies: { "not-extension": "1.0.0" },
      "pi-pack": { managed: true },
    });
    writeJson(path.join(extensionRoot, "node_modules", "not-extension", "package.json"), {
      name: "not-extension",
      version: "1.0.0",
      type: "module",
    });

    const result = await run("pi-pack upgrade not-extension");

    expect(result.stderr).toContain("Expected dependency to be a pi-pack extension");
  });
});

test("pi-pack upgrade skips extensions not managed by pi-pack", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const packageRoot = createExtensionPackage(cwd, "files", "1.0.0");
    const source = packExtensionPackage(packageRoot, cwd);
    await run(`pi-pack install ${source}`);
    updateExtensionPackageVersion(packageRoot, "files", "2.0.0");
    packExtensionPackage(packageRoot, cwd);

    const unmanagedRoot = path.join(agentDir, "extensions", "skill-task");
    mkdirSync(unmanagedRoot, { recursive: true });
    writeJson(path.join(unmanagedRoot, "package.json"), {
      private: true,
      type: "module",
      dependencies: { "skill-task": "1.0.0" },
    });

    const result = await run("pi-pack upgrade");

    expect(result.stdout).toContain("Upgraded files");
    expect(result.stdout).not.toContain("skill-task");
  });
});

test("pi-pack upgrade errors when no extensions are installed", async () => {
  await withTempDir(async ({ run }) => {
    const result = await run("pi-pack upgrade");

    expect(result.stderr).toContain("No installed extensions found");
  });
});

test("pi-pack upgrade rejects unmanaged extension names", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const unmanagedRoot = path.join(agentDir, "extensions", "skill-task");
    mkdirSync(unmanagedRoot, { recursive: true });
    writeJson(path.join(unmanagedRoot, "package.json"), {
      private: true,
      type: "module",
      dependencies: { "skill-task": "1.0.0" },
    });

    const result = await run("pi-pack upgrade skill-task");

    expect(result.stderr).toContain(`Installed pi-pack extension not found: ${unmanagedRoot}`);
  });
});

test("pi-pack upgrade rejects unsafe extension names", async () => {
  await withTempDir(async ({ run }) => {
    const result = await run("pi-pack upgrade ../outside");

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: ../outside.",
    );
  });
});
