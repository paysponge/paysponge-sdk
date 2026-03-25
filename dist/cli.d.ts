import { Command } from "commander";
import { type ToolDefinition } from "./tools/definitions.js";
interface CliMetadata {
    commandName?: string;
    packageName?: string;
    version?: string;
}
export declare function buildCliProgram(metadata?: CliMetadata): Command;
export declare function runCli(args: string[], metadata?: CliMetadata): Promise<void>;
export declare function displayToolResult(tool: ToolDefinition, data: unknown): void;
export {};
//# sourceMappingURL=cli.d.ts.map