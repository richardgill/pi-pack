import type { PiPackPackageJson } from "~/lib/package-json";
import { toPascalCase } from "~/lib/string";

export const monorepoRootPackageJson = (
  name: string,
  extensionsDir: string,
): PiPackPackageJson => ({
  name,
  private: true,
  "pi-pack": {
    "extensions-dir": extensionsDir,
  },
});

export const extensionPackageJson = (name: string): PiPackPackageJson => ({
  name,
  type: "module",
  exports: {
    ".": "./src/extension.ts",
  },
  keywords: ["pi-package"],
  peerDependencies: {
    "@mariozechner/pi-coding-agent": "*",
  },
  "pi-pack": {
    "default-config": "./src/default-config.ts",
    "requires-config-edit": true,
  },
});

export const gitignore = (): string => "node_modules/\n";

export const standaloneExtensionReadme = (name: string): string => `# ${name}

<Describe what this pi extension does.>

## Install with pi-pack

Install \`pi-pack\` globally:

\`\`\`bash
npm install -g pi-pack
\`\`\`

<!-- Delete install options that do not apply before publishing. -->

\`\`\`bash
pi-pack install "npm:${name}"
pi-pack install "git:github.com/<user>/${name}"
pi-pack install "~/code/${name}"
\`\`\`


## Configure

\`\`\`ts
import { extension } from "${name}";

export default extension({
  commandName: "${name}",
});
\`\`\`
`;

export const monorepoReadme = (
  name: string,
  extensionsDir: string,
  extensionName = "<extension-name>",
): string => `# ${name}

<Describe this collection of pi extensions.>

## Extensions

- [\`${extensionName}\`](./${extensionsDir}/${extensionName}/README.md)

## Add another extension

\`\`\`bash
cd ${name}/
pi-pack create
\`\`\`
`;

export const monorepoExtensionReadme = (
  name: string,
  repoName: string,
  repoReadmePath: string,
): string => `# ${name}

<Describe what this pi extension does.>

Part of [\`${repoName}\`](${repoReadmePath}).

## Install with pi-pack

Install \`pi-pack\` globally:

\`\`\`bash
npm install -g pi-pack
\`\`\`

<!-- Delete install options that do not apply before publishing. -->

\`\`\`bash
pi-pack install "npm:${name}"
pi-pack install "git:github.com/<user>/${repoName}" --extension "${name}"
pi-pack install "~/code/${repoName}" --extension "${name}"
\`\`\`


## Configure

\`\`\`ts
import { extension } from "${name}";

export default extension({
  commandName: "${name}",
});
\`\`\`
`;

export const tsconfig = (): string =>
  `${JSON.stringify(
    {
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
      },
      include: ["src"],
    },
    null,
    2,
  )}\n`;

export const indexDotTs = (
  name: string,
): string => `import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export type ${toPascalCase(name)}Options = {
  commandName?: string;
};

export const extension = (options: ${toPascalCase(name)}Options = {}) => {
  const commandName = options.commandName ?? "${name}";

  return (pi: ExtensionAPI): void => {
    pi.registerCommand(commandName, {
      description: "Run the ${name} extension",
      handler: async (_args, ctx) => {
        ctx.ui.notify("${name} ran", "info");
      },
    });
  };
};
`;

export const defaultConfigSource = (name: string): string => `import { extension } from "${name}";

export default extension({
  commandName: "${name}",
});
`;
