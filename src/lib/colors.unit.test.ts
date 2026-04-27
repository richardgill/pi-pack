import { Chalk } from "chalk";
import { expect, test } from "vite-plus/test";
import { createColorTheme } from "./colors";

test("color theme is plain when colors are disabled", () => {
  const theme = createColorTheme(new Chalk({ level: 0 }));

  expect(theme.success("ok")).toBe("ok");
  expect(theme.failure("bad")).toBe("bad");
  expect(theme.warning("careful")).toBe("careful");
  expect(theme.accent("name")).toBe("name");
  expect(theme.muted("quiet")).toBe("quiet");
  expect(theme.label("Root:")).toBe("Root:");
  expect(theme.pathText("./files")).toBe("./files");
  expect(theme.heading("USAGE")).toBe("USAGE");
  expect(theme.command("pi-pack")).toBe("pi-pack");
  expect(theme.version("1.0.0")).toBe("1.0.0");
});

test("color theme applies semantic styles when colors are enabled", () => {
  const theme = createColorTheme(new Chalk({ level: 1 }));

  expect(theme.success("ok")).toBe("\u001B[32mok\u001B[39m");
  expect(theme.failure("bad")).toBe("\u001B[31mbad\u001B[39m");
  expect(theme.warning("careful")).toBe("\u001B[33mcareful\u001B[39m");
  expect(theme.accent("name")).toBe("\u001B[36mname\u001B[39m");
  expect(theme.muted("quiet")).toBe("\u001B[2mquiet\u001B[22m");
  expect(theme.heading("USAGE")).toBe("\u001B[1mUSAGE\u001B[22m");
});
