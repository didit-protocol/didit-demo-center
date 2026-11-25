// Import this first in a test that loads route handlers or other app modules
// with `@/` imports: `await import("./helpers/register.mjs")`.
import { register } from "node:module";

register("./ts-resolve.mjs", import.meta.url);
