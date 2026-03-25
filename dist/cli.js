import { Command, Option } from "commander";
import * as p from "@clack/prompts";
import { SpongeWallet } from "./client.js";
import { deviceFlowAuth } from "./auth/device-flow.js";
import { deleteCredentials, getCredentialsPath, loadCredentials, saveCredentials, } from "./auth/credentials.js";
import { registerAgentFirst } from "./registration.js";
import { TOOL_DEFINITIONS, } from "./tools/definitions.js";
const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";
// ---------------------------------------------------------------------------
// CLI setup
// ---------------------------------------------------------------------------
export function buildCliProgram(metadata = {}) {
    const cmdName = metadata.commandName ?? "spongewallet";
    const pkgName = metadata.packageName ?? "@paysponge/sdk";
    const version = metadata.version ?? "0.1.0";
    const program = new Command()
        .name(cmdName)
        .description(`${pkgName} – CLI for managing agent wallets`)
        .version(`${pkgName} v${version}`, "-v, --version");
    const shared = (cmd) => cmd
        .option("--base-url <url>", "custom API URL")
        .option("--credentials-path <path>", "custom credentials file path");
    const withAuth = (cmd) => shared(cmd)
        .option("--name <name>", "agent name")
        .option("--email <email>", "email to associate with the agent")
        .option("--no-browser", "don't auto-open browser");
    withAuth(program
        .command("init")
        .description("Create an agent, show wallet addresses, and print MCP config"))
        .option("--claim-required", "include claim text (default)")
        .option("--no-claim-required", "disable claim text")
        .action((opts) => handleInit(opts, metadata));
    withAuth(program
        .command("login")
        .description("Claim a pending agent or authenticate and cache credentials")).action((opts) => handleLogin(opts));
    shared(program.command("logout").description("Remove stored credentials")).action((opts) => handleLogout(opts));
    shared(program
        .command("whoami")
        .description("Show current authentication status")).action((opts) => handleWhoami(opts, metadata));
    const mcpCmd = program
        .command("mcp")
        .description("MCP configuration commands");
    withAuth(mcpCmd.command("print").description("Print authenticated MCP config"))
        .option("--json", "print only raw MCP config JSON")
        .action((opts) => handleMcpPrint(opts));
    registerCuratedCommands(program, shared);
    const advancedCmd = program
        .command("advanced")
        .description("Low-level commands mirroring the raw tool surface");
    registerToolCommands(advancedCmd, shared);
    return program;
}
export async function runCli(args, metadata = {}) {
    const program = buildCliProgram(metadata);
    await program.parseAsync(args, { from: "user" });
}
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
async function handleLogin(opts) {
    const creds = loadCredentials(opts.credentialsPath);
    if (!process.env.SPONGE_API_KEY && creds?.claimUrl) {
        await continueClaimFlow(creds, opts);
        return;
    }
    await deviceFlowAuth({
        baseUrl: opts.baseUrl,
        noBrowser: !opts.browser,
        agentName: opts.name,
        credentialsPath: opts.credentialsPath,
        email: opts.email,
    });
}
async function handleInit(opts, meta) {
    const registration = await registerAgentFirst({
        name: opts.name ?? defaultAgentName(opts.email),
        email: opts.email,
        claimRequired: opts.claimRequired,
        baseUrl: opts.baseUrl,
    });
    const wallet = await SpongeWallet.connect({
        apiKey: registration.apiKey,
        agentId: registration.agentId,
        baseUrl: opts.baseUrl,
        credentialsPath: opts.credentialsPath,
    });
    await printOnboardingSummary({ wallet, meta, opts, registration });
}
async function printOnboardingSummary(args) {
    const { wallet, meta, opts, registration } = args;
    const [agent, addresses] = await Promise.all([
        wallet.getAgent(),
        wallet.getAddresses(),
    ]);
    const config = wallet.mcp();
    if (registration) {
        const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
        const credentials = {
            apiKey: registration.apiKey,
            agentId: registration.agentId,
            agentName: agent.name,
            createdAt: new Date(),
            baseUrl: baseUrl !== DEFAULT_BASE_URL ? baseUrl : undefined,
            claimCode: registration.claimCode,
            claimUrl: registration.verificationUriComplete,
            claimText: registration.claimText,
        };
        saveCredentials(credentials, opts.credentialsPath);
    }
    p.intro("Onboarding complete");
    const info = [
        `Agent:       ${agent.name} (${agent.id})`,
        `Credentials: ${getCredentialsPath(opts.credentialsPath)}`,
    ];
    if (registration) {
        info.push(`Claim URL:   ${registration.verificationUriComplete}`);
        info.push(`Claim Code:  ${registration.claimCode}`);
    }
    p.log.success(info.join("\n"));
    const addrLines = Object.entries(addresses)
        .map(([chain, addr]) => `${chain.padEnd(15)} ${addr}`)
        .join("\n");
    p.note(addrLines, "Wallet Addresses");
    const mcpSnippet = JSON.stringify({ mcpServers: { sponge: config } }, null, 2);
    p.note(mcpSnippet, "MCP Config");
    const cmd = meta.commandName ?? "spongewallet";
    p.log.step(`Next: ${cmd} mcp print`);
    p.log.step("Set SPONGE_API_KEY on other machines for non-interactive access");
    p.outro("Done!");
}
async function handleLogout(opts) {
    const creds = loadCredentials(opts.credentialsPath);
    if (!creds) {
        p.log.info("Not logged in.");
        return;
    }
    deleteCredentials(opts.credentialsPath);
    p.log.success("Logged out.");
    p.log.info(`Removed credentials from ${getCredentialsPath(opts.credentialsPath)}`);
}
async function handleWhoami(opts, meta) {
    const envKey = process.env.SPONGE_API_KEY;
    if (envKey) {
        const wallet = await SpongeWallet.connect({
            apiKey: envKey,
            baseUrl: opts.baseUrl,
            credentialsPath: opts.credentialsPath,
        });
        const agent = await wallet.getAgent();
        p.log.success("Authenticated via SPONGE_API_KEY");
        const lines = [`Agent ID:   ${agent.id}`, `Agent Name: ${agent.name}`];
        if (opts.baseUrl)
            lines.push(`API URL:    ${opts.baseUrl}`);
        p.log.info(lines.join("\n"));
        return;
    }
    const creds = loadCredentials(opts.credentialsPath);
    if (!creds) {
        const cmd = meta.commandName ?? "spongewallet";
        p.log.warn("Not logged in.");
        p.log.info(`Run \`${cmd} init\` or \`${cmd} login\`.`);
        return;
    }
    p.log.success("Logged in");
    const lines = [`Agent ID:    ${creds.agentId}`];
    if (creds.agentName)
        lines.push(`Agent Name:  ${creds.agentName}`);
    lines.push(`API Key:     ${creds.apiKey.substring(0, 20)}...`);
    if (creds.baseUrl)
        lines.push(`API URL:     ${creds.baseUrl}`);
    if (creds.claimUrl)
        lines.push(`Claim URL:   ${creds.claimUrl}`);
    if (creds.claimCode)
        lines.push(`Claim Code:  ${creds.claimCode}`);
    lines.push(`Credentials: ${getCredentialsPath(opts.credentialsPath)}`);
    p.log.info(lines.join("\n"));
}
async function handleMcpPrint(opts) {
    const wallet = await SpongeWallet.connect({
        name: opts.name,
        baseUrl: opts.baseUrl,
        noBrowser: !opts.browser,
        credentialsPath: opts.credentialsPath,
        email: opts.email,
    });
    const config = wallet.mcp();
    if (opts.json) {
        console.log(JSON.stringify(config, null, 2));
        return;
    }
    p.note(JSON.stringify(config, null, 2), "MCP Config");
    p.note(JSON.stringify({ mcpServers: { sponge: config } }, null, 2), "Claude Code / Cursor snippet");
}
async function continueClaimFlow(creds, opts) {
    p.intro("Pending agent claim found");
    p.log.info(`Agent ID:  ${creds.agentId}`);
    if (creds.agentName)
        p.log.info(`Agent:     ${creds.agentName}`);
    if (creds.claimCode)
        p.log.info(`Claim Code: ${creds.claimCode}`);
    const claimUrl = creds.claimUrl;
    if (!claimUrl) {
        p.log.step("No claim URL was returned for this agent.");
        p.outro("Claim flow unavailable");
        return;
    }
    p.log.info(`Claim URL: ${claimUrl}`);
    if (!opts.browser) {
        p.log.step("Open the claim URL in a browser to finish claiming this agent.");
        p.outro("Claim flow ready");
        return;
    }
    try {
        const open = await import("open");
        await open.default(claimUrl);
        p.log.step("Opened browser for claim flow.");
    }
    catch {
        p.log.step("Could not open browser automatically. Open the claim URL manually.");
    }
    p.log.info("After the browser claim completes, the cached API key will keep working for this agent.");
    p.outro("Claim flow ready");
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function defaultAgentName(email) {
    const local = email?.split("@")[0]?.trim().toLowerCase();
    const slug = local
        ?.replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug ? `agent-${slug}` : "sponge-agent";
}
// ---------------------------------------------------------------------------
// Curated command tree
// ---------------------------------------------------------------------------
const CHAIN_VALUES = [
    "ethereum",
    "base",
    "sepolia",
    "base-sepolia",
    "tempo-testnet",
    "tempo",
    "solana",
    "solana-devnet",
];
const EVM_CHAIN_VALUES = ["ethereum", "base", "sepolia", "base-sepolia"];
const SOLANA_CHAIN_VALUES = ["solana", "solana-devnet"];
const ONRAMP_CHAIN_VALUES = ["base", "solana", "polygon"];
const PAY_CHAIN_VALUES = ["base", "solana", "tempo", "ethereum"];
const PREFERRED_X402_CHAINS = ["base", "solana", "ethereum"];
function registerCuratedCommands(program, shared) {
    const walletCmd = program.command("wallet").description("Wallet balances, transfers, and addresses");
    shared(walletCmd.command("balance").description("Show wallet balances"))
        .addOption(new Option("--chain <chain>", "specific chain").choices([...CHAIN_VALUES, "all"]))
        .option("--allowed-chains <chains>", "comma-separated chain allowlist")
        .option("--only-usdc", "only show USDC balances")
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.getDetailedBalances({
            chain: opts.chain,
            allowedChains: parseCsv(opts.allowedChains),
            onlyUsdc: Boolean(opts.onlyUsdc),
        });
        displayToolResult(getToolDefinition("get_balance"), data);
    });
    shared(walletCmd.command("send").description("Send assets on EVM, Solana, or Tempo"))
        .addOption(new Option("--chain <chain>", "destination chain").choices(CHAIN_VALUES).makeOptionMandatory())
        .requiredOption("--to <address>", "recipient address")
        .requiredOption("--amount <amount>", "amount to send")
        .requiredOption("--asset <asset>", "currency symbol or token symbol/address")
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const chain = String(opts.chain);
        const asset = String(opts.asset);
        const input = chain === "tempo" || chain === "tempo-testnet"
            ? { chain, to: String(opts.to), amount: String(opts.amount), token: asset }
            : { chain, to: String(opts.to), amount: String(opts.amount), currency: asset };
        const data = await wallet.transfer(input);
        displayToolResult(getToolDefinition(chain.startsWith("solana") ? "solana_transfer" : "evm_transfer"), data);
    });
    shared(walletCmd.command("history").description("Show recent transaction history"))
        .option("--limit <n>", "maximum number of transactions", parseInt)
        .addOption(new Option("--chain <chain>", "filter by chain").choices(CHAIN_VALUES))
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.getTransactionHistoryDetailed({
            limit: opts.limit,
            chain: opts.chain,
        });
        displayToolResult(getToolDefinition("get_transaction_history"), data);
    });
    shared(walletCmd.command("tokens").description("List Solana wallet tokens"))
        .addOption(new Option("--chain <chain>", "Solana network").choices(SOLANA_CHAIN_VALUES).default("solana"))
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.getSolanaTokens(opts.chain);
        displayToolResult(getToolDefinition("get_solana_tokens"), data);
    });
    shared(walletCmd.command("search-tokens").description("Search the Solana token list"))
        .requiredOption("--query <query>", "token symbol or name")
        .option("--limit <n>", "maximum results", parseInt)
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.searchSolanaTokens(String(opts.query), opts.limit);
        displayToolResult(getToolDefinition("search_solana_tokens"), data);
    });
    shared(walletCmd.command("onramp").description("Create a fiat-to-crypto onramp link"))
        .addOption(new Option("--chain <chain>", "destination chain").choices(ONRAMP_CHAIN_VALUES).default("base"))
        .option("--wallet-address <address>", "destination wallet address (defaults to agent wallet)")
        .addOption(new Option("--provider <provider>", "onramp provider").choices(["auto", "stripe", "coinbase"]).default("auto"))
        .option("--fiat-amount <amount>", "prefill fiat amount")
        .option("--fiat-currency <code>", "fiat currency code")
        .option("--lock-wallet-address", "lock destination wallet address")
        .option("--redirect-url <url>", "redirect URL after checkout")
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const chain = String(opts.chain ?? "base");
        const walletAddress = opts.walletAddress
            ?? (await wallet.getAddress(chain))
            ?? "";
        const data = await wallet.onrampCrypto({
            wallet_address: walletAddress,
            chain: chain,
            provider: opts.provider,
            fiat_amount: opts.fiatAmount,
            fiat_currency: opts.fiatCurrency,
            lock_wallet_address: Boolean(opts.lockWalletAddress),
            redirect_url: opts.redirectUrl,
        });
        displayToolResult(getToolDefinition("create_crypto_onramp"), data);
    });
    const txCmd = program.command("tx").description("Transaction status and signing");
    shared(txCmd.command("status").description("Check transaction status"))
        .requiredOption("--tx-hash <hash>", "transaction hash or signature")
        .addOption(new Option("--chain <chain>", "transaction chain").choices(CHAIN_VALUES).makeOptionMandatory())
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.getTransactionStatus(String(opts.txHash), opts.chain);
        displayToolResult(getToolDefinition("get_transaction_status"), data);
    });
    shared(txCmd.command("sign").description("Sign a Solana transaction without submitting"))
        .requiredOption("--transaction <base64>", "base64-encoded serialized transaction")
        .action(async (opts) => {
        await executeToolCommand(opts, "solana_sign_transaction", {
            transaction: String(opts.transaction),
        });
    });
    shared(txCmd.command("send").description("Sign and submit a Solana transaction"))
        .requiredOption("--transaction <base64>", "base64-encoded serialized transaction")
        .action(async (opts) => {
        await executeToolCommand(opts, "solana_sign_and_send_transaction", {
            transaction: String(opts.transaction),
        });
    });
    const swapCmd = program.command("swap").description("Quotes and swaps");
    shared(swapCmd.command("solana").description("Swap on Solana"))
        .addOption(new Option("--chain <chain>", "Solana network").choices(SOLANA_CHAIN_VALUES).default("solana"))
        .requiredOption("--from <token>", "input token")
        .requiredOption("--to <token>", "output token")
        .requiredOption("--amount <amount>", "amount to swap")
        .option("--slippage-bps <bps>", "slippage in basis points", parseInt)
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.swap({
            chain: opts.chain,
            from: String(opts.from),
            to: String(opts.to),
            amount: String(opts.amount),
            slippageBps: opts.slippageBps,
        });
        displayToolResult(getToolDefinition("solana_swap"), data);
    });
    shared(swapCmd.command("quote").description("Get a Jupiter quote without executing"))
        .addOption(new Option("--chain <chain>", "Solana network").choices(SOLANA_CHAIN_VALUES).default("solana"))
        .requiredOption("--from <token>", "input token")
        .requiredOption("--to <token>", "output token")
        .requiredOption("--amount <amount>", "amount to swap")
        .option("--slippage-bps <bps>", "slippage in basis points", parseInt)
        .action(async (opts) => {
        await executeToolCommand(opts, "jupiter_swap_quote", {
            chain: opts.chain,
            input_token: opts.from,
            output_token: opts.to,
            amount: opts.amount,
            slippage_bps: opts.slippageBps,
        });
    });
    shared(swapCmd.command("execute").description("Execute a previously quoted Jupiter swap"))
        .requiredOption("--quote-id <id>", "quote ID to execute")
        .action(async (opts) => {
        await executeToolCommand(opts, "jupiter_swap_execute", {
            quote_id: String(opts.quoteId),
        });
    });
    shared(swapCmd.command("base").description("Swap on Base via 0x"))
        .requiredOption("--from <token>", "input token")
        .requiredOption("--to <token>", "output token")
        .requiredOption("--amount <amount>", "amount to swap")
        .option("--slippage-bps <bps>", "slippage in basis points", parseInt)
        .action(async (opts) => {
        await executeToolCommand(opts, "base_swap", {
            input_token: opts.from,
            output_token: opts.to,
            amount: opts.amount,
            slippage_bps: opts.slippageBps,
        });
    });
    shared(program.command("bridge").description("Bridge assets between chains"))
        .requiredOption("--source-chain <chain>", "source chain")
        .requiredOption("--destination-chain <chain>", "destination chain")
        .requiredOption("--token <token>", "token to bridge")
        .requiredOption("--amount <amount>", "amount to bridge")
        .option("--destination-token <token>", "token to receive on destination")
        .option("--recipient-address <address>", "recipient address on destination")
        .action(async (opts) => {
        await executeToolCommand(opts, "bridge", {
            source_chain: opts.sourceChain,
            destination_chain: opts.destinationChain,
            token: opts.token,
            amount: opts.amount,
            destination_token: opts.destinationToken,
            recipient_address: opts.recipientAddress,
        });
    });
    const payCmd = program.command("pay").description("Paid API and payment helpers");
    shared(payCmd.command("fetch").description("Fetch with automatic paid API handling"))
        .requiredOption("--url <url>", "target URL")
        .addOption(new Option("--chain <chain>", "preferred spend chain").choices(PAY_CHAIN_VALUES))
        .addOption(new Option("--method <method>", "HTTP method").choices(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"))
        .option("--headers <json>", "headers as JSON", parseJsonObject)
        .option("--body <json>", "request body as JSON", parseJsonValue)
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.paidFetch({
            url: String(opts.url),
            chain: opts.chain,
            method: opts.method,
            headers: opts.headers,
            body: opts.body,
        });
        displayToolResult(getToolDefinition("paid_fetch"), data);
    });
    shared(payCmd.command("x402").description("Fetch with automatic x402 payment handling"))
        .requiredOption("--url <url>", "target URL")
        .addOption(new Option("--chain <chain>", "preferred x402 chain").choices(PREFERRED_X402_CHAINS))
        .addOption(new Option("--method <method>", "HTTP method").choices(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"))
        .option("--headers <json>", "headers as JSON", parseJsonObject)
        .option("--body <json>", "request body as JSON", parseJsonValue)
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.x402Fetch({
            url: String(opts.url),
            preferredChain: opts.chain,
            method: opts.method,
            headers: opts.headers,
            body: opts.body,
        });
        displayToolResult(getToolDefinition("x402_fetch"), data);
    });
    shared(payCmd.command("mpp").description("Fetch with automatic MPP payment handling"))
        .requiredOption("--url <url>", "target URL")
        .addOption(new Option("--chain <chain>", "MPP chain").choices(["tempo-testnet", "tempo"]))
        .addOption(new Option("--method <method>", "HTTP method").choices(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"))
        .option("--headers <json>", "headers as JSON", parseJsonObject)
        .option("--body <json>", "request body as JSON", parseJsonValue)
        .action(async (opts) => {
        await executeToolCommand(opts, "mpp_fetch", {
            url: opts.url,
            chain: opts.chain,
            method: opts.method,
            headers: opts.headers,
            body: opts.body,
        });
    });
    const keysCmd = program.command("keys").description("Stored service keys");
    shared(keysCmd.command("list").description("List stored keys"))
        .action(async (opts) => {
        await executeToolCommand(opts, "get_key_list", {});
    });
    shared(keysCmd.command("get").description("Get a stored key value"))
        .requiredOption("--service <service>", "service name")
        .action(async (opts) => {
        await executeToolCommand(opts, "get_key_value", {
            service: String(opts.service),
        });
    });
    shared(keysCmd.command("set").description("Store a service key"))
        .requiredOption("--service <service>", "service name")
        .requiredOption("--key <secret>", "key or secret to store")
        .option("--label <label>", "friendly label")
        .option("--metadata <json>", "metadata as JSON", parseJsonObject)
        .action(async (opts) => {
        await executeToolCommand(opts, "store_key", {
            service: opts.service,
            key: opts.key,
            label: opts.label,
            metadata: opts.metadata,
        });
    });
    const cardCmd = program.command("card").description("Card storage and virtual cards");
    shared(cardCmd.command("store").description("Store credit card details"))
        .requiredOption("--card-number <number>", "card number")
        .option("--expiry-month <mm>", "expiry month")
        .option("--expiry-year <yyyy>", "expiry year")
        .option("--expiration <mm/yyyy>", "combined expiration")
        .requiredOption("--cvc <cvc>", "card verification code")
        .requiredOption("--cardholder-name <name>", "cardholder name")
        .option("--email <email>", "email address")
        .option("--billing-address <json>", "billing address as JSON", parseJsonObject)
        .option("--shipping-address <json>", "shipping address as JSON", parseJsonObject)
        .option("--label <label>", "friendly label")
        .option("--metadata <json>", "metadata as JSON", parseJsonObject)
        .action(async (opts) => {
        await executeToolCommand(opts, "store_credit_card", {
            card_number: opts.cardNumber,
            expiry_month: opts.expiryMonth,
            expiry_year: opts.expiryYear,
            expiration: opts.expiration,
            cvc: opts.cvc,
            cardholder_name: opts.cardholderName,
            email: opts.email,
            billing_address: opts.billingAddress,
            shipping_address: opts.shippingAddress,
            label: opts.label,
            metadata: opts.metadata,
        });
    });
    shared(cardCmd.command("virtual").description("Issue a virtual card"))
        .requiredOption("--amount <amount>", "transaction amount")
        .option("--currency <code>", "ISO currency code")
        .requiredOption("--merchant-name <name>", "merchant name")
        .requiredOption("--merchant-url <url>", "merchant URL")
        .option("--merchant-country-code <code>", "merchant country code")
        .option("--description <text>", "purchase description")
        .option("--enrollment-id <id>", "specific enrollment ID")
        .action(async (opts) => {
        await executeToolCommand(opts, "get_virtual_card", {
            amount: opts.amount,
            currency: opts.currency,
            merchant_name: opts.merchantName,
            merchant_url: opts.merchantUrl,
            merchant_country_code: opts.merchantCountryCode,
            description: opts.description,
            enrollment_id: opts.enrollmentId,
        });
    });
    const planCmd = program.command("plan").description("Multi-step plan approval flows");
    shared(planCmd.command("submit").description("Submit a multi-step plan"))
        .requiredOption("--title <title>", "plan title")
        .requiredOption("--steps <json>", "steps array as JSON", parseJsonValue)
        .option("--reasoning <text>", "reasoning shown to the user")
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.submitPlan({
            title: String(opts.title),
            reasoning: opts.reasoning,
            steps: opts.steps,
        });
        displayToolResult(getToolDefinition("submit_plan"), data);
    });
    shared(planCmd.command("approve").description("Approve and execute a submitted plan"))
        .requiredOption("--plan-id <id>", "plan ID")
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.approvePlan(String(opts.planId));
        displayToolResult(getToolDefinition("approve_plan"), data);
    });
    const tradeCmd = program.command("trade").description("Single trade proposal flow");
    shared(tradeCmd.command("propose").description("Propose a trade for approval"))
        .requiredOption("--from <token>", "input token")
        .requiredOption("--to <token>", "output token")
        .requiredOption("--amount <amount>", "amount to trade")
        .requiredOption("--reason <text>", "reason shown to the user")
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.proposeTrade({
            input_token: String(opts.from),
            output_token: String(opts.to),
            amount: String(opts.amount),
            reason: String(opts.reason),
        });
        displayToolResult(getToolDefinition("propose_trade"), data);
    });
    const authCmd = program.command("auth").description("Authentication helpers");
    shared(authCmd.command("siwe").description("Generate a SIWE signature"))
        .requiredOption("--domain <domain>", "requesting domain")
        .requiredOption("--uri <uri>", "resource URI")
        .option("--statement <text>", "human-readable statement")
        .option("--chain-id <id>", "chain ID", parseInt)
        .option("--expiration-time <iso>", "expiration time")
        .option("--not-before <iso>", "not before time")
        .option("--resources <json>", "resources array as JSON", parseJsonValue)
        .action(async (opts) => {
        await executeToolCommand(opts, "generate_siwe", {
            domain: opts.domain,
            uri: opts.uri,
            statement: opts.statement,
            chain_id: opts.chainId,
            expiration_time: opts.expirationTime,
            not_before: opts.notBefore,
            resources: opts.resources,
        });
    });
    const marketCmd = program.command("market").description("Trading venue integrations");
    shared(marketCmd.command("hyperliquid").description("Trade or inspect Hyperliquid"))
        .requiredOption("--action <action>", "hyperliquid action")
        .option("--symbol <symbol>", "market symbol")
        .option("--side <side>", "buy or sell")
        .option("--type <type>", "order type")
        .option("--amount <amount>", "order amount")
        .option("--price <price>", "limit price")
        .option("--leverage <n>", "leverage", parseFloat)
        .option("--order-id <id>", "order ID")
        .option("--limit <n>", "result limit", parseInt)
        .option("--offset <n>", "result offset", parseInt)
        .option("--json <json>", "additional args as JSON", parseJsonObject)
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.hyperliquid({
            ...opts.json,
            action: String(opts.action),
            symbol: opts.symbol,
            side: opts.side,
            type: opts.type,
            amount: opts.amount,
            price: opts.price,
            leverage: opts.leverage,
            order_id: opts.orderId,
            limit: opts.limit,
            offset: opts.offset,
        });
        displayToolResult(getToolDefinition("hyperliquid"), data);
    });
}
async function connectWallet(opts) {
    return SpongeWallet.connect({
        baseUrl: opts.baseUrl,
        credentialsPath: opts.credentialsPath,
    });
}
async function executeToolCommand(opts, toolName, input) {
    const wallet = await connectWallet(opts);
    const tools = await wallet.tools();
    const result = await tools.execute(toolName, input);
    if (result.status === "error") {
        p.log.error(result.error);
        process.exit(1);
    }
    displayToolResult(getToolDefinition(toolName), result.data);
}
function getToolDefinition(name) {
    const tool = TOOL_DEFINITIONS.find((entry) => entry.name === name);
    if (!tool) {
        throw new Error(`Unknown CLI tool mapping: ${name}`);
    }
    return tool;
}
function parseCsv(value) {
    if (!value)
        return undefined;
    const values = value.split(",").map((item) => item.trim()).filter(Boolean);
    return values.length > 0 ? values : undefined;
}
function parseJsonValue(value) {
    return JSON.parse(value);
}
function parseJsonObject(value) {
    const parsed = JSON.parse(value);
    if (!isRecord(parsed)) {
        throw new Error("Expected a JSON object");
    }
    return parsed;
}
function registerToolCommands(program, shared) {
    for (const tool of TOOL_DEFINITIONS) {
        const cmdName = tool.name.replace(/_/g, "-");
        const cmd = program
            .command(cmdName)
            .description(firstSentence(tool.description));
        shared(cmd);
        const keyMap = addSchemaOptions(cmd, tool.input_schema);
        cmd.action(async (opts, command) => {
            const { required = [] } = tool.input_schema;
            // Show help if no required options were provided
            if (required.length > 0) {
                const hasAny = required.some((key) => {
                    const camel = toCamel(toKebab(key));
                    return opts[camel] !== undefined;
                });
                if (!hasAny) {
                    command.help();
                    return;
                }
            }
            // Validate all required fields are present
            const missing = required.filter((key) => {
                const camel = toCamel(toKebab(key));
                return opts[camel] === undefined;
            });
            if (missing.length > 0) {
                const flags = missing.map((k) => `--${toKebab(k)}`).join(", ");
                p.log.error(`Missing required option${missing.length > 1 ? "s" : ""}: ${flags}`);
                process.exit(1);
            }
            const wallet = await SpongeWallet.connect({
                baseUrl: opts.baseUrl,
                credentialsPath: opts.credentialsPath,
            });
            const input = mapOptsToInput(opts, keyMap);
            const tools = await wallet.tools();
            const result = await tools.execute(tool.name, input);
            if (result.status === "error") {
                p.log.error(result.error);
                process.exit(1);
            }
            displayToolResult(tool, result.data);
        });
    }
}
/**
 * Convert a tool's JSON Schema properties into Commander options.
 * Returns a map from Commander's camelCase key → original property key.
 */
function addSchemaOptions(cmd, schema) {
    const keyMap = new Map();
    const { properties, required = [] } = schema;
    for (const [originalKey, raw] of Object.entries(properties)) {
        const prop = raw;
        const flag = toKebab(originalKey);
        const camel = toCamel(flag);
        keyMap.set(camel, originalKey);
        const desc = prop.description ?? "";
        const isReq = required.includes(originalKey);
        const reqTag = isReq ? " (required)" : "";
        if (prop.enum) {
            const opt = new Option(`--${flag} <value>`, desc + reqTag).choices(prop.enum);
            cmd.addOption(opt);
        }
        else if (prop.type === "boolean") {
            cmd.option(`--${flag}`, desc + reqTag);
        }
        else if (prop.type === "number") {
            cmd.option(`--${flag} <n>`, desc + reqTag, parseFloat);
        }
        else if (prop.type === "object" || prop.type === "array") {
            cmd.option(`--${flag} <json>`, desc + reqTag, (val) => JSON.parse(val));
        }
        else {
            cmd.option(`--${flag} <value>`, desc + reqTag);
        }
    }
    return keyMap;
}
/** Map Commander's camelCase opts back to original tool property keys. */
function mapOptsToInput(opts, keyMap) {
    const input = {};
    for (const [camel, original] of keyMap) {
        if (opts[camel] !== undefined) {
            input[original] = opts[camel];
        }
    }
    return input;
}
/** camelCase / snake_case → kebab-case */
function toKebab(str) {
    return str
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase();
}
/** kebab-case → camelCase */
function toCamel(str) {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
/** Extract the first sentence from a description. */
function firstSentence(str) {
    const match = str.match(/^[^.\n]+\.?/);
    return match?.[0]?.trim() ?? str.slice(0, 80);
}
// ---------------------------------------------------------------------------
// Tool output formatters
// ---------------------------------------------------------------------------
const TESTNET_CHAINS = new Set([
    "sepolia",
    "base-sepolia",
    "tempo-testnet",
    "solana-devnet",
]);
const toolFormatters = {
    get_balance(data) {
        const chains = data;
        const rows = [];
        let emptyCount = 0;
        for (const [chain, info] of Object.entries(chains)) {
            if (TESTNET_CHAINS.has(chain))
                continue;
            if (info.balances.length === 0) {
                emptyCount++;
                continue;
            }
            for (const b of info.balances) {
                rows.push({
                    chain,
                    token: b.token,
                    amount: b.amount,
                    usd: b.usdValue ? `$${b.usdValue}` : "-",
                });
            }
        }
        if (rows.length === 0) {
            p.log.info("No balances found.");
            return;
        }
        const col = {
            chain: Math.max(5, ...rows.map((r) => r.chain.length)),
            token: Math.max(5, ...rows.map((r) => r.token.length)),
            amount: Math.max(6, ...rows.map((r) => r.amount.length)),
            usd: Math.max(3, ...rows.map((r) => r.usd.length)),
        };
        const row = (c, t, a, u) => `  ${c.padEnd(col.chain)}  ${t.padEnd(col.token)}  ${a.padStart(col.amount)}  ${u.padStart(col.usd)}`;
        console.log();
        console.log(row("Chain", "Token", "Amount", "USD"));
        console.log(`  ${"─".repeat(col.chain + col.token + col.amount + col.usd + 6)}`);
        for (const r of rows) {
            console.log(row(r.chain, r.token, r.amount, r.usd));
        }
        console.log();
        if (emptyCount > 0) {
            p.log.step(`${emptyCount} chain${emptyCount !== 1 ? "s" : ""} with no balance`);
        }
    },
};
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function formatToolTitle(tool) {
    return tool.cli_output?.title ?? tool.name.replace(/_/g, " ");
}
function getPathValue(data, path) {
    return path.split(".").reduce((current, segment) => {
        if (!isRecord(current))
            return undefined;
        return current[segment];
    }, data);
}
function getValueByKey(data, key) {
    const paths = Array.isArray(key) ? key : [key];
    for (const path of paths) {
        const value = getPathValue(data, path);
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }
    return undefined;
}
function resolveOutputData(data, config) {
    if (!config.dataPath)
        return data;
    return getPathValue(data, config.dataPath);
}
function formatInlineValue(value) {
    if (value === null || value === undefined || value === "")
        return "-";
    if (typeof value === "boolean")
        return value ? "yes" : "no";
    if (typeof value === "string")
        return value.replace(/\s+/g, " ").trim() || "-";
    if (typeof value === "number" || typeof value === "bigint")
        return String(value);
    if (Array.isArray(value)) {
        return value.map((item) => formatInlineValue(item)).join(", ");
    }
    if (isRecord(value)) {
        return JSON.stringify(value);
    }
    return String(value);
}
function formatBlockValue(value) {
    if (typeof value === "string")
        return value;
    return JSON.stringify(value, null, 2);
}
function renderFields(title, fields, data) {
    const lines = [];
    const notes = [];
    for (const field of fields) {
        const value = getValueByKey(data, field.key);
        if (value === undefined || value === null || value === "")
            continue;
        const formatted = formatBlockValue(value);
        if (formatted.includes("\n") || formatted.length > 120) {
            notes.push({ title: field.label, body: formatted });
            continue;
        }
        lines.push(`${field.label}: ${formatInlineValue(value)}`);
    }
    if (lines.length === 0 && notes.length === 0) {
        return false;
    }
    p.log.success(title);
    if (lines.length > 0) {
        p.log.info(lines.join("\n"));
    }
    for (const note of notes) {
        p.note(note.body, note.title);
    }
    return true;
}
function renderTable(title, columns, rows) {
    const normalizedRows = rows.filter(isRecord);
    if (normalizedRows.length === 0) {
        return false;
    }
    const widths = columns.map((column) => Math.max(column.label.length, ...normalizedRows.map((row) => formatInlineValue(getValueByKey(row, column.key)).length)));
    const renderRow = (values) => `  ${values.map((value, index) => value.padEnd(widths[index])).join("  ")}`;
    p.log.success(title);
    console.log(renderRow(columns.map((column) => column.label)));
    console.log(`  ${"-".repeat(widths.reduce((sum, width) => sum + width, 0) + (columns.length - 1) * 2)}`);
    for (const row of normalizedRows) {
        console.log(renderRow(columns.map((column) => formatInlineValue(getValueByKey(row, column.key)))));
    }
    return true;
}
function renderTxOutput(title, data) {
    if (!isRecord(data))
        return false;
    const hash = getValueByKey(data, ["transactionHash", "txHash", "signature"]);
    const lines = [
        hash ? `Transaction: ${formatInlineValue(hash)}` : undefined,
        getValueByKey(data, "status") ? `Status: ${formatInlineValue(getValueByKey(data, "status"))}` : undefined,
        getValueByKey(data, "explorerUrl") ? `Explorer: ${formatInlineValue(getValueByKey(data, "explorerUrl"))}` : undefined,
        getValueByKey(data, "chain") ? `Chain: ${formatInlineValue(getValueByKey(data, "chain"))}` : undefined,
        getValueByKey(data, "from") ? `Signer: ${formatInlineValue(getValueByKey(data, "from"))}` : undefined,
        getValueByKey(data, "message") ? formatInlineValue(getValueByKey(data, "message")) : undefined,
    ].filter((line) => Boolean(line));
    if (lines.length === 0) {
        return false;
    }
    p.log.success(title);
    p.log.info(lines.join("\n"));
    return true;
}
function renderLinkOutput(title, config, data) {
    const linkValue = getValueByKey(data, config.linkField ?? ["url", "dashboardUrl"]);
    if (!linkValue)
        return false;
    p.log.success(title);
    p.log.info(`Link: ${formatInlineValue(linkValue)}`);
    if (config.fields?.length) {
        const extraLines = config.fields
            .map((field) => {
            const value = getValueByKey(data, field.key);
            if (value === undefined || value === null || value === "")
                return undefined;
            return `${field.label}: ${formatInlineValue(value)}`;
        })
            .filter((line) => Boolean(line));
        if (extraLines.length > 0) {
            p.log.info(extraLines.join("\n"));
        }
    }
    return true;
}
function renderHttpResponse(title, data) {
    if (!isRecord(data))
        return false;
    const status = getValueByKey(data, "status");
    const ok = getValueByKey(data, "ok");
    const paymentMade = getValueByKey(data, "payment_made");
    const paymentDetails = getValueByKey(data, "payment_details");
    const route = getValueByKey(data, "route");
    const hint = getValueByKey(data, "hint");
    const headline = status ? `${title}: ${formatInlineValue(status)}` : title;
    if (ok === false) {
        p.log.warn(headline);
    }
    else {
        p.log.success(headline);
    }
    const lines = [
        typeof ok === "boolean" ? `OK: ${formatInlineValue(ok)}` : undefined,
        typeof paymentMade === "boolean" ? `Payment made: ${formatInlineValue(paymentMade)}` : undefined,
        paymentDetails && isRecord(paymentDetails)
            ? `Payment: ${[
                getValueByKey(paymentDetails, "amount"),
                getValueByKey(paymentDetails, "token"),
                getValueByKey(paymentDetails, "chain"),
            ]
                .filter((part) => part !== undefined && part !== null && part !== "")
                .map((part) => formatInlineValue(part))
                .join(" ")}${getValueByKey(paymentDetails, "to") ? ` -> ${formatInlineValue(getValueByKey(paymentDetails, "to"))}` : ""}`
            : undefined,
        route && isRecord(route)
            ? `Route: ${formatInlineValue(getValueByKey(route, "selected_protocol"))} on ${formatInlineValue(getValueByKey(route, "selected_chain"))}${getValueByKey(route, "fallback_used") ? " (fallback)" : ""}`
            : undefined,
    ].filter((line) => Boolean(line));
    if (lines.length > 0) {
        p.log.info(lines.join("\n"));
    }
    if (hint) {
        p.note(formatBlockValue(hint), "Hint");
    }
    const body = getValueByKey(data, "data");
    if (body !== undefined) {
        if (typeof body === "string" && body.length <= 240 && !body.includes("\n")) {
            p.note(body, "Response body");
        }
        else {
            console.log(JSON.stringify(body, null, 2));
        }
    }
    return true;
}
function renderGenericCliOutput(tool, data) {
    const config = tool.cli_output;
    if (!config)
        return false;
    const target = resolveOutputData(data, config);
    const title = formatToolTitle(tool);
    switch (config.kind) {
        case "tx":
            return renderTxOutput(title, target);
        case "fields":
            return renderFields(title, config.fields ?? [], target);
        case "table":
            if (!Array.isArray(target)) {
                return false;
            }
            if (target.length === 0) {
                p.log.info(config.emptyMessage ?? "No results found.");
                return true;
            }
            return renderTable(title, config.columns ?? [], target);
        case "link":
            return renderLinkOutput(title, config, target);
        case "http_response":
            return renderHttpResponse(title, target);
        default:
            return false;
    }
}
export function displayToolResult(tool, data) {
    const formatter = toolFormatters[tool.name];
    if (formatter) {
        formatter(data);
        return;
    }
    if (renderGenericCliOutput(tool, data)) {
        return;
    }
    p.log.success(formatToolTitle(tool));
    console.log(JSON.stringify(data, null, 2));
}
//# sourceMappingURL=cli.js.map