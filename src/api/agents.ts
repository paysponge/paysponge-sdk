import { z } from "zod";
import {
  AgentSchema,
  CreateAgentOptionsSchema,
  type Agent,
  type CreateAgentOptions,
} from "../types/schemas.js";
import type { HttpClient } from "./http.js";
import {
  createGeneratedApiClient,
} from "./generated/openapi-adapter.js";

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
    const client = createGeneratedApiClient(this.http);

    const response = await client.request(
      client.api.postApiAgentsRequestOpts({
        postApiAgentsRequest: validated,
      }),
    );
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
    const client = createGeneratedApiClient(this.http);
    const response = await client.request(
      client.api.getApiAgentsRequestOpts({}),
    );
    return z.array(AgentSchema).parse(response);
  }

  /**
   * Get a specific agent by ID
   * Note: This endpoint requires Privy auth, not API key auth
   */
  async get(agentId: string): Promise<Agent> {
    const client = createGeneratedApiClient(this.http);
    const response = await client.request(
      client.api.getApiAgentsByIdRequestOpts({ id: agentId }),
    );
    return AgentSchema.parse(response);
  }

  /**
   * Get the current agent (authenticated via API key)
   * This endpoint returns the agent associated with the current API key
   */
  async getCurrent(): Promise<Agent> {
    const client = createGeneratedApiClient(this.http);
    const response = await client.request(
      client.api.getApiAgentsMeRequestOpts(),
    );
    return AgentSchema.parse(response);
  }

  /**
   * Update an agent
   */
  async update(
    agentId: string,
    updates: Partial<CreateAgentOptions>
  ): Promise<Agent> {
    const client = createGeneratedApiClient(this.http);
    const response = await client.request(
      client.api.putApiAgentsByIdRequestOpts({
        id: agentId,
        putApiAgentsByIdRequest: updates as Record<string, unknown>,
      }),
    );
    return AgentSchema.parse(response);
  }

  /**
   * Delete an agent
   */
  async delete(agentId: string): Promise<void> {
    const client = createGeneratedApiClient(this.http);
    await client.request<void>(
      client.api.deleteApiAgentsByIdRequestOpts({ id: agentId }),
    );
  }
}
