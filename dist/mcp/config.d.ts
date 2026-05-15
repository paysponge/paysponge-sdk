import type { McpConfig } from "../types/schemas.js";
/**
 * Create MCP configuration for Claude Agent SDK
 *
 * @param apiKey - API key for authentication
 * @param baseUrl - Base URL for the API (optional)
 * @returns MCP server configuration
 *
 * @example
 * ```typescript
 * import { query } from '@anthropic-ai/claude-agent-sdk';
 * import { createMcpConfig } from '@paysponge/sdk';
 *
 * for await (const msg of query({
 *   prompt: 'Check my balance',
 *   options: {
 *     mcpServers: {
 *       wallet: createMcpConfig('sponge_live_...'),
 *     },
 *   },
 * })) {
 *   console.log(msg);
 * }
 * ```
 */
export declare function createMcpConfig(apiKey: string, baseUrl?: string): McpConfig;
//# sourceMappingURL=config.d.ts.map