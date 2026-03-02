import { z } from "zod";
import { AgentSchema, CreateAgentOptionsSchema, } from "../types/schemas.js";
import { deleteApiAgentsById, getApiAgents, getApiAgentsById, getApiAgentsMe, postApiAgents, putApiAgentsById, } from "./generated/heyapi/sdk.gen.js";
import { getHeyApiClient } from "./generated/heyapi-adapter.js";
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
        const client = getHeyApiClient(this.http);
        const response = await postApiAgents({
            client,
            body: validated,
        });
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
        const response = await getApiAgents({
            client: getHeyApiClient(this.http),
        });
        return z.array(AgentSchema).parse(response);
    }
    /**
     * Get a specific agent by ID
     * Note: This endpoint requires Privy auth, not API key auth
     */
    async get(agentId) {
        const response = await getApiAgentsById({
            client: getHeyApiClient(this.http),
            path: { id: agentId },
        });
        return AgentSchema.parse(response);
    }
    /**
     * Get the current agent (authenticated via API key)
     * This endpoint returns the agent associated with the current API key
     */
    async getCurrent() {
        const response = await getApiAgentsMe({
            client: getHeyApiClient(this.http),
        });
        return AgentSchema.parse(response);
    }
    /**
     * Update an agent
     */
    async update(agentId, updates) {
        const response = await putApiAgentsById({
            client: getHeyApiClient(this.http),
            path: { id: agentId },
            body: updates,
        });
        return AgentSchema.parse(response);
    }
    /**
     * Delete an agent
     */
    async delete(agentId) {
        await deleteApiAgentsById({
            client: getHeyApiClient(this.http),
            path: { id: agentId },
        });
    }
}
//# sourceMappingURL=agents.js.map