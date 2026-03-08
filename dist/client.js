import { ConnectOptionsSchema, } from "./types/schemas.js";
import { loadCredentials, getApiKey, saveCredentials, } from "./auth/credentials.js";
import { deviceFlowAuth } from "./auth/device-flow.js";
import { HttpClient } from "./api/http.js";
import { AgentsApi } from "./api/agents.js";
import { WalletsApi } from "./api/wallets.js";
import { TransactionsApi } from "./api/transactions.js";
import { PublicToolsApi } from "./api/public-tools.js";
const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";
/**
 * SpongeWallet - The main SDK client for managing agent wallets
 *
 * @example
 * ```typescript
 * import { SpongeWallet } from '@spongewallet/sdk';
 *
 * // Connect (handles auth automatically)
 * const wallet = await SpongeWallet.connect();
 *
 * // Get wallet addresses
 * console.log(wallet.address('base'));    // 0x...
 * console.log(wallet.address('solana'));  // 5x...
 *
 * // Check balances
 * const balances = await wallet.getBalances();
 *
 * // Transfer tokens
 * await wallet.transfer({
 *   chain: 'base',
 *   to: '0x...',
 *   amount: '10',
 *   currency: 'USDC',
 * });
 * ```
 */
export class SpongeWallet {
    http;
    agents;
    wallets;
    transactions;
    publicTools;
    agentId;
    baseUrl;
    // Cached wallet addresses
    addressCache = null;
    constructor(options) {
        this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
        this.agentId = options.agentId;
        this.http = new HttpClient({
            baseUrl: this.baseUrl,
            apiKey: options.apiKey,
        });
        this.agents = new AgentsApi(this.http);
        this.wallets = new WalletsApi(this.http);
        this.transactions = new TransactionsApi(this.http, this.agentId);
        this.publicTools = new PublicToolsApi(this.http);
    }
    /**
     * Connect to SpongeWallet
     *
     * This method handles everything:
     * 1. Checks for cached credentials or environment variable
     * 2. If none, starts OAuth Device Flow
     * 3. Creates a default agent if needed
     * 4. Returns a connected SpongeWallet instance
     *
     * @example
     * ```typescript
     * // Simple connect (uses default agent or creates one)
     * const wallet = await SpongeWallet.connect();
     *
     * // Connect with options
     * const wallet = await SpongeWallet.connect({
     *   name: 'My Trading Bot',
     *   testnet: true,
     * });
     *
     * // Connect with existing API key
     * const wallet = await SpongeWallet.connect({
     *   apiKey: 'sponge_live_...',
     * });
     * ```
     */
    static async connect(options = {}) {
        const validated = ConnectOptionsSchema.parse(options);
        const baseUrl = validated.baseUrl ?? DEFAULT_BASE_URL;
        // Step 1: Try to get API key
        const credentialsPath = validated.credentialsPath;
        let apiKey = validated.apiKey ?? getApiKey("SPONGE_API_KEY", credentialsPath);
        let agentId = validated.agentId;
        let credentials = null;
        // Step 2: If no API key, do device flow
        if (!apiKey) {
            const tokenResponse = await deviceFlowAuth({
                baseUrl,
                noBrowser: validated.noBrowser,
                testnet: validated.testnet,
                agentName: validated.name ?? "Default Agent",
                credentialsPath,
                email: validated.email,
            });
            apiKey = tokenResponse.apiKey;
            agentId = tokenResponse.agentId ?? undefined;
        }
        else {
            // Load credentials to get agent ID if not provided
            if (!agentId) {
                credentials = loadCredentials(credentialsPath);
                agentId = credentials?.agentId;
            }
        }
        // Step 3: Create HTTP client for API calls
        const http = new HttpClient({ baseUrl, apiKey });
        const agentsApi = new AgentsApi(http);
        // Step 4: Get agent ID from the API key if not provided
        if (!agentId) {
            // Use the SDK endpoint to get the current agent (authenticated via API key)
            try {
                const currentAgent = await agentsApi.getCurrent();
                agentId = currentAgent.id;
                // Save the credentials for future use
                saveCredentials({
                    apiKey,
                    agentId,
                    agentName: currentAgent.name,
                    testnet: validated.testnet,
                    createdAt: new Date(),
                    baseUrl: baseUrl !== DEFAULT_BASE_URL ? baseUrl : undefined,
                }, credentialsPath);
            }
            catch {
                // If getCurrent fails, the API key might be invalid
                throw new Error("Failed to get agent info. The API key may be invalid or expired.");
            }
        }
        return new SpongeWallet({
            apiKey,
            agentId,
            baseUrl,
        });
    }
    /**
     * Get wallet address for a specific chain
     */
    address(chain) {
        if (this.addressCache?.[chain]) {
            return this.addressCache[chain];
        }
        // Return placeholder - actual address is fetched asynchronously
        return `<loading ${chain} address...>`;
    }
    /**
     * Get wallet address for a specific chain (async)
     */
    async getAddress(chain) {
        if (this.addressCache?.[chain]) {
            return this.addressCache[chain];
        }
        const address = await this.wallets.getAddress(this.agentId, chain);
        // Update cache
        if (address && !this.addressCache) {
            this.addressCache = {};
        }
        if (address && this.addressCache) {
            this.addressCache[chain] = address;
        }
        return address;
    }
    /**
     * Get all wallet addresses
     */
    async getAddresses() {
        if (this.addressCache) {
            return this.addressCache;
        }
        this.addressCache = await this.wallets.getAllAddresses(this.agentId);
        return this.addressCache;
    }
    /**
     * Get balance for a specific chain
     */
    async getBalance(chain) {
        const walletsList = await this.wallets.list(this.agentId);
        const wallet = walletsList.find((w) => w.chainName === chain);
        if (!wallet) {
            return {};
        }
        return this.wallets.getBalance(wallet.id);
    }
    /**
     * Get balances for all chains
     */
    async getBalances() {
        return this.wallets.getAllBalances(this.agentId);
    }
    /**
     * Get detailed balances with per-token breakdown
     */
    async getDetailedBalances(options) {
        return this.publicTools.getDetailedBalances(options);
    }
    /**
     * Transfer tokens
     *
     * @example
     * ```typescript
     * // Transfer USDC on Base
     * const tx = await wallet.transfer({
     *   chain: 'base',
     *   to: '0x742d35Cc...',
     *   amount: '10',
     *   currency: 'USDC',
     * });
     * console.log(tx.txHash);
     * ```
     */
    async transfer(options) {
        return this.transactions.transfer(options);
    }
    /**
     * Transfer on EVM chains (allowlist + spending limits enforced)
     */
    async evmTransfer(options) {
        return this.publicTools.evmTransfer(options);
    }
    /**
     * Transfer on Solana (allowlist + spending limits enforced)
     */
    async solanaTransfer(options) {
        return this.publicTools.solanaTransfer(options);
    }
    /**
     * Swap tokens (Solana via Jupiter)
     *
     * @example
     * ```typescript
     * const tx = await wallet.swap({
     *   chain: 'solana',
     *   from: 'SOL',
     *   to: 'USDC',
     *   amount: '1',
     * });
     * ```
     */
    async swap(options) {
        return this.transactions.swap(options);
    }
    /**
     * Get transaction status
     *
     * @example
     * ```typescript
     * const status = await wallet.getTransactionStatus(txHash, 'base');
     * console.log(status.status); // 'pending', 'confirmed', or 'failed'
     * ```
     */
    async getTransactionStatus(txHash, chain) {
        return this.transactions.getStatus(txHash, chain);
    }
    /**
     * Get transaction history
     */
    async getTransactionHistory(options) {
        return this.transactions.getHistory(options);
    }
    /**
     * Get detailed transaction history with chain metadata
     */
    async getTransactionHistoryDetailed(options) {
        return this.publicTools.getTransactionHistoryDetailed(options);
    }
    /**
     * List all SPL tokens held by the Solana wallet
     */
    async getSolanaTokens(chain) {
        return this.publicTools.getSolanaTokens(chain);
    }
    /**
     * Search Jupiter token list on Solana
     */
    async searchSolanaTokens(query, limit) {
        return this.publicTools.searchSolanaTokens(query, limit);
    }
    /**
     * Create a fiat onramp link to buy USDC into this agent's wallet.
     */
    async onrampCrypto(options) {
        return this.publicTools.createOnrampLink(options);
    }
    /**
     * Claim the one-time signup bonus (1 USDC on Base) to this agent wallet
     */
    async claimSignupBonus() {
        return this.publicTools.claimSignupBonus();
    }
    /**
     * Call Sponge paid APIs via x402
     */
    async sponge(request) {
        return this.publicTools.sponge(request);
    }
    /**
     * Create an x402 payment payload
     */
    async createX402Payment(options) {
        return this.publicTools.createX402Payment(options);
    }
    /**
     * Fetch any URL with automatic x402 payment handling
     */
    async x402Fetch(options) {
        return this.publicTools.x402Fetch(options);
    }
    /**
     * Trade perps and spot on Hyperliquid DEX
     *
     * @example
     * ```typescript
     * // Check account status
     * const status = await wallet.hyperliquid({ action: 'status' });
     *
     * // Place a limit order
     * const order = await wallet.hyperliquid({
     *   action: 'order',
     *   symbol: 'BTC/USDC:USDC',
     *   side: 'buy',
     *   type: 'limit',
     *   amount: '0.001',
     *   price: '50000',
     * });
     *
     * // Get open positions
     * const positions = await wallet.hyperliquid({ action: 'positions' });
     * ```
     */
    async hyperliquid(args) {
        return this.http.post("/api/hyperliquid", args);
    }
    /**
     * Submit a multi-step plan for user approval
     *
     * @example
     * ```typescript
     * const plan = await wallet.submitPlan({
     *   title: 'Rebalance Portfolio',
     *   reasoning: 'Moving funds from SOL to USDC and bridging to Base',
     *   steps: [
     *     { type: 'swap', input_token: 'SOL', output_token: 'USDC', amount: '10', reason: 'Take profit' },
     *     { type: 'bridge', source_chain: 'solana', destination_chain: 'base', token: 'USDC', amount: '100', reason: 'Move to Base' },
     *   ],
     * });
     * // Present plan to user, then approve:
     * await wallet.approvePlan(plan.planId);
     * ```
     */
    async submitPlan(args) {
        return this.http.post("/api/plans/submit", args);
    }
    /**
     * Approve and execute a previously submitted plan
     */
    async approvePlan(planId) {
        return this.http.post("/api/plans/approve", { plan_id: planId });
    }
    /**
     * Propose a single swap for user approval (fetches quote, creates pending proposal)
     */
    async proposeTrade(args) {
        return this.http.post("/api/trades/propose", args);
    }
    /**
     * Create a new agent
     */
    async createAgent(options) {
        const result = await this.agents.create(options);
        return result.agent;
    }
    /**
     * Get all agents for this user
     */
    async getAgents() {
        return this.agents.list();
    }
    /**
     * Get the current agent
     */
    async getAgent() {
        return this.agents.getCurrent();
    }
    /**
     * Get MCP configuration for Claude Agent SDK
     *
     * @example
     * ```typescript
     * import { query } from '@anthropic-ai/claude-agent-sdk';
     *
     * const wallet = await SpongeWallet.connect();
     *
     * for await (const msg of query({
     *   prompt: 'Check my balance',
     *   options: {
     *     mcpServers: {
     *       wallet: wallet.mcp(),
     *     },
     *   },
     * })) {
     *   console.log(msg);
     * }
     * ```
     */
    mcp() {
        return {
            url: `${this.baseUrl}/mcp`,
            headers: {
                Authorization: `Bearer ${this.http.getApiKey()}`,
            },
        };
    }
    /**
     * Get direct tools for use with raw Anthropic SDK
     *
     * @example
     * ```typescript
     * const tools = wallet.tools();
     *
     * const response = await anthropic.messages.create({
     *   model: 'claude-sonnet-4-20250514',
     *   tools: tools.definitions,
     *   messages: [{ role: 'user', content: 'Check balance' }],
     * });
     *
     * if (response.stop_reason === 'tool_use') {
     *   const result = await tools.execute(toolCall.name, toolCall.input);
     * }
     * ```
     */
    tools() {
        // Import dynamically to avoid circular dependencies
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createTools } = require("./tools/index.js");
        return createTools(this.http, this.agentId);
    }
    /**
     * Get the agent ID
     */
    getAgentId() {
        return this.agentId;
    }
}
//# sourceMappingURL=client.js.map