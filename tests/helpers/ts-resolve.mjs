// Resolve hook for `npm test`: lets Node import the app's TypeScript the way
// Next.js does - `@/` and `@website/` aliases, extensionless relative imports.
// Node strips the types itself; this only maps specifiers to files.
// Registered by tests/helpers/register.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ALIASES = [
  ["@website/", path.join(root, "vendor/didit-website/")],
  ["@/", `${root}/`],
];

function asFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const alias = ALIASES.find(([prefix]) => specifier.startsWith(prefix));
  let target = null;

  if (alias) {
    target = asFile(alias[1] + specifier.slice(alias[0].length));
  } else if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:") &&
    !path.extname(specifier)
  ) {
    target = asFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
  }

  if (target) return nextResolve(pathToFileURL(target).href, context);

  // `next/server` and friends are CommonJS directories without an exports map.
  if (/^next\/[a-z-]+$/.test(specifier)) return nextResolve(`${specifier}.js`, context);

  return nextResolve(specifier, context);
}
