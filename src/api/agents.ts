import { z } from "zod";
import {
  AgentSchema,
  CreateAgentOptionsSchema,
  type Agent,
  type CreateAgentOptions,
} from "../types/schemas.js";
import type { HttpClient } from "./http.js";
import {
  deleteApiAgentsById,
  getApiAgents,
  getApiAgentsById,
  getApiAgentsMe,
  postApiAgents,
  putApiAgentsById,
} from "./generated/heyapi/sdk.gen.js";
import { getHeyApiClient } from "./generated/heyapi-adapter.js";

// Response from creating an agent (includes API key)
const CreateAgentResponseSchema = z.object({
  agent: AgentSchema,
  mcpApiKey: z.string(),
});

export class AgentsApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new agent
   */
  async create(
    options: CreateAgentOptions
  ): Promise<{ agent: Agent; apiKey: string }> {
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
  async list(): Promise<Agent[]> {
    const response = await getApiAgents({
      client: getHeyApiClient(this.http),
    });
    return z.array(AgentSchema).parse(response);
  }

  /**
   * Get a specific agent by ID
   * Note: This endpoint requires Privy auth, not API key auth
   */
  async get(agentId: string): Promise<Agent> {
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
  async getCurrent(): Promise<Agent> {
    const response = await getApiAgentsMe({
      client: getHeyApiClient(this.http),
    });
    return AgentSchema.parse(response);
  }

  /**
   * Update an agent
   */
  async update(
    agentId: string,
    updates: Partial<CreateAgentOptions>
  ): Promise<Agent> {
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
  async delete(agentId: string): Promise<void> {
    await deleteApiAgentsById({
      client: getHeyApiClient(this.http),
      path: { id: agentId },
    });
  }
}
