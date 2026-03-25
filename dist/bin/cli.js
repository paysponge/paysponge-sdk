#!/usr/bin/env node
import { createRequire } from "node:module";
import { runCli } from "../cli.js";
const require = createRequire(import.meta.url);
const packageJson = require("../../package.json");
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
async function main() {
    await runCli(process.argv.slice(2), {
        commandName: "spongewallet",
        packageName: packageJson.name,
        version: packageJson.version,
    });
}
//# sourceMappingURL=cli.js.map