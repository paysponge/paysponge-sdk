import { type AgentFirstRegistrationResponse, type AgentRegistrationResponse, type RegisterAgentOptions } from "./types/schemas.js";
export declare function registerAgent(options: RegisterAgentOptions): Promise<AgentRegistrationResponse>;
export declare function registerAgentFirst(options: Omit<RegisterAgentOptions, "agentFirst">): Promise<AgentFirstRegistrationResponse>;
//# sourceMappingURL=registration.d.ts.map