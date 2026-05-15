import {
  ConnectOptionsSchema,
  type ConnectOptions,
  type Chain,
  type Balance,
  type TransferOptions,
  type SwapOptions,
  type TempoSwapOptions,
  type TransactionResult,
  type TransactionStatus,
  type Agent,
  type CreateAgentOptions,
  type McpConfig,
} from "./types/schemas.js";
import {
  loadCredentials,
  getApiKey,
  saveCredentials,
  type Credentials,
} from "./auth/credentials.js";
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
 * import { SpongeWallet } from '@paysponge/sdk';
 *
 * // Connect (handles auth automatically)
 * const wallet = await SpongeWallet.connect();
 *
 * // Get wallet addresses
 * const addresses = await wallet.getAddresses();
 * console.log(addresses.base);    // 0x...
 * console.log(addresses.solana);  // 5x...
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
  private readonly http: HttpClient;
  private readonly agents: AgentsApi;
  private readonly wallets: WalletsApi;
  private readonly transactions: TransactionsApi;
  private readonly publicTools: PublicToolsApi;
  private readonly agentId: string;
  private readonly baseUrl: string;

  // Cached wallet addresses
  private addressCache: Record<Chain, string> | null = null;

  private constructor(options: {
    apiKey: string;
    agentId: string;
    baseUrl?: string;
  }) {
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
   * 2. If none, starts the browser auth flow
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
  static async connect(options: ConnectOptions = {}): Promise<SpongeWallet> {
    const validated = ConnectOptionsSchema.parse(options);
    const baseUrl = validated.baseUrl ?? DEFAULT_BASE_URL;

    // Step 1: Try to get API key
    const credentialsPath = validated.credentialsPath;
    let apiKey = validated.apiKey ?? getApiKey("SPONGE_API_KEY", credentialsPath);
    let agentId = validated.agentId;
    let credentials: Credentials | null = null;

    // Step 2: If no API key, run the browser auth flow
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
    } else {
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
      } catch {
        // If getCurrent fails, the API key might be invalid
        throw new Error(
          "Failed to get agent info. The API key may be invalid or expired."
        );
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
  address(chain: Chain): string {
    if (this.addressCache?.[chain]) {
      return this.addressCache[chain];
    }
    // Return placeholder - actual address is fetched asynchronously
    return `<loading ${chain} address...>`;
  }

  /**
   * Get wallet address for a specific chain (async)
   */
  async getAddress(chain: Chain): Promise<string | null> {
    if (this.addressCache?.[chain]) {
      return this.addressCache[chain];
    }

    const address = await this.wallets.getAddress(this.agentId, chain);

    // Update cache
    if (address && !this.addressCache) {
      this.addressCache = {} as Record<Chain, string>;
    }
    if (address && this.addressCache) {
      this.addressCache[chain] = address;
    }

    return address;
  }

  /**
   * Get all wallet addresses
   */
  async getAddresses(): Promise<Record<Chain, string>> {
    if (this.addressCache) {
      return this.addressCache;
    }

    this.addressCache = await this.wallets.getAllAddresses(this.agentId);
    return this.addressCache;
  }

  /**
   * Get balance for a specific chain
   */
  async getBalance(chain: Chain): Promise<Balance> {
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
  async getBalances(): Promise<Record<Chain, Balance>> {
    return this.wallets.getAllBalances(this.agentId);
  }

  /**
   * Get detailed balances with per-token breakdown
   */
  async getDetailedBalances(options?: {
    chain?: Chain | "all";
    allowedChains?: Chain[];
    onlyUsdc?: boolean;
  }) {
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
  async transfer(options: TransferOptions): Promise<TransactionResult> {
    return this.transactions.transfer(options);
  }

  /**
   * Transfer on EVM chains (allowlist + spending limits enforced)
   */
  async evmTransfer(options: {
    chain:
      | "ethereum"
      | "base"
      | "arbitrum-one"
      | "monad"
      | "polygon"
      | "sepolia"
      | "base-sepolia"
      | "arbitrum-sepolia"
      | "monad-testnet"
      | "polygon-amoy";
    to: string;
    amount: string;
    currency: "ETH" | "MON" | "POL" | "USDC";
  }) {
    return this.publicTools.evmTransfer(options);
  }

  /**
   * Transfer on Solana (allowlist + spending limits enforced)
   */
  async solanaTransfer(options: {
    chain: "solana" | "solana-devnet";
    to: string;
    amount: string;
    currency: "SOL" | "USDC";
  }) {
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
  async swap(options: SwapOptions): Promise<TransactionResult> {
    return this.transactions.swap(options);
  }

  /**
   * Swap stablecoins on Tempo via the native StablecoinExchange DEX
   */
  async tempoSwap(options: TempoSwapOptions): Promise<TransactionResult> {
    return this.transactions.tempoSwap(options);
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
  async getTransactionStatus(txHash: string, chain: Chain): Promise<TransactionStatus> {
    return this.transactions.getStatus(txHash, chain);
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(options?: { limit?: number; offset?: number }) {
    return this.transactions.getHistory(options);
  }

  /**
   * Get detailed transaction history with chain metadata
   */
  async getTransactionHistoryDetailed(options?: { limit?: number; chain?: Chain }) {
    return this.publicTools.getTransactionHistoryDetailed(options);
  }

  /**
   * List all SPL tokens held by the Solana wallet
   */
  async getSolanaTokens(chain: "solana" | "solana-devnet") {
    return this.publicTools.getSolanaTokens(chain);
  }

  /**
   * Search Jupiter token list on Solana
   */
  async searchSolanaTokens(query: string, limit?: number) {
    return this.publicTools.searchSolanaTokens(query, limit);
  }

  /**
   * Create a fiat onramp link to buy USDC into this agent's wallet.
   */
  async onrampCrypto(options: {
    wallet_address: string;
    provider?: "auto" | "stripe" | "coinbase";
    chain?: "base" | "solana" | "polygon";
    fiat_amount?: string;
    fiat_currency?: string;
    lock_wallet_address?: boolean;
    redirect_url?: string;
  }) {
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
  async sponge(request: Record<string, unknown>) {
    return this.publicTools.sponge(request);
  }

  /**
   * Create an x402 payment payload
   */
  async createX402Payment(options: {
    chain: Chain;
    to: string;
    token?: string;
    amount: string;
    decimals?: number;
    valid_for_seconds?: number;
    resource_url?: string;
    resource_description?: string;
    fee_payer?: string;
    http_method?: "GET" | "POST";
  }) {
    return this.publicTools.createX402Payment(options);
  }

  /**
   * Fetch any URL with automatic paid API handling
   */
  async paidFetch(options: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: unknown;
    chain?: "base" | "solana" | "tempo" | "ethereum";
    protocol?: "x402" | "mpp";
  }) {
    return this.publicTools.paidFetch(options);
  }

  /**
   * Fetch any URL with automatic x402 payment handling
   */
  async x402Fetch(options: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: unknown;
    preferredChain?: "base" | "solana" | "ethereum";
    preferred_chain?: "base" | "solana" | "ethereum";
  }) {
    return this.publicTools.x402Fetch(options);
  }

  /**
   * Fetch any URL with automatic MPP payment handling
   */
  async mppFetch(options: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: unknown;
    chain?: "tempo" | "tempo-testnet";
  }) {
    return this.publicTools.mppFetch(options);
  }

  /**
   * Discover paid API services.
   */
  async discoverServices(options: {
    type?: string;
    limit?: number;
    offset?: number;
    query?: string;
    category?: string;
  } = {}) {
    return this.publicTools.discoverServices(options);
  }

  /**
   * Get endpoint and pricing details for a discovered paid API service.
   */
  async getService(serviceId: string) {
    return this.publicTools.getService(serviceId);
  }

  /**
   * Run Polymarket actions for account status, market discovery, trading, funding, and withdrawals.
   */
  async polymarket(options: {
    action:
      | "enable"
      | "signup"
      | "status"
      | "order"
      | "positions"
      | "orders"
      | "balance_allowance"
      | "refresh_balance_allowance"
      | "get_order"
      | "cancel"
      | "search_markets"
      | "get_market"
      | "get_market_price"
      | "set_allowances"
      | "deposit"
      | "deposit_from_wallet"
      | "withdraw"
      | "withdraw_native"
      | "redeem";
    market_slug?: string;
    token_id?: string;
    outcome?: "yes" | "no";
    side?: "buy" | "sell";
    size?: number;
    type?: "limit" | "market";
    price?: number;
    order_type?: "GTC" | "GTD" | "FOK" | "FAK";
    order_id?: string;
    query?: string;
    limit?: number;
    amount?: string;
    condition_id?: string;
  }) {
    return this.publicTools.polymarket(options);
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
  async hyperliquid(args: {
    action: "status" | "order" | "cancel" | "cancel_all" | "set_leverage" | "positions" | "orders" | "fills" | "markets" | "ticker" | "orderbook" | "book_updates" | "funding" | "pnl" | "liquidation_caps" | "liquidations" | "trade_status" | "alerts" | "withdraw" | "transfer" | "set_abstraction" | "chart";
    symbol?: string;
    side?: "buy" | "sell";
    type?: "limit" | "market";
    amount?: string;
    price?: string;
    reduce_only?: boolean;
    trigger_price?: string;
    tp_sl?: "tp" | "sl";
    tif?: "GTC" | "IOC" | "PO";
    order_id?: string;
    leverage?: number;
    since?: number;
    limit?: number;
    offset?: number;
    query?: string;
    market_type?: "spot" | "swap";
    full?: boolean;
    lookback_ms?: number;
    interval?: "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";
    chart_style?: "sparkline" | "live_line" | "candles" | "live_line_candles";
    trace_tool_call?: boolean;
    destination?: string;
    to_perp?: boolean;
    abstraction?: "disabled" | "unifiedAccount" | "portfolioMargin";
  }): Promise<unknown> {
    return this.http.post<unknown>("/api/hyperliquid", args);
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
  async submitPlan(args: {
    title: string;
    reasoning?: string;
    steps: Array<
      | { type: "swap"; chain?: string; input_token: string; output_token: string; amount: string; reason: string }
      | { type: "transfer"; chain: string; to: string; amount: string; currency: string; reason: string }
      | { type: "bridge"; source_chain: string; destination_chain: string; token: string; amount: string; destination_token?: string; reason: string }
    >;
  }): Promise<unknown> {
    return this.http.post<unknown>("/api/plans/submit", args);
  }

  /**
   * Approve and execute a previously submitted plan
   */
  async approvePlan(planId: string): Promise<unknown> {
    return this.http.post<unknown>("/api/plans/approve", { plan_id: planId });
  }

  /**
   * Propose a single swap for user approval (fetches quote, creates pending proposal)
   */
  async proposeTrade(args: {
    input_token: string;
    output_token: string;
    amount: string;
    reason: string;
    chain?: string;
  }): Promise<unknown> {
    return this.http.post<unknown>("/api/trades/propose", args);
  }

  /**
   * Create a new agent
   */
  async createAgent(options: CreateAgentOptions): Promise<Agent> {
    const result = await this.agents.create(options);
    return result.agent;
  }

  /**
   * Get all agents for this user
   */
  async getAgents(): Promise<Agent[]> {
    return this.agents.list();
  }

  /**
   * Get the current agent
   */
  async getAgent(): Promise<Agent> {
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
  mcp(): McpConfig {
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
  async tools() {
    // Dynamic import to avoid circular dependencies
    const { createTools } = await import("./tools/executor.js");
    return createTools(this.http, this.agentId);
  }

  /**
   * Get the agent ID
   */
  getAgentId(): string {
    return this.agentId;
  }
}
