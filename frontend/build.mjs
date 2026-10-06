import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
mkdirSync("../backend/static", { recursive: true });
await build({
  entryPoints: ["src/main.jsx"], bundle: true, minify: true, sourcemap: false,
  outdir: "../backend/static", loader: { ".jsx": "jsx", ".js": "jsx" },
  define: { "process.env.NODE_ENV": '"production"' }, entryNames: "bundle",
});
cpSync("public/index.html", "../backend/static/index.html");
console.log("Frontend compilado en backend/static/");
