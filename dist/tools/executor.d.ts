import type { HttpClient } from "../api/http.js";
import type { ToolResult } from "../types/schemas.js";
import { type AnthropicToolDefinition } from "./definitions.js";
/**
 * Tool executor for use with the Anthropic SDK
 *
 * Provides tool definitions and an execute method to run tools
 */
export declare class ToolExecutor {
    private readonly http;
    private readonly agentId;
    constructor(http: HttpClient, agentId: string);
    /**
     * Get tool definitions for use with Anthropic SDK
     */
    get definitions(): AnthropicToolDefinition[];
    /**
     * Execute a tool by name
     *
     * @param name - Tool name
     * @param input - Tool input
     * @returns Tool result
     *
     * @example
     * ```typescript
     * const tools = wallet.tools();
     *
     * const response = await anthropic.messages.create({
     *   model: 'claude-sonnet-4-20250514',
     *   tools: tools.definitions,
     *   messages: [{ role: 'user', content: 'Check balance' }],
     * });
     *
     * for (const block of response.content) {
     *   if (block.type === 'tool_use') {
     *     const result = await tools.execute(block.name, block.input);
     *     console.log(result);
     *   }
     * }
     * ```
     */
    execute(name: string, input: unknown): Promise<ToolResult>;
    /**
     * Call the MCP tool endpoint
     */
    private callTool;
}
/**
 * Create a tool executor for use with the Anthropic SDK
 *
 * @param http - HTTP client instance
 * @param agentId - Agent ID
 * @returns Tool executor with definitions and execute method
 */
export declare function createTools(http: HttpClient, agentId: string): ToolExecutor;
//# sourceMappingURL=executor.d.ts.map