import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { CredentialsSchema } from "../types/schemas.js";
const CREDENTIALS_DIR = ".spongewallet";
const CREDENTIALS_FILE = "credentials.json";
/**
 * Resolve the credentials file path.
 * Priority: explicit path > SPONGE_CREDENTIALS_PATH env var > default (~/.spongewallet/credentials.json)
 */
function resolveCredentialsPath(customPath) {
    if (customPath) {
        return customPath;
    }
    const envPath = process.env.SPONGE_CREDENTIALS_PATH;
    if (envPath) {
        return envPath;
    }
    return path.join(os.homedir(), CREDENTIALS_DIR, CREDENTIALS_FILE);
}
/**
 * Get the credentials directory path
 */
export function getCredentialsDir(customPath) {
    return path.dirname(resolveCredentialsPath(customPath));
}
/**
 * Get the credentials file path
 */
export function getCredentialsPath(customPath) {
    return resolveCredentialsPath(customPath);
}
/**
 * Ensure the credentials directory exists
 */
function ensureCredentialsDir(customPath) {
    const dir = getCredentialsDir(customPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
}
/**
 * Load credentials from disk
 * @param customPath Optional custom path to the credentials file
 * @returns Credentials if found and valid, null otherwise
 */
export function loadCredentials(customPath) {
    const credPath = resolveCredentialsPath(customPath);
    if (!fs.existsSync(credPath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(credPath, "utf-8");
        const data = JSON.parse(content);
        const result = CredentialsSchema.safeParse(data);
        if (!result.success) {
            console.warn("Invalid credentials file, ignoring");
            return null;
        }
        return result.data;
    }
    catch (error) {
        console.warn("Failed to read credentials file:", error);
        return null;
    }
}
/**
 * Save credentials to disk
 * @param credentials Credentials to save
 * @param customPath Optional custom path to the credentials file
 */
export function saveCredentials(credentials, customPath) {
    ensureCredentialsDir(customPath);
    const credPath = resolveCredentialsPath(customPath);
    // Validate before saving
    const validated = CredentialsSchema.parse(credentials);
    fs.writeFileSync(credPath, JSON.stringify(validated, null, 2), {
        mode: 0o600, // Read/write for owner only
    });
}
/**
 * Delete credentials from disk
 * @param customPath Optional custom path to the credentials file
 */
export function deleteCredentials(customPath) {
    const credPath = resolveCredentialsPath(customPath);
    if (fs.existsSync(credPath)) {
        fs.unlinkSync(credPath);
    }
}
/**
 * Check if credentials exist
 * @param customPath Optional custom path to the credentials file
 */
export function hasCredentials(customPath) {
    return fs.existsSync(resolveCredentialsPath(customPath));
}
/**
 * Get API key from environment variable or credentials file
 * @param envVarName Name of the environment variable to check (default: SPONGE_API_KEY)
 * @param customPath Optional custom path to the credentials file
 */
export function getApiKey(envVarName = "SPONGE_API_KEY", customPath) {
    // Check environment variable first
    const envKey = process.env[envVarName];
    if (envKey) {
        return envKey;
    }
    // Fall back to credentials file
    const creds = loadCredentials(customPath);
    return creds?.apiKey ?? null;
}
/**
 * Get agent ID from credentials file
 * @param customPath Optional custom path to the credentials file
 */
export function getAgentId(customPath) {
    const creds = loadCredentials(customPath);
    return creds?.agentId ?? null;
}
//# sourceMappingURL=credentials.js.map