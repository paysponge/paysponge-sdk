/**
 * Tool definitions for use with the Anthropic SDK
 *
 * These definitions follow the Anthropic tool schema format
 */
export interface ToolDefinition {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
    cli_output?: CliOutputDefinition;
}
export type AnthropicToolDefinition = Omit<ToolDefinition, "cli_output">;
export declare function toAnthropicToolDefinition(tool: ToolDefinition): AnthropicToolDefinition;
export type CliOutputKind = "tx" | "table" | "fields" | "link" | "http_response";
export interface CliOutputField {
    key: string | string[];
    label: string;
}
export interface CliOutputColumn {
    key: string | string[];
    label: string;
}
export interface CliOutputDefinition {
    kind: CliOutputKind;
    title?: string;
    dataPath?: string;
    emptyMessage?: string;
    fields?: CliOutputField[];
    columns?: CliOutputColumn[];
    linkField?: string;
}
export declare const TOOL_DEFINITIONS: ToolDefinition[];
//# sourceMappingURL=definitions.d.ts.map