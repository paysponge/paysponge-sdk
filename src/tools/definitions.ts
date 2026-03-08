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
}

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
            "tempo",
            "tempo-mainnet",
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
  },
  {
    name: "evm_transfer",
    description:
      "Transfer ETH or USDC on Ethereum, Base, or their testnets. Supports native ETH and USDC transfers.",
    input_schema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          enum: ["ethereum", "base", "sepolia", "base-sepolia"],
          description: "The chain to transfer on",
        },
        to: {
          type: "string",
          description: "The recipient address (0x...)",
        },
        amount: {
          type: "string",
          description:
            "The amount to transfer (e.g., '0.1' for 0.1 ETH or '100' for 100 USDC)",
        },
        currency: {
          type: "string",
          enum: ["ETH", "USDC"],
          description: "The currency to transfer",
        },
      },
      required: ["chain", "to", "amount", "currency"],
    },
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
            "tempo",
            "tempo-mainnet",
            "solana",
            "solana-devnet",
          ],
          description: "Chain for the transaction",
        },
      },
      required: ["txHash", "chain"],
    },
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
        },
      ]
    : []),
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
          enum: ["tempo", "tempo-mainnet"],
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
          },
          required: ["line1", "city", "state", "postal_code", "country"],
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
  },
  {
    name: "propose_trade",
    description:
      "Propose a single token swap for user approval. Fetches a quote and creates a pending trade proposal. " +
      "Use only when the user explicitly asks for a proposal or review-before-execute flow. " +
      "For direct execution, use solana_swap or base_swap instead. " +
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
      },
      required: ["input_token", "output_token", "amount", "reason"],
    },
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
  },
];
