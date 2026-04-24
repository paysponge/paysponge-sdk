import { type TokenResponse } from "../types/schemas.js";
export interface DeviceFlowOptions {
    /** Base URL for the API */
    baseUrl?: string;
    /** Disable auto-opening browser */
    noBrowser?: boolean;
    /** Use testnets only */
    testnet?: boolean;
    /** Agent name to create (if new user) */
    agentName?: string;
    /** Type of key to generate: "agent" (default) or "master" */
    keyType?: "agent" | "master";
    /** Custom path to store credentials file */
    credentialsPath?: string;
    /** Email to associate with the agent (used for claim matching) */
    email?: string;
}
/**
 * Start the browser-based OAuth authentication flow
 *
 * This flow:
 * 1. Requests a device code from the server
 * 2. Opens the browser to the verification URL
 * 3. Copies the user code to clipboard
 * 4. Polls for token until approved or expired
 * 5. Saves credentials and returns the API key
 */
export declare function deviceFlowAuth(options?: DeviceFlowOptions): Promise<TokenResponse>;
//# sourceMappingURL=device-flow.d.ts.map