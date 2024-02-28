import { build, emptyDir } from "https://deno.land/x/dnt@0.40.0/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  esModule: true,
  scriptModule: false,
  typeCheck: false,
  filterDiagnostic: (diagnostic) => {
    if (diagnostic.code === 4060) return false;
    return true;
  },
  shims: {
    deno: true,
    blob: true,
  },
  compilerOptions: {
    lib: ["DOM"],
  },
  test: false,
  mappings: {
    "./src/libs/argonHash_deno.ts": "./src/libs/argonHash_node.ts",
  },
  importMap: "deno.json",
  package: {
    name: "novelai-api",
    version: Deno.args[0],
    description:
      "Boolean function that returns whether or not parameter is the number 42",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/lambtron/is-42.git",
    },
    bugs: {
      url: "https://github.com/lambtron/is-42/issues",
    },
    dependencies: {
      argon2: "^0.40.1",
      blake2b: "^2.1.4",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
