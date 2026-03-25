import {
  AgentFirstRegistrationResponseSchema,
  AgentRegistrationResponseSchema,
  RegisterAgentOptionsSchema,
  type AgentFirstRegistrationResponse,
  type AgentRegistrationResponse,
  type RegisterAgentOptions,
} from "./types/schemas.js";

const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";

export async function registerAgent(
  options: RegisterAgentOptions
): Promise<AgentRegistrationResponse> {
  const validated = RegisterAgentOptionsSchema.parse(options);
  const baseUrl = validated.baseUrl ?? DEFAULT_BASE_URL;

  const response = await fetch(`${baseUrl}/api/agents/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: validated.name,
      agentFirst: validated.agentFirst,
      testnet: validated.testnet,
      claimRequired: validated.claimRequired,
      email: validated.email,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(
      `Registration failed (${response.status}): ${error || "Unknown error"}`
    );
  }

  const data = await response.json();
  return AgentRegistrationResponseSchema.parse(data);
}

export async function registerAgentFirst(
  options: Omit<RegisterAgentOptions, "agentFirst">
): Promise<AgentFirstRegistrationResponse> {
  const registration = await registerAgent({
    ...options,
    agentFirst: true,
  });

  return AgentFirstRegistrationResponseSchema.parse(registration);
}
