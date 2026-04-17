import { DeviceCodeResponseSchema, TokenResponseSchema, } from "../types/schemas.js";
import { saveCredentials, getCredentialsPath } from "./credentials.js";
import { captureCliAuthEvent, classifyBaseUrl, sanitizeErrorForTelemetry, } from "../telemetry.js";
const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";
/**
 * Start the OAuth Device Flow authentication
 *
 * This flow:
 * 1. Requests a device code from the server
 * 2. Opens the browser to the verification URL
 * 3. Copies the user code to clipboard
 * 4. Polls for token until approved or expired
 * 5. Saves credentials and returns the API key
 */
export async function deviceFlowAuth(options = {}) {
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const startedAt = Date.now();
    try {
        // Step 1: Request device code
        console.log("Starting authentication...\n");
        const deviceCodeResponse = await requestDeviceCode(baseUrl, {
            testnet: options.testnet,
            agentName: options.agentName,
            keyType: options.keyType,
            email: options.email,
        });
        // Step 2: Display instructions and optionally open browser
        console.log("To authenticate, visit:");
        console.log(`  ${deviceCodeResponse.verificationUri}\n`);
        console.log(`Enter this code: ${deviceCodeResponse.userCode}\n`);
        // Try to copy to clipboard
        try {
            const clipboardy = await import("clipboardy");
            await clipboardy.default.write(deviceCodeResponse.userCode);
            console.log("(Code copied to clipboard)\n");
        }
        catch {
            // Clipboard not available, that's fine
        }
        // Try to open browser
        if (!options.noBrowser) {
            try {
                const open = await import("open");
                await open.default(deviceCodeResponse.verificationUri);
                console.log("Opening browser...\n");
            }
            catch {
                // Browser not available, that's fine
            }
        }
        console.log("Waiting for approval...");
        // Step 3: Poll for token
        const tokenResponse = await pollForToken(baseUrl, deviceCodeResponse.deviceCode, deviceCodeResponse.interval, deviceCodeResponse.expiresIn);
        // Step 4: Save credentials (only for agent keys with agentId)
        if (tokenResponse.agentId) {
            const credentials = {
                apiKey: tokenResponse.apiKey,
                agentId: tokenResponse.agentId,
                testnet: options.testnet,
                createdAt: new Date(),
                baseUrl: baseUrl !== DEFAULT_BASE_URL ? baseUrl : undefined,
            };
            saveCredentials(credentials, options.credentialsPath);
        }
        // Step 5: Display success message with API key
        const isMaster = options.keyType === "master";
        console.log("\n" + "=".repeat(60));
        console.log("Authentication successful!\n");
        console.log(`Your ${isMaster ? "master " : ""}API key: ${tokenResponse.apiKey}\n`);
        if (isMaster) {
            console.log("Use this key to create agents programmatically:");
            console.log("  - Set SPONGE_MASTER_KEY environment variable, or");
            console.log("  - Use as Bearer token with POST /api/agents\n");
        }
        else {
            console.log("Save this key for other machines/deployments:");
            console.log("  - Set SPONGE_API_KEY environment variable, or");
            console.log("  - Pass directly: SpongeWallet.connect({ apiKey: '...' })\n");
            console.log(`Key cached locally at ${getCredentialsPath(options.credentialsPath)}`);
        }
        console.log("=".repeat(60) + "\n");
        await captureCliAuthEvent({
            status: "succeeded",
            auth_flow: "device_code",
            duration_ms: Date.now() - startedAt,
            key_type: options.keyType === "master" ? "master" : "agent",
            no_browser: Boolean(options.noBrowser),
            has_email: Boolean(options.email),
            has_agent_name: Boolean(options.agentName),
            base_url_kind: classifyBaseUrl(baseUrl),
            credentials_cached: Boolean(tokenResponse.agentId),
        }, options.credentialsPath);
        return tokenResponse;
    }
    catch (error) {
        await captureCliAuthEvent({
            status: "failed",
            auth_flow: "device_code",
            duration_ms: Date.now() - startedAt,
            key_type: options.keyType === "master" ? "master" : "agent",
            no_browser: Boolean(options.noBrowser),
            has_email: Boolean(options.email),
            has_agent_name: Boolean(options.agentName),
            base_url_kind: classifyBaseUrl(baseUrl),
            credentials_cached: false,
            ...sanitizeErrorForTelemetry(error),
        }, options.credentialsPath);
        throw error;
    }
}
/**
 * Request a device code from the server
 */
async function requestDeviceCode(baseUrl, options) {
    const response = await fetch(`${baseUrl}/api/oauth/device/authorization`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            clientId: "spongewallet-sdk",
            scope: "wallet:read wallet:write transaction:sign",
            testnet: options.testnet,
            agentName: options.agentName,
            keyType: options.keyType,
            email: options.email,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to start device flow: ${error}`);
    }
    const data = await response.json();
    return DeviceCodeResponseSchema.parse(data);
}
/**
 * Poll for token until approved or expired
 */
async function pollForToken(baseUrl, deviceCode, intervalSeconds, expiresInSeconds) {
    const startTime = Date.now();
    const expiresAt = startTime + expiresInSeconds * 1000;
    let interval = intervalSeconds * 1000;
    while (Date.now() < expiresAt) {
        await sleep(interval);
        try {
            const response = await fetch(`${baseUrl}/api/oauth/device/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    grantType: "urn:ietf:params:oauth:grant-type:device_code",
                    deviceCode,
                    clientId: "spongewallet-sdk",
                }),
            });
            if (response.ok) {
                const data = await response.json();
                return TokenResponseSchema.parse(data);
            }
            // Handle error responses
            const errorData = (await response.json().catch(() => ({})));
            const error = errorData.error;
            switch (error) {
                case "authorization_pending":
                    // Keep polling
                    process.stdout.write(".");
                    break;
                case "slow_down":
                    // Increase polling interval
                    interval += 5000;
                    break;
                case "access_denied":
                    throw new Error("Access denied by user");
                case "expired_token":
                    throw new Error("Device code expired. Please try again.");
                default:
                    throw new Error(`Authentication failed: ${errorData.errorDescription || error || "Unknown error"}`);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Network error during authentication: ${error}`);
        }
    }
    throw new Error("Device code expired. Please try again.");
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=device-flow.js.map