import { z } from "zod";
import { AgentSchema, CreateAgentOptionsSchema, } from "../types/schemas.js";
import { createGeneratedApiClient, } from "./generated/openapi-adapter.js";
// Response from creating an agent (includes API key)
const CreateAgentResponseSchema = z.object({
    agent: AgentSchema,
    mcpApiKey: z.string(),
});
export class AgentsApi {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Create a new agent
     */
    async create(options) {
        const validated = CreateAgentOptionsSchema.parse(options);
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.postApiAgentsRequestOpts({
            postApiAgentsRequest: validated,
        }));
        const parsed = CreateAgentResponseSchema.parse(response);
        return {
            agent: parsed.agent,
            apiKey: parsed.mcpApiKey,
        };
    }
    /**
     * List all agents for the current user
     * Note: This endpoint requires Privy auth, not API key auth
     */
    async list() {
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.getApiAgentsRequestOpts({}));
        return z.array(AgentSchema).parse(response);
    }
    /**
     * Get a specific agent by ID
     * Note: This endpoint requires Privy auth, not API key auth
     */
    async get(agentId) {
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.getApiAgentsByIdRequestOpts({ id: agentId }));
        return AgentSchema.parse(response);
    }
    /**
     * Get the current agent (authenticated via API key)
     * This endpoint returns the agent associated with the current API key
     */
    async getCurrent() {
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.getApiAgentsMeRequestOpts());
        return AgentSchema.parse(response);
    }
    /**
     * Update an agent
     */
    async update(agentId, updates) {
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.putApiAgentsByIdRequestOpts({
            id: agentId,
            putApiAgentsByIdRequest: updates,
        }));
        return AgentSchema.parse(response);
    }
    /**
     * Delete an agent
     */
    async delete(agentId) {
        const client = createGeneratedApiClient(this.http);
        await client.request(client.api.deleteApiAgentsByIdRequestOpts({ id: agentId }));
    }
}
//# sourceMappingURL=agents.js.map