import { resolve } from "node:path";
import { defineConfig } from "vite";
import nodeExternals from "rollup-plugin-node-externals";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      "npm:unzipit": "unzipit",
      "npm:@napi-rs/canvas": "@napi-rs/canvas",
      "npm:object-fit-math": "object-fit-math",
      [resolve(__dirname, "../src/libs/argonHash.deno.ts")]: resolve(
        __dirname,
        "../src/libs/argonHash.node.ts"
      ),
    },
  },
  build: {
    outDir: "node",
    lib: {
      entry: resolve(__dirname, "mod_node.ts"),
      name: "index",
      fileName: "index",
    },
    rollupOptions: {
      externals: ["argon2", "blake2b"],
    },
  },
  plugins: [
    {
      ...nodeExternals(),
      enforce: "pre",
    },
    dts({ rollupTypes: false }),
  ],
});
