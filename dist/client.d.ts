import { type ConnectOptions, type Chain, type Balance, type TransferOptions, type SwapOptions, type TempoSwapOptions, type TransactionResult, type TransactionStatus, type Agent, type CreateAgentOptions, type McpConfig } from "./types/schemas.js";
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
export declare class SpongeWallet {
    private readonly http;
    private readonly agents;
    private readonly wallets;
    private readonly transactions;
    private readonly publicTools;
    private readonly agentId;
    private readonly baseUrl;
    private addressCache;
    private constructor();
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
    static connect(options?: ConnectOptions): Promise<SpongeWallet>;
    /**
     * Get wallet address for a specific chain
     */
    address(chain: Chain): string;
    /**
     * Get wallet address for a specific chain (async)
     */
    getAddress(chain: Chain): Promise<string | null>;
    /**
     * Get all wallet addresses
     */
    getAddresses(): Promise<Record<Chain, string>>;
    /**
     * Get balance for a specific chain
     */
    getBalance(chain: Chain): Promise<Balance>;
    /**
     * Get balances for all chains
     */
    getBalances(): Promise<Record<Chain, Balance>>;
    /**
     * Get detailed balances with per-token breakdown
     */
    getDetailedBalances(options?: {
        chain?: Chain | "all";
        allowedChains?: Chain[];
        onlyUsdc?: boolean;
    }): Promise<Record<string, {
        address: string;
        balances: {
            amount: string;
            token: string;
            usdValue?: string | undefined;
        }[];
    }>>;
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
    transfer(options: TransferOptions): Promise<TransactionResult>;
    /**
     * Transfer on EVM chains (allowlist + spending limits enforced)
     */
    evmTransfer(options: {
        chain: "ethereum" | "base" | "sepolia" | "base-sepolia";
        to: string;
        amount: string;
        currency: "ETH" | "USDC";
    }): Promise<{
        status: string;
        transactionHash: string;
        message?: string | undefined;
        explorerUrl?: string | undefined;
    }>;
    /**
     * Transfer on Solana (allowlist + spending limits enforced)
     */
    solanaTransfer(options: {
        chain: "solana" | "solana-devnet";
        to: string;
        amount: string;
        currency: "SOL" | "USDC";
    }): Promise<{
        status: string;
        transactionHash: string;
        message?: string | undefined;
        explorerUrl?: string | undefined;
    }>;
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
    swap(options: SwapOptions): Promise<TransactionResult>;
    /**
     * Swap stablecoins on Tempo via the native StablecoinExchange DEX
     */
    tempoSwap(options: TempoSwapOptions): Promise<TransactionResult>;
    /**
     * Get transaction status
     *
     * @example
     * ```typescript
     * const status = await wallet.getTransactionStatus(txHash, 'base');
     * console.log(status.status); // 'pending', 'confirmed', or 'failed'
     * ```
     */
    getTransactionStatus(txHash: string, chain: Chain): Promise<TransactionStatus>;
    /**
     * Get transaction history
     */
    getTransactionHistory(options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        status: "unknown" | "failed" | "pending" | "confirmed";
        txHash: string;
        blockNumber: number | null;
        confirmations: number | null;
        errorMessage: string | null;
    }[]>;
    /**
     * Get detailed transaction history with chain metadata
     */
    getTransactionHistoryDetailed(options?: {
        limit?: number;
        chain?: Chain;
    }): Promise<{
        transactions: {
            value: string;
            status: string;
            chain: string;
            to: string;
            token: string;
            txHash: string | null;
            from: string;
            direction: string;
            timestamp: string;
        }[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * List all SPL tokens held by the Solana wallet
     */
    getSolanaTokens(chain: "solana" | "solana-devnet"): Promise<{
        address: string;
        tokens: {
            symbol: string;
            name: string;
            balance: string;
            decimals: number;
            mint: string;
            logoURI: string | null;
            verified: boolean;
        }[];
    }>;
    /**
     * Search Jupiter token list on Solana
     */
    searchSolanaTokens(query: string, limit?: number): Promise<{
        tokens: {
            symbol: string;
            name: string;
            decimals: number;
            mint: string;
            logoURI: string | null;
            verified: boolean;
        }[];
    }>;
    /**
     * Create a fiat onramp link to buy USDC into this agent's wallet.
     */
    onrampCrypto(options: {
        wallet_address: string;
        provider?: "auto" | "stripe" | "coinbase";
        chain?: "base" | "solana" | "polygon";
        fiat_amount?: string;
        fiat_currency?: string;
        lock_wallet_address?: boolean;
        redirect_url?: string;
    }): Promise<{
        status: "initiated";
        url: string;
        destinationCurrency: "USDC";
        destinationAddress: string;
        provider: "stripe" | "coinbase";
        success: true;
        sessionId: string;
        destinationChain: "base" | "solana" | "polygon";
        clientSecret?: string | undefined;
    }>;
    /**
     * Claim the one-time signup bonus (1 USDC on Base) to this agent wallet
     */
    claimSignupBonus(): Promise<{
        message: string;
        currency: "USDC";
        amount: string;
        chain: "base";
        explorerUrl: string;
        transactionHash: string;
        success: boolean;
        recipientAddress: string;
    }>;
    /**
     * Call Sponge paid APIs via x402
     */
    sponge(request: Record<string, unknown>): Promise<{
        status: "error" | "success" | "payment_required";
        provider: string;
        task: string;
        error?: string | undefined;
        summary?: string | undefined;
        data?: unknown;
        image_data?: string | undefined;
        image_mime_type?: string | undefined;
        payment?: {
            amount: string;
            decimals: number;
            chain: string;
            to: string;
            token: string;
            raw_amount: string;
        } | undefined;
        payment_made?: {
            expiresAt: string;
            amount: string;
            chain: string;
            to: string;
            token: string;
        } | undefined;
        wallet_balance?: Record<string, {
            address: string;
            balances: {
                amount: string;
                token: string;
                usdValue?: string | undefined;
            }[];
        }> | undefined;
        next_step?: string | undefined;
        api_error_details?: unknown;
        receipt?: unknown;
    }>;
    /**
     * Create an x402 payment payload
     */
    createX402Payment(options: {
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
    }): Promise<{
        expiresAt: string;
        paymentPayloadBase64: string;
        paymentRequirements: {
            scheme: "exact";
            network: string;
            maxAmountRequired: string;
            asset: string;
            payTo: string;
        };
        paymentPayload?: unknown;
        headerName?: string | undefined;
    }>;
    /**
     * Fetch any URL with automatic paid API handling
     */
    paidFetch(options: {
        url: string;
        method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        headers?: Record<string, string>;
        body?: unknown;
        chain?: "base" | "solana" | "tempo" | "ethereum";
    }): Promise<unknown>;
    /**
     * Fetch any URL with automatic x402 payment handling
     */
    x402Fetch(options: {
        url: string;
        method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        headers?: Record<string, string>;
        body?: unknown;
        preferredChain?: "base" | "solana" | "ethereum";
        preferred_chain?: "base" | "solana" | "ethereum";
    }): Promise<unknown>;
    /**
     * Fetch any URL with automatic MPP payment handling
     */
    mppFetch(options: {
        url: string;
        method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        headers?: Record<string, string>;
        body?: unknown;
        chain?: "tempo" | "tempo-testnet";
    }): Promise<unknown>;
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
    hyperliquid(args: {
        action: "status" | "order" | "cancel" | "cancel_all" | "set_leverage" | "positions" | "orders" | "fills" | "markets" | "ticker" | "orderbook" | "book_updates" | "funding" | "pnl" | "liquidation_caps" | "liquidations" | "trade_status" | "alerts" | "withdraw" | "transfer" | "chart";
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
    }): Promise<unknown>;
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
    submitPlan(args: {
        title: string;
        reasoning?: string;
        steps: Array<{
            type: "swap";
            chain?: string;
            input_token: string;
            output_token: string;
            amount: string;
            reason: string;
        } | {
            type: "transfer";
            chain: string;
            to: string;
            amount: string;
            currency: string;
            reason: string;
        } | {
            type: "bridge";
            source_chain: string;
            destination_chain: string;
            token: string;
            amount: string;
            destination_token?: string;
            reason: string;
        }>;
    }): Promise<unknown>;
    /**
     * Approve and execute a previously submitted plan
     */
    approvePlan(planId: string): Promise<unknown>;
    /**
     * Propose a single swap for user approval (fetches quote, creates pending proposal)
     */
    proposeTrade(args: {
        input_token: string;
        output_token: string;
        amount: string;
        reason: string;
        chain?: string;
    }): Promise<unknown>;
    /**
     * Create a new agent
     */
    createAgent(options: CreateAgentOptions): Promise<Agent>;
    /**
     * Get all agents for this user
     */
    getAgents(): Promise<Agent[]>;
    /**
     * Get the current agent
     */
    getAgent(): Promise<Agent>;
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
    mcp(): McpConfig;
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
    tools(): Promise<import("./tools/executor.js").ToolExecutor>;
    /**
     * Get the agent ID
     */
    getAgentId(): string;
}
//# sourceMappingURL=client.d.ts.map