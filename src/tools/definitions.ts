// Set to true to re-enable signup bonus claim tool
const SIGNUP_BONUS_ENABLED = false;

/**
 * Tool definitions for use with the Anthropic SDK
 *
 * These definitions follow the Anthropic tool schema format
 */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  cli_output?: CliOutputDefinition;
}

export type AnthropicToolDefinition = Omit<ToolDefinition, "cli_output">;

export function toAnthropicToolDefinition(tool: ToolDefinition): AnthropicToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
  };
}

export type CliOutputKind =
  | "tx"
  | "table"
  | "fields"
  | "link"
  | "http_response";

export interface CliOutputField {
  key: string | string[];
  label: string;
}

export interface CliOutputColumn {
  key: string | string[];
  label: string;
}

export interface CliOutputDefinition {
  kind: CliOutputKind;
  title?: string;
  dataPath?: string;
  emptyMessage?: string;
  fields?: CliOutputField[];
  columns?: CliOutputColumn[];
  linkField?: string;
}

const txOutput = (title?: string): CliOutputDefinition => ({
  kind: "tx",
  title,
});

const fieldsOutput = (
  fields: CliOutputField[],
  title?: string,
  dataPath?: string,
): CliOutputDefinition => ({
  kind: "fields",
  title,
  dataPath,
  fields,
});

const tableOutput = (
  columns: CliOutputColumn[],
  title?: string,
  dataPath?: string,
  emptyMessage?: string,
): CliOutputDefinition => ({
  kind: "table",
  title,
  dataPath,
  emptyMessage,
  columns,
});

const linkOutput = (
  title: string,
  linkField: string,
  fields: CliOutputField[],
): CliOutputDefinition => ({
  kind: "link",
  title,
  linkField,
  fields,
});

const httpResponseOutput = (title: string): CliOutputDefinition => ({
  kind: "http_response",
  title,
});

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "get_balance",
    description:
      "Get the balance of your wallet. Returns balances for native tokens and USDC across all supported chains.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: [
            "ethereum",
            "base",
            "sepolia",
            "base-sepolia",
            "tempo-testnet",
            "tempo",
            "solana",
            "solana-devnet",
          ],
          description:
            "Optional: Specific chain to check balance for. If not provided, returns balances for all chains.",
        },
        allowedChains: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional: Restrict balance results to these chains (e.g., ['base','solana'])",
        },
        onlyUsdc: {
          type: "boolean",
          description: "Optional: Only return USDC balances",
        },
      },
      required: [],
    },
    cli_output: tableOutput(
      [
        { key: "chain", label: "Chain" },
        { key: "token", label: "Token" },
        { key: "amount", label: "Amount" },
        { key: "usdValue", label: "USD" },
      ],
      "Balances",
    ),
  },
  {
    name: "evm_transfer",
    description:
      "Transfer native tokens or USDC on Ethereum, Base, Polygon, or their testnets. Supports native (ETH/POL) and USDC transfers.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["ethereum", "base", "polygon", "sepolia", "base-sepolia", "polygon-amoy"],
          description: "The chain to transfer on",
        },
        to: {
          type: "string",
          description: "The recipient address (0x...)",
        },
        amount: {
          type: "string",
          description:
            "The amount to transfer (e.g., '0.1' for 0.1 ETH/POL or '100' for 100 USDC)",
        },
        currency: {
          type: "string",
          enum: ["ETH", "POL", "USDC"],
          description: "The currency to transfer (ETH for Ethereum/Base, POL for Polygon, or USDC)",
        },
      },
      required: ["chain", "to", "amount", "currency"],
    },
    cli_output: txOutput("Transfer submitted"),
  },
  {
    name: "solana_transfer",
    description:
      "Transfer SOL or USDC on Solana mainnet or devnet. Supports native SOL and USDC transfers.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["solana", "solana-devnet"],
          description: "The Solana network to use",
        },
        to: {
          type: "string",
          description: "The recipient address",
        },
        amount: {
          type: "string",
          description: "The amount to transfer",
        },
        currency: {
          type: "string",
          enum: ["SOL", "USDC"],
          description: "The currency to transfer",
        },
      },
      required: ["chain", "to", "amount", "currency"],
    },
    cli_output: txOutput("Transfer submitted"),
  },
  {
    name: "solana_sign_transaction",
    description:
      "Sign a pre-built Solana transaction without submitting it. Use this when another API returns a base64 serialized Solana transaction for the agent wallet to sign.",
    input_schema: {
      type: "object",
      properties: {
        transaction: {
          type: "string",
          description: "Base64-encoded serialized Solana transaction",
        },
      },
      required: ["transaction"],
    },
    cli_output: fieldsOutput(
      [
        { key: "signature", label: "Signature" },
        { key: "from", label: "Signer" },
        { key: "chain", label: "Chain" },
      ],
      "Transaction signed",
    ),
  },
  {
    name: "solana_sign_and_send_transaction",
    description:
      "Sign a pre-built Solana transaction and immediately submit it. Use this when another API returns a base64 serialized Solana transaction for the agent wallet to sign and broadcast.",
    input_schema: {
      type: "object",
      properties: {
        transaction: {
          type: "string",
          description: "Base64-encoded serialized Solana transaction",
        },
      },
      required: ["transaction"],
    },
    cli_output: txOutput("Transaction submitted"),
  },
  {
    name: "solana_swap",
    description:
      "Swap tokens on Solana using Jupiter aggregator. Finds the best route and executes the swap.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["solana", "solana-devnet"],
          description: "The Solana network to use",
        },
        inputToken: {
          type: "string",
          description:
            "The token to swap from (symbol like 'SOL', 'USDC', or token address)",
        },
        outputToken: {
          type: "string",
          description:
            "The token to swap to (symbol like 'SOL', 'USDC', or token address)",
        },
        amount: {
          type: "string",
          description: "The amount of input token to swap",
        },
        slippageBps: {
          type: "number",
          description:
            "Slippage tolerance in basis points (default: 50 = 0.5%)",
        },
      },
      required: ["chain", "inputToken", "outputToken", "amount"],
    },
    cli_output: txOutput("Swap submitted"),
  },
  {
    name: "jupiter_swap_quote",
    description:
      "Get a swap quote from Jupiter without executing. Returns pricing details so you can review before committing. Call jupiter_swap_execute with the returned quoteId to execute. Quotes expire in ~30 seconds.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["solana", "solana-devnet"],
          description: "The Solana network to use",
        },
        inputToken: {
          type: "string",
          description:
            "The token to swap from (symbol like 'SOL', 'USDC', or mint address)",
        },
        outputToken: {
          type: "string",
          description:
            "The token to swap to (symbol like 'SOL', 'USDC', or mint address)",
        },
        amount: {
          type: "string",
          description: "The amount of input token to swap",
        },
        slippageBps: {
          type: "number",
          description:
            "Slippage tolerance in basis points (default: 50 = 0.5%)",
        },
      },
      required: ["chain", "inputToken", "outputToken", "amount"],
    },
    cli_output: fieldsOutput(
      [
        { key: "quoteId", label: "Quote ID" },
        { key: "inputToken.amount", label: "Input amount" },
        { key: "inputToken.symbol", label: "Input token" },
        { key: "outputToken.amount", label: "Output amount" },
        { key: "outputToken.symbol", label: "Output token" },
        { key: "exchangeRate", label: "Exchange rate" },
        { key: "priceImpactPct", label: "Price impact" },
        { key: "router", label: "Router" },
        { key: "expiresAt", label: "Expires at" },
      ],
      "Swap quote",
    ),
  },
  {
    name: "jupiter_swap_execute",
    description:
      "Execute a previously obtained Jupiter swap quote. Takes a quoteId from jupiter_swap_quote. Quotes expire in ~30 seconds and can only be executed once.",
    input_schema: {
      type: "object",
      properties: {
        quoteId: {
          type: "string",
          description: "The quoteId returned from jupiter_swap_quote",
        },
      },
      required: ["quoteId"],
    },
    cli_output: txOutput("Swap executed"),
  },
  {
    name: "base_swap",
    description:
      "Swap tokens on Base using 0x Protocol aggregator. Finds the best route across DEXs (Uniswap, Aerodrome, etc.) and executes the swap.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["base", "base-sepolia"],
          description: "The Base network to use",
        },
        inputToken: {
          type: "string",
          description:
            "The token to swap from (symbol like 'ETH', 'USDC', 'WETH', or token address)",
        },
        outputToken: {
          type: "string",
          description:
            "The token to swap to (symbol like 'ETH', 'USDC', 'WETH', or token address)",
        },
        amount: {
          type: "string",
          description: "The amount of input token to swap (e.g., '0.1' for 0.1 ETH)",
        },
        slippageBps: {
          type: "number",
          description:
            "Slippage tolerance in basis points (default: 50 = 0.5%)",
        },
      },
      required: ["chain", "inputToken", "outputToken", "amount"],
    },
    cli_output: txOutput("Swap submitted"),
  },
  {
    name: "tempo_swap",
    description:
      "Swap stablecoins on Tempo using the native StablecoinExchange DEX. Supports pathUSD, USDC.e, and other Tempo stablecoin flavors.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["tempo", "tempo-testnet"],
          description: "The Tempo network to use",
        },
        inputToken: {
          type: "string",
          description:
            "The token to swap from (symbol like 'pathUSD', 'USDC.e', or token address)",
        },
        outputToken: {
          type: "string",
          description:
            "The token to swap to (symbol like 'pathUSD', 'USDC.e', or token address)",
        },
        amount: {
          type: "string",
          description: "The amount of input token to swap (e.g., '1.0')",
        },
        slippageBps: {
          type: "number",
          description:
            "Slippage tolerance in basis points (default: 50 = 0.5%)",
        },
      },
      required: ["chain", "inputToken", "outputToken", "amount"],
    },
    cli_output: txOutput("Swap submitted"),
  },
  {
    name: "bridge",
    description:
      "Bridge tokens between different blockchains using deBridge. Supports Ethereum, Base, and Solana.",
    input_schema: {
      type: "object",
      properties: {
        sourceChain: {
          type: "string",
          enum: ["ethereum", "base", "sepolia", "base-sepolia", "solana", "solana-devnet"],
          description: "The source chain to bridge FROM",
        },
        destinationChain: {
          type: "string",
          enum: ["ethereum", "base", "sepolia", "base-sepolia", "solana", "solana-devnet"],
          description: "The destination chain to bridge TO",
        },
        token: {
          type: "string",
          description:
            "The token to bridge (symbol like 'ETH', 'USDC', 'SOL', or token address)",
        },
        amount: {
          type: "string",
          description: "The amount to bridge (e.g., '0.1' for 0.1 ETH)",
        },
        destinationToken: {
          type: "string",
          description:
            "Optional: receive a different token on the destination chain",
        },
        recipientAddress: {
          type: "string",
          description:
            "Optional: send to a different address on the destination chain",
        },
      },
      required: ["sourceChain", "destinationChain", "token", "amount"],
    },
    cli_output: txOutput("Bridge submitted"),
  },
  {
    name: "get_solana_tokens",
    description:
      "List all SPL tokens held by the agent's Solana wallet, with balances and metadata.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["solana", "solana-devnet"],
          description: "The Solana network to use",
        },
      },
      required: ["chain"],
    },
    cli_output: tableOutput(
      [
        { key: "symbol", label: "Symbol" },
        { key: "name", label: "Name" },
        { key: "balance", label: "Balance" },
        { key: "verified", label: "Verified" },
      ],
      "Solana tokens",
      "tokens",
      "No SPL tokens found.",
    ),
  },
  {
    name: "search_solana_tokens",
    description: "Search the Jupiter token list by symbol or name.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (symbol or name)",
        },
        limit: {
          type: "number",
          description: "Max results (default 10, max 20)",
        },
      },
      required: ["query"],
    },
    cli_output: tableOutput(
      [
        { key: "symbol", label: "Symbol" },
        { key: "name", label: "Name" },
        { key: "mint", label: "Mint" },
        { key: "verified", label: "Verified" },
      ],
      "Token search results",
      "tokens",
      "No tokens found.",
    ),
  },
  {
    name: "get_transaction_status",
    description: "Check the status of a transaction by its hash/signature.",
    input_schema: {
      type: "object",
      properties: {
        txHash: {
          type: "string",
          description: "The transaction hash (EVM) or signature (Solana)",
        },
        chain: {
          type: "string",
          enum: [
            "ethereum",
            "base",
            "sepolia",
            "base-sepolia",
            "tempo-testnet",
            "tempo",
            "solana",
            "solana-devnet",
          ],
          description: "Chain for the transaction",
        },
      },
      required: ["txHash", "chain"],
    },
    cli_output: fieldsOutput(
      [
        { key: ["transactionHash", "txHash", "signature"], label: "Transaction" },
        { key: "status", label: "Status" },
        { key: "chain", label: "Chain" },
        { key: "explorerUrl", label: "Explorer" },
        { key: "message", label: "Message" },
      ],
      "Transaction status",
    ),
  },
  {
    name: "get_transaction_history",
    description: "Get recent transaction history for this agent's wallets.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of transactions to return (default: 50)",
        },
        chain: {
          type: "string",
          description: "Optional: filter by chain",
        },
      },
      required: [],
    },
    cli_output: tableOutput(
      [
        { key: "chain", label: "Chain" },
        { key: "value", label: "Amount" },
        { key: "token", label: "Token" },
        { key: "status", label: "Status" },
        { key: "timestamp", label: "Timestamp" },
      ],
      "Transaction history",
      "transactions",
      "No transactions found.",
    ),
  },
  {
    name: "create_crypto_onramp",
    description:
      "Create a fiat-to-crypto onramp link to purchase USDC directly into the agent wallet.",
    input_schema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "Agent wallet address for the destination chain",
        },
        provider: {
          type: "string",
          enum: ["auto", "stripe", "coinbase"],
          description: "Onramp provider selection (default: auto)",
        },
        chain: {
          type: "string",
          enum: ["base", "solana", "polygon"],
          description: "Destination chain for purchased USDC (default: base)",
        },
        fiat_amount: {
          type: "string",
          description: "Optional fiat amount to prefill, e.g. '100'",
        },
        fiat_currency: {
          type: "string",
          description: "Optional fiat currency code (default: usd)",
        },
        lock_wallet_address: {
          type: "boolean",
          description: "For Stripe: lock destination wallet address (default: true)",
        },
        redirect_url: {
          type: "string",
          description: "For Coinbase: optional redirect URL after checkout",
        },
      },
      required: ["wallet_address"],
    },
    cli_output: linkOutput("Onramp session", "url", [
      { key: "provider", label: "Provider" },
      { key: "status", label: "Status" },
      { key: "destinationChain", label: "Destination chain" },
      { key: "destinationAddress", label: "Destination address" },
      { key: "sessionId", label: "Session ID" },
    ]),
  },
  ...(SIGNUP_BONUS_ENABLED
    ? [
        {
          name: "claim_signup_bonus" as const,
          description:
            "Claim a one-time signup bonus that sends 1 USDC on Base to the current agent wallet.",
          input_schema: {
            type: "object" as const,
            properties: {},
            required: [] as string[],
          },
          cli_output: txOutput("Signup bonus claimed"),
        },
      ]
    : []),
  {
    name: "paid_fetch",
    description:
      "Make an HTTP request with automatic paid API handling. " +
      "This is the main one-shot paid fetch tool. It detects x402 or MPP from the endpoint's 402 challenge, " +
      "handles the matching payment flow, and if both are advertised chooses the route with the highest available stablecoin balance.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          description: "HTTP method (default: GET)",
        },
        headers: {
          type: "object",
          description: "Additional HTTP headers to include",
        },
        body: {
          type: "object",
          description:
            "Request body (for POST/PUT/PATCH). Will be JSON-stringified if not already a string.",
        },
        chain: {
          type: "string",
          enum: ["base", "solana", "tempo", "ethereum"],
          description:
            "Preferred wallet chain to spend from. This is a hint, not a hard requirement.",
        },
        protocol: {
          type: "string",
          enum: ["x402", "mpp"],
          description:
            "Explicit protocol override/debug option. Omit to route from the endpoint's 402 response and balance tie-breaker.",
        },
      },
      required: ["url"],
    },
    cli_output: httpResponseOutput("Paid fetch"),
  },
  {
    name: "discover_services",
    description:
      "Discover paid API services by query, category, or type. Use this before paid_fetch, x402_fetch, or mpp_fetch when you do not already know the exact endpoint, HTTP method, parameters, and pricing.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query, e.g. 'web search' or 'Parallel MPP search'",
        },
        category: {
          type: "string",
          description: "Optional service category filter, e.g. 'search'",
        },
        type: {
          type: "string",
          description: "Optional service type filter",
        },
        limit: {
          type: "number",
          description: "Maximum number of services to return",
        },
        offset: {
          type: "number",
          description: "Result offset for pagination",
        },
      },
      required: [],
    },
  },
  {
    name: "get_service",
    description:
      "Get endpoint, parameter, method, and pricing details for a service returned by discover_services. Use this before fetching a paid API when endpoint details are not already known.",
    input_schema: {
      type: "object",
      properties: {
        service_id: {
          type: "string",
          description: "The service ID returned by discover_services",
        },
      },
      required: ["service_id"],
    },
  },
  {
    name: "x402_fetch",
    description:
      "Make an HTTP request with automatic x402 payment handling. " +
      "Handles the entire x402 payment flow: makes the request, if 402 Payment Required is returned " +
      "it extracts payment requirements, creates and signs a USDC payment, retries with Payment-Signature header, " +
      "and returns the final response. Supports Base and Solana payments.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          description: "HTTP method (default: GET)",
        },
        headers: {
          type: "object",
          description: "Additional HTTP headers to include",
        },
        body: {
          type: "object",
          description:
            "Request body (for POST/PUT/PATCH). Will be JSON-stringified if not already a string.",
        },
        preferred_chain: {
          type: "string",
          enum: ["base", "solana", "ethereum"],
          description:
            "Preferred chain for x402 payment. If set, this chain will be tried first. Defaults to Base.",
        },
      },
      required: ["url"],
    },
    cli_output: httpResponseOutput("x402 fetch"),
  },
  {
    name: "mpp_fetch",
    description:
      "Make an HTTP request with automatic MPP payment handling via Mppx.create. " +
      "If the endpoint returns a 402 Payment challenge, the client creates a Payment credential and retries automatically.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["tempo-testnet", "tempo"],
          description: "Payment chain to use",
        },
        url: {
          type: "string",
          description: "The URL to fetch",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          description: "HTTP method (default: GET)",
        },
        headers: {
          type: "object",
          description: "Additional HTTP headers to include",
        },
        body: {
          type: "object",
          description:
            "Request body (for POST/PUT/PATCH). Will be JSON-stringified if not already a string.",
        },
      },
      required: ["url"],
    },
    cli_output: httpResponseOutput("MPP fetch"),
  },
  {
    name: "hyperliquid",
    description:
      "Trade perps and spot on Hyperliquid DEX. Uses your agent's EVM wallet for signing (no API keys needed).\n\n" +
      "ACTIONS:\n" +
      "  Read: status, positions, orders, fills, markets, ticker, orderbook, book_updates, funding, pnl, liquidation_caps, liquidations, trade_status, alerts, chart\n" +
      "  Write (requires hyperliquid:trade scope): order, cancel, cancel_all, set_leverage, withdraw, transfer\n\n" +
      "UX:\n" +
      "- Responses include tool_call metadata with tool name + arguments by default\n" +
      "- chart supports live-line/candle rendering via chart_style\n\n" +
      "ORDER PARAMETERS (for action=\"order\"):\n" +
      "- symbol: CCXT symbol (e.g., \"BTC/USDC:USDC\" for perps, \"PURR/USDC\" for spot)\n" +
      "- side: \"buy\" or \"sell\"\n" +
      "- type: \"limit\" or \"market\"\n" +
      "- amount: Order size in base currency (e.g., \"0.001\" for BTC)\n" +
      "- price: Limit price (required for limit orders)\n\n" +
      "DEPOSIT: Use the bridge tool to deposit USDC to Hyperliquid (e.g., bridge from base to hyperliquid).",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "status",
            "order",
            "cancel",
            "cancel_all",
            "set_leverage",
            "positions",
            "orders",
            "fills",
            "markets",
            "ticker",
            "orderbook",
            "book_updates",
            "funding",
            "pnl",
            "liquidation_caps",
            "liquidations",
            "trade_status",
            "alerts",
            "withdraw",
            "transfer",
            "chart",
          ],
          description: "Action to perform",
        },
        symbol: {
          type: "string",
          description:
            "CCXT symbol (e.g., 'BTC/USDC:USDC' for perps, 'PURR/USDC' for spot)",
        },
        side: {
          type: "string",
          enum: ["buy", "sell"],
          description: "Buy or sell (for orders)",
        },
        type: {
          type: "string",
          enum: ["limit", "market"],
          description: "Order type",
        },
        amount: {
          type: "string",
          description: "Order size in base currency (e.g., '0.001')",
        },
        price: {
          type: "string",
          description: "Limit price (required for limit orders)",
        },
        reduce_only: {
          type: "boolean",
          description: "Reduce-only order (default: false)",
        },
        trigger_price: {
          type: "string",
          description: "Trigger price for stop-loss/take-profit",
        },
        tp_sl: {
          type: "string",
          enum: ["tp", "sl"],
          description:
            "Take-profit or stop-loss (required if trigger_price set)",
        },
        tif: {
          type: "string",
          enum: ["GTC", "IOC", "PO"],
          description: "Time-in-force: GTC (default), IOC, PO (post-only)",
        },
        order_id: {
          type: "string",
          description: "Order ID to cancel",
        },
        leverage: {
          type: "number",
          description: "Leverage multiplier (1-100)",
        },
        since: {
          type: "number",
          description: "Start timestamp for fills query (ms)",
        },
        limit: {
          type: "number",
          description: "Max results (fills/orderbook/markets page size)",
        },
        offset: {
          type: "number",
          description: "Pagination offset for markets",
        },
        query: {
          type: "string",
          description: "Filter markets by symbol/base/quote substring",
        },
        market_type: {
          type: "string",
          enum: ["spot", "swap"],
          description: "Filter markets by type",
        },
        full: {
          type: "boolean",
          description:
            "For markets: true returns full market objects (larger payload)",
        },
        lookback_ms: {
          type: "number",
          description:
            "Lookback window for trade_status/alerts in milliseconds",
        },
        interval: {
          type: "string",
          enum: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
          description: "Candle interval for chart action",
        },
        chart_style: {
          type: "string",
          enum: ["sparkline", "live_line", "candles", "live_line_candles"],
          description:
            "Chart render style for chart action (default: live_line)",
        },
        trace_tool_call: {
          type: "boolean",
          description:
            "Include tool_call metadata (tool + arguments + timestamp) in response",
        },
        destination: {
          type: "string",
          description: "Destination wallet address for withdraw",
        },
        to_perp: {
          type: "boolean",
          description:
            "Transfer direction: true = spot→perps, false = perps→spot",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "store_key",
    description:
      "Store a key for a third-party service (encrypted at rest). " +
      "Use this when the agent receives a new key from a signup or provisioning flow. " +
      "Storing again for the same service updates/replaces the existing key.",
    input_schema: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Service name identifier (e.g., 'openai', 'perplexity', 'serpapi')",
        },
        key: {
          type: "string",
          description: "The key value to store",
        },
        label: {
          type: "string",
          description: "Optional label/note (e.g., 'primary', 'billing account A')",
        },
        metadata: {
          type: "object",
          description: "Optional metadata to store alongside the key",
        },
      },
      required: ["service", "key"],
    },
    cli_output: fieldsOutput(
      [
        { key: "service", label: "Service" },
        { key: "label", label: "Label" },
        { key: "key_preview", label: "Preview" },
        { key: "created_at", label: "Created" },
      ],
      "Key stored",
    ),
  },
  {
    name: "bank_onboard",
    description:
      "Start or resume banking onboarding. Returns a Persona KYC URL until internal KYC is approved, then a Bridge terms URL unless the customer is already active.",
    input_schema: {
      type: "object",
      properties: {
        wallet_id: {
          type: "string",
          description: "Optional wallet ID to associate with the onboarding request.",
        },
        redirect_uri: {
          type: "string",
          description: "URL to redirect to after KYC completion.",
        },
        customer_type: {
          type: "string",
          enum: ["individual", "business"],
          description: "Customer type. Persona-backed bank onboarding currently supports individual customers only.",
        },
        signed_agreement_id: {
          type: "string",
          description: "Bridge signed agreement ID from the terms redirect, used to finish Persona-backed customer creation.",
        },
      },
      required: [],
    },
    cli_output: fieldsOutput(
      [
        { key: "kyc_url", label: "Verification URL" },
        { key: ["customer", "kycStatus"], label: "KYC status" },
        { key: ["customer", "tosStatus"], label: "TOS status" },
        { key: "message", label: "Message" },
      ],
      "Bank onboarding",
    ),
  },
  {
    name: "bank_status",
    description:
      "Check Bridge banking onboarding, KYC, terms, and capability status.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
    cli_output: fieldsOutput(
      [
        { key: "onboarded", label: "Onboarded" },
        { key: ["customer", "status"], label: "Status" },
        { key: ["customer", "kycStatus"], label: "KYC status" },
        { key: ["customer", "tosStatus"], label: "TOS status" },
        { key: ["customer", "hostedLinkUrl"], label: "Hosted link" },
        { key: "message", label: "Message" },
      ],
      "Bank status",
    ),
  },
  {
    name: "bank_create_virtual_account",
    description:
      "Create or retrieve a virtual bank account for a wallet to receive USD deposits as USDC.",
    input_schema: {
      type: "object",
      properties: {
        wallet_id: {
          type: "string",
          description: "Wallet ID to create a virtual account for.",
        },
      },
      required: ["wallet_id"],
    },
    cli_output: fieldsOutput(
      [
        { key: ["virtual_account", "id"], label: "ID" },
        { key: ["virtual_account", "status"], label: "Status" },
        { key: ["virtual_account", "walletId"], label: "Wallet" },
        { key: ["virtual_account", "destinationPaymentRail"], label: "Rail" },
        { key: ["virtual_account", "destinationAddress"], label: "Destination" },
        { key: ["virtual_account", "depositInstructions"], label: "Deposit instructions" },
        { key: "message", label: "Message" },
      ],
      "Virtual bank account",
    ),
  },
  {
    name: "bank_get_virtual_account",
    description:
      "Get virtual bank account deposit instructions for one wallet, or list all virtual bank accounts.",
    input_schema: {
      type: "object",
      properties: {
        wallet_id: {
          type: "string",
          description: "Wallet ID to get. Omit to list all virtual accounts.",
        },
      },
      required: [],
    },
    cli_output: fieldsOutput(
      [
        { key: "found", label: "Found" },
        { key: "count", label: "Count" },
        { key: "accounts", label: "Accounts" },
        { key: ["virtual_account", "id"], label: "ID" },
        { key: ["virtual_account", "status"], label: "Status" },
        { key: ["virtual_account", "depositInstructions"], label: "Deposit instructions" },
        { key: "message", label: "Message" },
      ],
      "Virtual bank account",
    ),
  },
  {
    name: "bank_list_external_accounts",
    description: "List linked external US bank accounts for ACH or wire payouts.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
    cli_output: tableOutput(
      [
        { key: "id", label: "ID" },
        { key: "bankName", label: "Bank" },
        { key: "last4", label: "Last 4" },
        { key: "accountType", label: "Type" },
        { key: "active", label: "Active" },
      ],
      "External bank accounts",
      "accounts",
      "No linked bank accounts found.",
    ),
  },
  {
    name: "bank_add_external_account",
    description:
      "Link an external US bank account for receiving USD ACH or wire payouts.",
    input_schema: {
      type: "object",
      properties: {
        bank_name: { type: "string", description: "Bank name." },
        account_owner_name: { type: "string", description: "Full name of the account holder." },
        routing_number: { type: "string", description: "9-digit ABA routing number." },
        account_number: { type: "string", description: "Bank account number." },
        checking_or_savings: {
          type: "string",
          enum: ["checking", "savings"],
          description: "Bank account type.",
        },
        street_line_1: { type: "string", description: "Account holder street address line 1." },
        street_line_2: { type: "string", description: "Street address line 2." },
        city: { type: "string", description: "City." },
        state: { type: "string", description: "US state, e.g. CA." },
        postal_code: { type: "string", description: "ZIP code." },
      },
      required: [
        "bank_name",
        "account_owner_name",
        "routing_number",
        "account_number",
        "checking_or_savings",
        "street_line_1",
        "city",
        "state",
        "postal_code",
      ],
    },
    cli_output: fieldsOutput(
      [
        { key: ["account", "id"], label: "ID" },
        { key: ["account", "bankName"], label: "Bank" },
        { key: ["account", "last4"], label: "Last 4" },
        { key: ["account", "accountType"], label: "Type" },
        { key: "message", label: "Message" },
      ],
      "External bank account",
    ),
  },
  {
    name: "bank_send",
    description:
      "Send USD from a crypto wallet to a linked external bank account by funding a Bridge payout with USDC.",
    input_schema: {
      type: "object",
      properties: {
        wallet_id: { type: "string", description: "Wallet ID to send USDC from." },
        external_account_id: {
          type: "string",
          description: "External bank account ID from bank_list_external_accounts.",
        },
        amount: { type: "string", description: "USD amount, e.g. '100.00'." },
        payment_rail: {
          type: "string",
          enum: ["ach", "wire"],
          description: "Payout rail. Defaults to ach.",
        },
      },
      required: ["wallet_id", "external_account_id", "amount"],
    },
    cli_output: fieldsOutput(
      [
        { key: ["transfer", "id"], label: "ID" },
        { key: ["transfer", "status"], label: "Status" },
        { key: ["transfer", "amount"], label: "Amount" },
        { key: ["transfer", "destinationPaymentRail"], label: "Rail" },
        { key: ["transfer", "fundingTxHash"], label: "Funding tx" },
        { key: ["transfer", "fundingExplorerUrl"], label: "Explorer" },
        { key: "message", label: "Message" },
      ],
      "Bank transfer",
    ),
  },
  {
    name: "bank_list_transfers",
    description: "List bank transfer history, optionally filtered by transfer ID.",
    input_schema: {
      type: "object",
      properties: {
        transfer_id: {
          type: "string",
          description: "Optional transfer ID to filter by.",
        },
      },
      required: [],
    },
    cli_output: tableOutput(
      [
        { key: "id", label: "ID" },
        { key: "status", label: "Status" },
        { key: "amount", label: "Amount" },
        { key: "destinationPaymentRail", label: "Rail" },
        { key: "fundingTxHash", label: "Funding tx" },
        { key: "createdAt", label: "Created" },
      ],
      "Bank transfers",
      "transfers",
      "No bank transfers found.",
    ),
  },
  {
    name: "store_credit_card",
    description:
      "Store credit card details in encrypted secret storage for this agent. " +
      "Use this dedicated tool for payment card data instead of store_key.",
    input_schema: {
      type: "object",
      properties: {
        card_number: {
          type: "string",
          description: "Card number (PAN)",
        },
        expiry_month: {
          type: "string",
          description: "Expiry month (1-12). Optional if expiration is provided.",
        },
        expiry_year: {
          type: "string",
          description: "Expiry year (2 or 4 digits). Optional if expiration is provided.",
        },
        expiration: {
          type: "string",
          description: "Expiration in MM/YYYY format (alternative to expiry_month + expiry_year)",
        },
        cvc: {
          type: "string",
          description: "Card verification code (3-4 digits)",
        },
        cardholder_name: {
          type: "string",
          description: "Name on card",
        },
        email: {
          type: "string",
          description: "Email address",
        },
        billing_address: {
          type: "object",
          description: "Billing address",
          properties: {
            line1: { type: "string" },
            line2: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postal_code: { type: "string" },
            country: { type: "string" },
          },
          required: ["line1", "city", "state", "postal_code", "country"],
        },
        shipping_address: {
          type: "object",
          description: "Shipping address",
          properties: {
            line1: { type: "string" },
            line2: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postal_code: { type: "string" },
            country: { type: "string" },
            phone: { type: "string" },
          },
          required: ["line1", "city", "state", "postal_code", "country", "phone"],
        },
        label: {
          type: "string",
          description: "Optional card label/nickname",
        },
        metadata: {
          type: "object",
          description: "Optional metadata to store alongside the card",
        },
      },
      required: ["card_number", "cvc", "cardholder_name", "email", "billing_address", "shipping_address"],
    },
    cli_output: fieldsOutput(
      [
        { key: "service", label: "Service" },
        { key: "label", label: "Label" },
        { key: "card_last4", label: "Card last4" },
        { key: "key_preview", label: "Preview" },
        { key: "created_at", label: "Created" },
      ],
      "Card stored",
    ),
  },
  {
    name: "add_link_payment_method",
    description:
      "Connect Link and save a Link payment method for checkout. " +
      "Call without contact/address details to start Link login if needed. " +
      "After approval, call again with shipping, email, and phone to save the only payment method or pass link_payment_method_id if multiple methods are available. " +
      "Billing is optional metadata.",
    input_schema: {
      type: "object",
      properties: {
        link_payment_method_id: {
          type: "string",
          description: "Link payment method ID to save. Required only if multiple Link methods are available.",
        },
        set_as_default: {
          type: "boolean",
          description: "Whether to make this the default Link payment method. Defaults to true.",
        },
        client_name: {
          type: "string",
          description: "Optional Link connection label shown during auth.",
        },
        email: {
          type: "string",
          description: "Required when saving the Link payment method. Not required to start Link login.",
        },
        phone: {
          type: "string",
          description: "Required when saving the Link payment method. Not required to start Link login.",
        },
        billing: {
          type: "object",
          description: "Optional billing address to store with the Link payment method.",
          properties: {
            name: { type: "string" },
            line1: { type: "string" },
            line2: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            country: { type: "string" },
          },
        },
        shipping: {
          type: "object",
          description: "Required shipping address when saving the Link payment method. Not required to start Link login.",
          properties: {
            name: { type: "string" },
            line1: { type: "string" },
            line2: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            country: { type: "string" },
          },
          required: ["name", "line1", "city", "state", "postalCode", "country"],
        },
      },
      required: [],
    },
  },
  {
    name: "create_link_payment_credential",
    description:
      "Generate a one-time Link card credential from a saved Link payment method for a specific merchant and amount. " +
      "Use this after `add_link_payment_method` has saved a Link method to the agent. " +
      "If link_payment_method_id is omitted, the default saved Link payment method is used. " +
      "First call with amount and merchant details returns approval_required when user approval is needed; after approval, call again with spend_request_id to retrieve the credential.",
    input_schema: {
      type: "object",
      properties: {
        link_payment_method_id: {
          type: "string",
          description:
            "Saved Link payment method id. May be either Sponge's saved method id or Link's payment method id. Defaults to the agent's default saved Link method.",
        },
        spend_request_id: {
          type: "string",
          description:
            "Existing Link spend request id returned by an approval_required response. Use after the user approves.",
        },
        amount: {
          type: "string",
          description:
            "Purchase amount as a decimal string, e.g. '49.99'. Required when creating a new spend request.",
        },
        currency: {
          type: "string",
          description: "ISO 4217 currency code. Defaults to USD.",
        },
        merchant_name: {
          type: "string",
          description: "Merchant name for the Link spend request. Required when creating a new spend request.",
        },
        merchant_url: {
          type: "string",
          description: "Merchant URL for the Link spend request. Required when creating a new spend request.",
        },
        context: {
          type: "string",
          description: "Optional context shown to the user during Link approval.",
        },
      },
      required: [],
    },
  },
  {
    name: "report_card_usage",
    description:
      "Report the outcome of a purchase attempt that used a stored or vaulted card. " +
      "Use this after checkout to log success/failure and update spending usage.",
    input_schema: {
      type: "object",
      properties: {
        payment_method_id: { type: "string", description: "Payment method ID used for the purchase." },
        merchant_name: { type: "string", description: "Merchant name." },
        merchant_domain: { type: "string", description: "Merchant domain." },
        amount: { type: "string", description: "Amount charged or attempted." },
        currency: { type: "string", description: "Currency for the amount, e.g. USD." },
        status: {
          type: "string",
          enum: ["success", "failed", "cancelled"],
          description: "Outcome of the purchase attempt.",
        },
        failure_reason: { type: "string", description: "Failure reason when status is failed." },
      },
      required: ["payment_method_id", "status"],
    },
    cli_output: fieldsOutput(
      [
        { key: "status", label: "Status" },
        { key: "message", label: "Message" },
        { key: "payment_method_id", label: "Payment method" },
      ],
      "Card usage",
    ),
  },
  {
    name: "get_sponge_card_status",
    description:
      "Get the user's Sponge Card onboarding, consent, card, and balance status. " +
      "Use this before onboarding, terms acceptance, card creation, funding, withdrawal, or card-detail retrieval. " +
      "Card balance amounts include explicit cent fields and formatted USD display fields, e.g. spending_power_cents=250 means spending_power_display='$2.50'.",
    input_schema: {
      type: "object",
      properties: {
        refresh: {
          type: "boolean",
          description: "Force-refresh issuer application status before returning. Defaults to true.",
        },
      },
      required: [],
    },
    cli_output: fieldsOutput(
      [
        { key: "onboarded", label: "Onboarded" },
        { key: "environment", label: "Environment" },
        { key: "ready_for_card_creation", label: "Ready for card creation" },
        { key: ["customer", "application_status"], label: "Application status" },
        { key: ["balances", "spending_power_display"], label: "Spending power" },
        { key: ["balances", "credit_limit_display"], label: "Credit limit" },
        { key: ["balances", "pending_charges_display"], label: "Pending charges" },
        { key: ["balances", "posted_charges_display"], label: "Posted charges" },
        { key: ["balances", "balance_due_display"], label: "Balance due" },
        { key: "completion_link_url", label: "Completion link" },
        { key: "message", label: "Message" },
      ],
      "Sponge Card status",
    ),
  },
  {
    name: "onboard_sponge_card",
    description:
      "Start Sponge Card onboarding for the authenticated user, returning a Persona KYC URL first when internal KYC is missing, and record Sponge consent acknowledgements. " +
      "The issuer environment is determined by API key mode. Call get_sponge_card_status afterwards to check approval.",
    input_schema: {
      type: "object",
      properties: {
        redirect_uri: {
          type: "string",
          description: "URL Persona redirects to after KYC completion.",
        },
        occupation: { type: "string", description: "Occupation or SOC code." },
        e_sign_consent: { type: "boolean", description: "Must be true: user accepts the E-Sign Consent." },
        account_opening_privacy_notice: {
          type: "boolean",
          description: "Required for US KYC: user accepts the Account Opening Privacy Notice.",
        },
        sponge_card_terms: {
          type: "boolean",
          description: "Must be true: user accepts Sponge Card terms and issuer privacy policy.",
        },
        information_certification: {
          type: "boolean",
          description: "Must be true: user certifies Persona KYC information is accurate.",
        },
        unauthorized_solicitation_acknowledgement: {
          type: "boolean",
          description: "Must be true: user acknowledges applying is not unauthorized solicitation.",
        },
      },
      required: [],
    },
    cli_output: fieldsOutput(
      [
        { key: "submitted_application", label: "Submitted application" },
        { key: "environment", label: "Environment" },
        { key: "ready_for_card_creation", label: "Ready for card creation" },
        { key: "kyc_url", label: "KYC URL" },
        { key: "message", label: "Message" },
      ],
      "Sponge Card onboarding",
    ),
  },
  {
    name: "accept_sponge_card_terms",
    description:
      "Record Sponge Card consent acknowledgements for an existing application. " +
      "Use this when get_sponge_card_status says the application is approved but Sponge consent is missing.",
    input_schema: {
      type: "object",
      properties: {
        e_sign_consent: { type: "boolean", description: "Must be true: user accepts the E-Sign Consent." },
        account_opening_privacy_notice: {
          type: "boolean",
          description: "Required for US KYC: user accepts the Account Opening Privacy Notice.",
        },
        sponge_card_terms: {
          type: "boolean",
          description: "Must be true: user accepts Sponge Card terms and issuer privacy policy.",
        },
        information_certification: {
          type: "boolean",
          description: "Must be true: user certifies Persona KYC information is accurate.",
        },
        unauthorized_solicitation_acknowledgement: {
          type: "boolean",
          description: "Must be true: user acknowledges applying is not unauthorized solicitation.",
        },
      },
      required: [
        "e_sign_consent",
        "sponge_card_terms",
        "information_certification",
        "unauthorized_solicitation_acknowledgement",
      ],
    },
    cli_output: fieldsOutput(
      [
        { key: "environment", label: "Environment" },
        { key: "ready_for_card_creation", label: "Ready for card creation" },
        { key: "message", label: "Message" },
      ],
      "Sponge Card terms",
    ),
  },
  {
    name: "create_sponge_card",
    description:
      "Create the user's Sponge Card after issuer approval and Sponge consent. " +
      "If a card already exists for the environment, the API returns the existing card instead of issuing a duplicate.",
    input_schema: {
      type: "object",
      properties: {
        billing: {
          type: "object",
          description: "Billing address: line1, optional line2, city, region, postal_code, country_code.",
        },
        email: { type: "string", description: "Contact email to store with the card." },
        phone: { type: "string", description: "Contact phone to store with the card." },
        shipping: {
          type: "object",
          description: "Optional shipping address. Same address fields as billing, plus optional first_name and last_name.",
        },
      },
      required: ["billing", "email", "phone"],
    },
    cli_output: fieldsOutput(
      [
        { key: "created", label: "Created" },
        { key: "environment", label: "Environment" },
        { key: ["card", "id"], label: "Card ID" },
        { key: ["card", "status"], label: "Status" },
        { key: ["card", "last4"], label: "Last 4" },
        { key: "message", label: "Message" },
      ],
      "Sponge Card",
    ),
  },
  {
    name: "get_sponge_card_details",
    description:
      "Fetch encrypted PAN/CVC for the user's Sponge Card plus a per-call secret_key for local AES-128-GCM decryption and current spending power. " +
      "Use spending_power_display for user-facing output; spending_power_cents is an integer in cents, so 250 means $2.50. " +
      "Treat the response and decrypted values as highly sensitive; do not log or persist them.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
    cli_output: fieldsOutput(
      [
        { key: "last4", label: "Last 4" },
        { key: "expiration_month", label: "Expiry month" },
        { key: "expiration_year", label: "Expiry year" },
        { key: "status", label: "Status" },
        { key: "spending_power_display", label: "Spending power" },
        { key: "spending_power_cents", label: "Spending power cents" },
        { key: "secret_key", label: "Secret key" },
      ],
      "Sponge Card details",
    ),
  },
  {
    name: "fund_sponge_card",
    description:
      "Top up the user's Sponge Card collateral by sending USDC from the wallet to the card collateral contract deposit address.",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "string", description: "USDC amount in human-readable units, e.g. '100.50'." },
        chain: { type: "string", description: "Optional collateral chain, e.g. base or solana." },
      },
      required: ["amount"],
    },
    cli_output: fieldsOutput(
      [
        { key: "tx_hash", label: "Transaction" },
        { key: "transaction_id", label: "Transaction ID" },
        { key: "chain_id", label: "Chain ID" },
        { key: "to_address", label: "To" },
        { key: "token_address", label: "Token" },
        { key: "amount", label: "Amount" },
      ],
      "Sponge Card funding",
    ),
  },
  {
    name: "withdraw_sponge_card",
    description:
      "Withdraw USDC from Sponge Card collateral back to the user's wallet, reducing card spending power.",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "string", description: "USDC amount in human-readable units, max 2 decimal places." },
        chain: { type: "string", description: "Optional collateral chain, e.g. base or solana." },
      },
      required: ["amount"],
    },
    cli_output: fieldsOutput(
      [
        { key: "tx_hash", label: "Transaction" },
        { key: "chain_id", label: "Chain ID" },
        { key: "amount", label: "Amount" },
        { key: "recipient_address", label: "Recipient" },
      ],
      "Sponge Card withdrawal",
    ),
  },
  {
    name: "get_card",
    description:
      "Fetch the user's card details. Routes to the right card source automatically:\n\n" +
      "- **Sponge Card (Rain)** — credit card backed by on-chain collateral. Returns encrypted PAN/CVC plus a per-call symmetric key for client-side AES-128-GCM decryption.\n" +
      "- **Basis Theory vaulted card** — a card the user vaulted via the dashboard. Returns a short-lived BT session (`session_key` + `retrieve_url`) that you must immediately fetch over HTTP.\n\n" +
      "For the Sponge Card branch, use `spending_power_display` for user-facing output; `spending_power_cents` is an integer in cents, so 250 means $2.50.\n\n" +
      "If the user has only one source enrolled, returns that card directly. If both sources are enrolled and `card_type` is omitted, returns `{ status: \"selection_required\", available_cards: [...] }` so you can ask the user which to use, then re-call with `card_type` set.\n\n" +
      "For per-transaction virtual cards (issued on demand for a specific merchant + amount), use `issue_virtual_card` instead.",
    input_schema: {
      type: "object",
      properties: {
        card_type: {
          type: "string",
          enum: ["rain", "basis_theory_vaulted"],
          description: "Explicit card source. Omit to auto-detect.",
        },
        payment_method_id: {
          type: "string",
          description: "Specific Basis Theory payment method id. BT path only.",
        },
        amount: {
          type: "string",
          description: "Transaction amount for spending-limit checks. BT path only.",
        },
        currency: { type: "string", description: "ISO 4217 currency code (default: USD). BT path only." },
        merchant_name: { type: "string", description: "Merchant name. BT path only — recorded in audit log." },
        merchant_url: { type: "string", description: "Merchant URL. BT path only — recorded in audit log." },
      },
      required: [],
    },
    cli_output: fieldsOutput(
      [
        { key: "status", label: "Status" },
        { key: "card_type", label: "Card type" },
        { key: "card_last4", label: "Card last 4" },
        { key: "last4", label: "Sponge Card last 4" },
        { key: "spending_power_display", label: "Spending power" },
        { key: "spending_power_cents", label: "Spending power cents" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "retrieve_url", label: "Retrieve URL" },
        { key: "expires_at", label: "Expires at" },
      ],
      "Card",
    ),
  },
  {
    name: "issue_virtual_card",
    description:
      "Issue a per-transaction virtual card for a specific merchant and amount. Returns fresh card credentials (number, expiry, CVC) " +
      "scoped to that purchase. Requires an enrolled card (set up by the user in the dashboard).\n\n" +
      "Use this when you need card details to pay for something — e.g., signing up for a paid service, " +
      "buying a subscription, or entering payment info on any website. " +
      "For purchases via web_purchase, virtual card credentials are handled automatically — " +
      "use this tool directly only when you need the raw card details (e.g., to fill in a payment form yourself).\n\n" +
      "To retrieve an already-vaulted card (not per-transaction), use `get_card` instead.",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "string", description: "Transaction amount (e.g., '99.99')" },
        currency: { type: "string", description: "ISO 4217 currency code (default: USD)" },
        merchant_name: { type: "string", description: "Merchant name" },
        merchant_url: { type: "string", description: "Merchant URL" },
        merchant_country_code: { type: "string", description: "Merchant country code (default: US)" },
        description: { type: "string", description: "Description of the purchase" },
        products: { type: "array", description: "Optional products being purchased." },
        shipping_address: { type: "object", description: "Optional shipping address for the purchase." },
        enrollment_id: { type: "string", description: "Specific enrollment ID (uses default if omitted)" },
      },
      required: ["amount", "merchant_name", "merchant_url"],
    },
    cli_output: fieldsOutput(
      [
        { key: "card_number", label: "Card number" },
        { key: "expiration_month", label: "Expiry month" },
        { key: "expiration_year", label: "Expiry year" },
        { key: "cvc", label: "CVC" },
        { key: "expires_at", label: "Expires at" },
        { key: "instruction_id", label: "Instruction ID" },
      ],
      "Virtual card",
    ),
  },
  {
    name: "get_key_list",
    description:
      "Retrieve a list of stored keys for this agent. " +
      "Returns metadata only (no decrypted key values).",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
    cli_output: tableOutput(
      [
        { key: "service", label: "Service" },
        { key: "label", label: "Label" },
        { key: "key_preview", label: "Preview" },
        { key: "created_at", label: "Created" },
      ],
      "Stored keys",
      "keys",
      "No stored keys found.",
    ),
  },
  {
    name: "get_key_value",
    description:
      "Retrieve the decrypted key value for one stored service key.",
    input_schema: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Service name identifier (e.g., 'openai', 'perplexity', 'serpapi')",
        },
      },
      required: ["service"],
    },
    cli_output: fieldsOutput(
      [
        { key: "service", label: "Service" },
        { key: "label", label: "Label" },
        { key: "key_preview", label: "Preview" },
        { key: "key", label: "Key" },
        { key: "created_at", label: "Created" },
      ],
      "Stored key",
      "key",
    ),
  },
  {
    name: "submit_plan",
    description:
      "Submit a multi-step plan (swaps, transfers, bridges) for user review and approval. " +
      "Steps execute sequentially and automatically after approval. " +
      "Use this whenever you need to do 2+ related actions together (e.g., swap then bridge, rebalance a portfolio).\n\n" +
      "WORKFLOW: After calling submit_plan, present the plan to the user. " +
      "When the user confirms, call approve_plan with the plan_id.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short title for the plan (e.g., 'Q1 Portfolio Rebalance')",
        },
        reasoning: {
          type: "string",
          description: "Your strategy explanation — shown to the user",
        },
        steps: {
          type: "array",
          description: "Ordered list of actions to execute (1-20 steps)",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["swap", "transfer", "bridge"],
                description: "Step type",
              },
              input_token: {
                type: "string",
                description: "Token to sell (for swap steps)",
              },
              output_token: {
                type: "string",
                description: "Token to buy (for swap steps)",
              },
              amount: {
                type: "string",
                description: "Amount (human-readable)",
              },
              reason: {
                type: "string",
                description: "Why this step",
              },
              chain: {
                type: "string",
                description: "Chain (for transfer steps)",
              },
              to: {
                type: "string",
                description: "Recipient address (for transfer steps)",
              },
              currency: {
                type: "string",
                description: "Currency (for transfer steps)",
              },
              source_chain: {
                type: "string",
                description: "Source chain (for bridge steps)",
              },
              destination_chain: {
                type: "string",
                description: "Destination chain (for bridge steps)",
              },
              token: {
                type: "string",
                description: "Token to bridge (for bridge steps)",
              },
              destination_token: {
                type: "string",
                description: "Receive different token on destination (for bridge steps)",
              },
            },
            required: ["type", "amount", "reason"],
          },
        },
      },
      required: ["title", "steps"],
    },
    cli_output: fieldsOutput(
      [
        { key: "planId", label: "Plan ID" },
        { key: "message", label: "Message" },
        { key: "dashboardUrl", label: "Dashboard URL" },
      ],
      "Plan submitted",
    ),
  },
  {
    name: "approve_plan",
    description:
      "Approve and execute a previously submitted plan. " +
      "Use this after submit_plan when the user confirms they want to proceed.",
    input_schema: {
      type: "object",
      properties: {
        plan_id: {
          type: "string",
          description: "The plan ID returned by submit_plan",
        },
      },
      required: ["plan_id"],
    },
    cli_output: fieldsOutput(
      [
        { key: "planId", label: "Plan ID" },
        { key: "status", label: "Status" },
        { key: "completedSteps", label: "Completed steps" },
        { key: "skippedSteps", label: "Skipped steps" },
        { key: "totalSteps", label: "Total steps" },
        { key: "failureReason", label: "Failure reason" },
        { key: "message", label: "Message" },
      ],
      "Plan approved",
    ),
  },
  {
    name: "propose_trade",
    description:
      "Propose a single token swap for user approval. Fetches a quote and creates a pending trade proposal. " +
      "Use only when the user explicitly asks for a proposal or review-before-execute flow. " +
      "For direct execution, use solana_swap, base_swap, or tempo_swap instead. " +
      "For multi-step flows, use submit_plan instead.",
    input_schema: {
      type: "object",
      properties: {
        input_token: {
          type: "string",
          description: "Token to sell (symbol like 'USDC' or mint address)",
        },
        output_token: {
          type: "string",
          description: "Token to buy (symbol like 'SOL' or mint address)",
        },
        amount: {
          type: "string",
          description: "Amount of input token to trade (human-readable, e.g., '5000')",
        },
        reason: {
          type: "string",
          description: "Your reasoning for this trade — shown to the user",
        },
        chain: {
          type: "string",
          description: "Optional chain to trade on (e.g., 'solana', 'base', 'tempo', 'tempo-testnet')",
        },
      },
      required: ["input_token", "output_token", "amount", "reason"],
    },
    cli_output: fieldsOutput(
      [
        { key: "requestId", label: "Request ID" },
        { key: "status", label: "Status" },
        { key: "estimatedOutput", label: "Estimated output" },
        { key: "estimatedPrice", label: "Estimated price" },
        { key: "message", label: "Message" },
      ],
      "Trade proposal",
    ),
  },
  {
    name: "generate_siwe",
    description:
      "Generate a SIWE (Sign-In with Ethereum) signature for authentication. " +
      "Creates an EIP-4361 compliant SIWE message and signs it with the agent's EVM wallet. " +
      "The signature can be used as a bearer token for authenticated API requests.",
    input_schema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "The domain requesting the signature (e.g., 'api.example.com')",
        },
        uri: {
          type: "string",
          description: "The URI of the resource (e.g., 'https://api.example.com/resource')",
        },
        statement: {
          type: "string",
          description: "Human-readable statement describing the sign-in request",
        },
        nonce: {
          type: "string",
          description: "Unique nonce (auto-generated if not provided)",
        },
        chain_id: {
          type: "number",
          description: "Chain ID for the SIWE message (default: 8453 for Base)",
        },
        expiration_time: {
          type: "string",
          description: "ISO timestamp when the signature expires",
        },
        not_before: {
          type: "string",
          description: "ISO timestamp before which signature is invalid",
        },
        request_id: {
          type: "string",
          description: "Optional request identifier",
        },
        resources: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of resource URIs",
        },
      },
      required: ["domain", "uri"],
    },
    cli_output: fieldsOutput(
      [
        { key: "address", label: "Address" },
        { key: "chainId", label: "Chain ID" },
        { key: "nonce", label: "Nonce" },
        { key: "issuedAt", label: "Issued at" },
        { key: "expirationTime", label: "Expires at" },
        { key: "signature", label: "Signature" },
        { key: "base64SiweMessage", label: "Base64 message" },
      ],
      "SIWE signature",
    ),
  },
  {
    name: "polymarket",
    description:
      "Use Polymarket prediction markets. Supports account setup/status, market search and pricing, positions, orders, limit/market orders, funding, withdrawals, and redemption.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "enable",
            "signup",
            "status",
            "order",
            "positions",
            "orders",
            "balance_allowance",
            "refresh_balance_allowance",
            "get_order",
            "cancel",
            "search_markets",
            "get_market",
            "get_market_price",
            "set_allowances",
            "deposit",
            "deposit_from_wallet",
            "withdraw",
            "withdraw_native",
            "redeem",
          ],
          description: "Polymarket action to run",
        },
        market_slug: {
          type: "string",
          description: "Market or event slug from Polymarket",
        },
        token_id: {
          type: "string",
          description: "CLOB token ID for a specific outcome",
        },
        outcome: {
          type: "string",
          enum: ["yes", "no"],
          description: "Outcome to buy or sell",
        },
        side: {
          type: "string",
          enum: ["buy", "sell"],
          description: "Order side",
        },
        size: {
          type: "number",
          description: "Order size in shares. For a dollar budget, divide dollars by price first.",
        },
        type: {
          type: "string",
          enum: ["limit", "market"],
          description: "Execution type. Defaults to limit.",
        },
        price: {
          type: "number",
          description: "Limit price from 0 to 1. Required for limit orders.",
        },
        order_type: {
          type: "string",
          enum: ["GTC", "GTD", "FOK", "FAK"],
          description: "CLOB order type. Market orders support FOK or FAK.",
        },
        order_id: {
          type: "string",
          description: "Order ID for get_order or cancel",
        },
        query: {
          type: "string",
          description: "Search query for search_markets",
        },
        limit: {
          type: "number",
          description: "Search result limit",
        },
        amount: {
          type: "string",
          description: "USDC.e amount for deposit_from_wallet, withdraw, or withdraw_native",
        },
        condition_id: {
          type: "string",
          description: "Optional condition ID for redeem",
        },
      },
      required: ["action"],
    },
  },
];
