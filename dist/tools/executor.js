import { z } from "zod";
import { TOOL_DEFINITIONS } from "./definitions.js";
/**
 * Tool executor for use with the Anthropic SDK
 *
 * Provides tool definitions and an execute method to run tools
 */
export class ToolExecutor {
    http;
    agentId;
    constructor(http, agentId) {
        this.http = http;
        this.agentId = agentId;
    }
    /**
     * Get tool definitions for use with Anthropic SDK
     */
    get definitions() {
        return TOOL_DEFINITIONS;
    }
    /**
     * Execute a tool by name
     *
     * @param name - Tool name
     * @param input - Tool input
     * @returns Tool result
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
     * for (const block of response.content) {
     *   if (block.type === 'tool_use') {
     *     const result = await tools.execute(block.name, block.input);
     *     console.log(result);
     *   }
     * }
     * ```
     */
    async execute(name, input) {
        try {
            const result = await this.callTool(name, input);
            return {
                status: "success",
                data: result,
            };
        }
        catch (error) {
            return {
                status: "error",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Call the MCP tool endpoint
     */
    async callTool(name, input) {
        // Validate tool name
        const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
        if (!tool) {
            throw new Error(`Unknown tool: ${name}`);
        }
        const args = z.record(z.unknown()).parse(input ?? {});
        switch (name) {
            case "get_balance": {
                const allowedChains = Array.isArray(args.allowedChains)
                    ? args.allowedChains.map(String).join(",")
                    : typeof args.allowedChains === "string"
                        ? args.allowedChains
                        : undefined;
                return this.http.get("/api/balances", {
                    chain: args.chain ?? "all",
                    allowedChains,
                    onlyUsdc: args.onlyUsdc ? "true" : undefined,
                });
            }
            case "evm_transfer":
                return this.http.post("/api/transfers/evm", {
                    chain: args.chain,
                    to: args.to,
                    amount: args.amount,
                    currency: args.currency,
                });
            case "solana_transfer":
                return this.http.post("/api/transfers/solana", {
                    chain: args.chain,
                    to: args.to,
                    amount: args.amount,
                    currency: args.currency,
                });
            case "solana_swap":
                return this.http.post("/api/transactions/swap", {
                    chain: args.chain,
                    inputToken: args.inputToken ?? args.input_token,
                    outputToken: args.outputToken ?? args.output_token,
                    amount: args.amount,
                    slippageBps: args.slippageBps ?? args.slippage_bps,
                });
            case "jupiter_swap_quote":
                return this.http.post("/api/transactions/swap/quote", {
                    chain: args.chain,
                    inputToken: args.inputToken ?? args.input_token,
                    outputToken: args.outputToken ?? args.output_token,
                    amount: args.amount,
                    slippageBps: args.slippageBps ?? args.slippage_bps,
                });
            case "jupiter_swap_execute":
                return this.http.post("/api/transactions/swap/execute", {
                    quoteId: args.quoteId ?? args.quote_id,
                });
            case "get_solana_tokens":
                return this.http.get("/api/solana/tokens", {
                    chain: String(args.chain ?? ""),
                });
            case "search_solana_tokens":
                return this.http.get("/api/solana/tokens/search", {
                    query: String(args.query ?? ""),
                    limit: args.limit !== undefined ? String(args.limit) : undefined,
                });
            case "get_transaction_status": {
                const txHash = (args.txHash ?? args.transaction_hash);
                if (!txHash) {
                    throw new Error("txHash is required");
                }
                if (!args.chain) {
                    throw new Error("chain is required");
                }
                return this.http.get(`/api/transactions/status/${encodeURIComponent(txHash)}`, { chain: String(args.chain) });
            }
            case "get_transaction_history":
                return this.http.get("/api/transactions/history", {
                    limit: args.limit !== undefined ? String(args.limit) : undefined,
                    chain: args.chain ? String(args.chain) : undefined,
                });
            case "create_crypto_onramp":
                return this.http.post("/api/onramp/crypto", {
                    wallet_address: args.wallet_address,
                    provider: args.provider,
                    chain: args.chain,
                    fiat_amount: args.fiat_amount,
                    fiat_currency: args.fiat_currency,
                    lock_wallet_address: args.lock_wallet_address,
                    redirect_url: args.redirect_url,
                });
            case "claim_signup_bonus":
                return this.http.post("/api/signup-bonus/claim", {});
            case "sponge":
                return this.http.post("/api/sponge", args);
            case "create_x402_payment":
                return this.http.post("/api/x402/payments", {
                    chain: args.chain,
                    to: args.to,
                    token: args.token,
                    amount: args.amount,
                    decimals: args.decimals,
                    valid_for_seconds: args.valid_for_seconds,
                    resource_url: args.resource_url,
                    resource_description: args.resource_description,
                    fee_payer: args.fee_payer,
                    http_method: args.http_method,
                });
            case "x402_fetch":
                return this.http.post("/api/x402/fetch", {
                    url: args.url,
                    method: args.method,
                    headers: args.headers,
                    body: args.body,
                    preferred_chain: args.preferred_chain ?? args.preferredChain,
                });
            case "mpp_fetch":
                return this.http.post("/api/mpp/fetch", {
                    chain: args.chain,
                    url: args.url,
                    method: args.method,
                    headers: args.headers,
                    body: args.body,
                });
            case "store_key":
                return this.http.post("/api/agent-keys", {
                    service: args.service,
                    key: args.key,
                    label: args.label,
                    metadata: args.metadata,
                });
            case "store_credit_card":
                return this.http.post("/api/credit-cards", {
                    card_number: args.card_number,
                    expiry_month: args.expiry_month,
                    expiry_year: args.expiry_year,
                    expiration: args.expiration,
                    cvc: args.cvc,
                    cardholder_name: args.cardholder_name,
                    email: args.email,
                    billing_address: args.billing_address,
                    shipping_address: args.shipping_address,
                    label: args.label,
                    metadata: args.metadata,
                });
            case "get_key_list":
                return this.http.get("/api/agent-keys", {});
            case "get_key_value":
                return this.http.get("/api/agent-keys/value", {
                    service: String(args.service),
                });
            case "hyperliquid":
                return this.http.post("/api/hyperliquid", {
                    action: args.action,
                    symbol: args.symbol,
                    side: args.side,
                    type: args.type,
                    amount: args.amount,
                    price: args.price,
                    reduce_only: args.reduce_only,
                    trigger_price: args.trigger_price,
                    tp_sl: args.tp_sl,
                    tif: args.tif,
                    order_id: args.order_id,
                    leverage: args.leverage,
                    since: args.since,
                    limit: args.limit,
                    offset: args.offset,
                    query: args.query,
                    market_type: args.market_type,
                    full: args.full,
                    lookback_ms: args.lookback_ms,
                    interval: args.interval,
                    chart_style: args.chart_style,
                    trace_tool_call: args.trace_tool_call,
                    destination: args.destination,
                    to_perp: args.to_perp,
                });
            case "submit_plan":
                return this.http.post("/api/plans/submit", {
                    title: args.title,
                    reasoning: args.reasoning,
                    steps: args.steps,
                });
            case "approve_plan":
                return this.http.post("/api/plans/approve", {
                    plan_id: args.plan_id,
                });
            case "propose_trade":
                return this.http.post("/api/trades/propose", {
                    input_token: args.input_token,
                    output_token: args.output_token,
                    amount: args.amount,
                    reason: args.reason,
                });
            default:
                throw new Error(`Tool not implemented: ${name}`);
        }
    }
}
/**
 * Create a tool executor for use with the Anthropic SDK
 *
 * @param http - HTTP client instance
 * @param agentId - Agent ID
 * @returns Tool executor with definitions and execute method
 */
export function createTools(http, agentId) {
    return new ToolExecutor(http, agentId);
}
//# sourceMappingURL=executor.js.map