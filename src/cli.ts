import { Command, Help, Option } from "commander";
import * as p from "@clack/prompts";
import { SpongeWallet } from "./client.js";
import { deviceFlowAuth } from "./auth/device-flow.js";
import {
  deleteCredentials,
  getCredentialsPath,
  loadCredentials,
  saveCredentials,
} from "./auth/credentials.js";
import { registerAgentFirst } from "./registration.js";
import {
  TOOL_DEFINITIONS,
  type CliOutputColumn,
  type CliOutputDefinition,
  type CliOutputField,
  type ToolDefinition,
} from "./tools/definitions.js";
import type {
  AgentFirstRegistrationResponse,
  Credentials,
} from "./types/schemas.js";

const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";

// ---------------------------------------------------------------------------
// Option types (mirrors Commander's parsed output)
// ---------------------------------------------------------------------------

interface SharedOpts {
  baseUrl?: string;
  credentialsPath?: string;
}

interface AuthOpts extends SharedOpts {
  name?: string;
  email?: string;
  browser: boolean; // --no-browser → false
}

interface OnboardOpts extends AuthOpts {
  deviceFlow?: boolean;
  claimRequired: boolean; // --no-claim-required → false
}

interface McpPrintOpts extends AuthOpts {
  json?: boolean;
}

interface CliMetadata {
  commandName?: string;
  packageName?: string;
  version?: string;
}

// ---------------------------------------------------------------------------
// CLI setup
// ---------------------------------------------------------------------------

export function buildCliProgram(metadata: CliMetadata = {}): Command {
  const cmdName = metadata.commandName ?? "spongewallet";
  const pkgName = metadata.packageName ?? "@paysponge/sdk";
  const version = metadata.version ?? "0.1.0";

  const program = new Command()
    .name(cmdName)
    .description(`${pkgName} – CLI for managing agent wallets`)
    .version(`${pkgName} v${version}`, "-v, --version");

  program.showSuggestionAfterError();
  program.showHelpAfterError();

  const shared = (cmd: Command) =>
    cmd
      .option("--base-url <url>", "custom API URL")
      .option("--credentials-path <path>", "custom credentials file path");

  const withAuth = (cmd: Command) =>
    shared(cmd)
      .option("--name <name>", "agent name")
      .option("--email <email>", "email to associate with the agent")
      .option("--no-browser", "don't auto-open browser");

  withAuth(
    program
      .command("init")
      .description(
        "Create an agent, show wallet addresses, and print MCP config"
      )
  )
    .option("--claim-required", "include claim text (default)")
    .option("--no-claim-required", "disable claim text")
    .action((opts: OnboardOpts) => handleInit(opts, metadata));

  withAuth(
    program
      .command("login")
      .description("Claim a pending agent or authenticate and cache credentials")
  ).action((opts: AuthOpts) => handleLogin(opts));

  shared(
    program.command("logout").description("Remove stored credentials")
  ).action((opts: SharedOpts) => handleLogout(opts));

  shared(
    program
      .command("whoami")
      .description("Show current authentication status")
  ).action((opts: SharedOpts) => handleWhoami(opts, metadata));

  const mcpCmd = program
    .command("mcp")
    .description("MCP configuration commands");

  withAuth(
    mcpCmd.command("print").description("Print authenticated MCP config")
  )
    .option("--json", "print only raw MCP config JSON")
    .action((opts: McpPrintOpts) => handleMcpPrint(opts));

  registerCuratedCommands(program, shared);

  const advancedCmd = program
    .command("advanced")
    .description("Low-level commands mirroring the raw tool surface");
  registerToolCommands(advancedCmd, shared);

  applyHelpTheme(program, metadata);

  return program;
}

export async function runCli(
  args: string[],
  metadata: CliMetadata = {}
): Promise<void> {
  const program = buildCliProgram(metadata);
  await program.parseAsync(args, { from: "user" });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleLogin(opts: AuthOpts) {
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

async function handleInit(opts: OnboardOpts, meta: CliMetadata) {
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

async function printOnboardingSummary(args: {
  wallet: SpongeWallet;
  meta: CliMetadata;
  opts: OnboardOpts;
  registration?: AgentFirstRegistrationResponse;
}) {
  const { wallet, meta, opts, registration } = args;
  const [agent, addresses] = await Promise.all([
    wallet.getAgent(),
    wallet.getAddresses(),
  ]);
  const config = wallet.mcp();

  if (registration) {
    const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
    const credentials: Credentials = {
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

  const mcpSnippet = JSON.stringify(
    { mcpServers: { sponge: config } },
    null,
    2
  );
  p.note(mcpSnippet, "MCP Config");

  const cmd = meta.commandName ?? "spongewallet";
  p.log.step(`Next: ${cmd} mcp print`);
  p.log.step(
    "Set SPONGE_API_KEY on other machines for non-interactive access"
  );

  p.outro("Done!");
}

async function handleLogout(opts: SharedOpts) {
  const creds = loadCredentials(opts.credentialsPath);
  if (!creds) {
    p.log.info("Not logged in.");
    return;
  }

  deleteCredentials(opts.credentialsPath);
  p.log.success("Logged out.");
  p.log.info(
    `Removed credentials from ${getCredentialsPath(opts.credentialsPath)}`
  );
}

async function handleWhoami(opts: SharedOpts, meta: CliMetadata) {
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
    if (opts.baseUrl) lines.push(`API URL:    ${opts.baseUrl}`);
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
  if (creds.agentName) lines.push(`Agent Name:  ${creds.agentName}`);
  lines.push(`API Key:     ${creds.apiKey.substring(0, 20)}...`);
  if (creds.baseUrl) lines.push(`API URL:     ${creds.baseUrl}`);
  if (creds.claimUrl) lines.push(`Claim URL:   ${creds.claimUrl}`);
  if (creds.claimCode) lines.push(`Claim Code:  ${creds.claimCode}`);
  lines.push(
    `Credentials: ${getCredentialsPath(opts.credentialsPath)}`
  );
  p.log.info(lines.join("\n"));
}

async function handleMcpPrint(opts: McpPrintOpts) {
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
  p.note(
    JSON.stringify({ mcpServers: { sponge: config } }, null, 2),
    "Claude Code / Cursor snippet"
  );
}

async function continueClaimFlow(creds: Credentials, opts: AuthOpts) {
  p.intro("Pending agent claim found");
  p.log.info(`Agent ID:  ${creds.agentId}`);
  if (creds.agentName) p.log.info(`Agent:     ${creds.agentName}`);
  if (creds.claimCode) p.log.info(`Claim Code: ${creds.claimCode}`);
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
  } catch {
    p.log.step("Could not open browser automatically. Open the claim URL manually.");
  }

  p.log.info("After the browser claim completes, the cached API key will keep working for this agent.");
  p.outro("Claim flow ready");
}

function requiredInput(
  opts: Record<string, unknown>,
  positional: string | undefined,
  optionKey: string,
  flagName: string
): string {
  const fromOption = opts[optionKey];
  const value =
    positional
    ?? (typeof fromOption === "string" ? fromOption : undefined);

  if (!value) {
    throw new Error(`missing required argument or option: ${flagName}`);
  }

  return value;
}

function isTempoChain(chain: string): chain is "tempo" | "tempo-testnet" {
  return chain === "tempo" || chain === "tempo-testnet";
}

function normalizeTempoTokenSymbol(
  token: string,
  chain: "tempo" | "tempo-testnet"
): string {
  const trimmed = token.trim();

  if (trimmed.startsWith("0x") && trimmed.length === 42) {
    return trimmed;
  }

  const normalized = trimmed.toLowerCase().replace(/[\s_-]/g, "");
  const aliasMap: Record<string, string> = {
    path: "pathUSD",
    pathusd: "pathUSD",
    alpha: "AlphaUSD",
    alphausd: "AlphaUSD",
    beta: "BetaUSD",
    betausd: "BetaUSD",
    theta: "ThetaUSD",
    thetausd: "ThetaUSD",
    usdc: chain === "tempo" ? "USDC.e" : "pathUSD",
    "usdc.e": chain === "tempo" ? "USDC.e" : "pathUSD",
    usdce: chain === "tempo" ? "USDC.e" : "pathUSD",
  };

  return aliasMap[normalized] ?? trimmed;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultAgentName(email?: string): string {
  const local = email?.split("@")[0]?.trim().toLowerCase();
  const slug = local
    ?.replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `agent-${slug}` : "sponge-agent";
}

const ANSI_PATTERN = /\u001B\[[0-9;]*m/g;
const HELP_COLOR_ENABLED = Boolean(
  !process.env.NO_COLOR
  && (process.stdout.isTTY || process.env.FORCE_COLOR)
);

function ansi(text: string, open: string, close = "\u001B[0m"): string {
  if (!HELP_COLOR_ENABLED) return text;
  return `${open}${text}${close}`;
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

function bold(text: string): string {
  return ansi(text, "\u001B[1m");
}

function cyan(text: string): string {
  return ansi(text, "\u001B[36m");
}

function green(text: string): string {
  return ansi(text, "\u001B[32m");
}

function dim(text: string): string {
  return ansi(text, "\u001B[2m");
}

function toTitleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function commandPath(command: Command): string[] {
  const parts: string[] = [];
  let current: Command | null = command;

  while (current) {
    parts.unshift(current.name());
    current = current.parent ?? null;
  }

  return parts;
}

function buildHelpBanner(command: Command, metadata: CliMetadata): string {
  const path = commandPath(command);
  const rootName = metadata.commandName ?? "spongewallet";
  const title =
    path.length === 1
      ? "Sponge Wallet CLI"
      : `Sponge Wallet ${path.slice(1).map(toTitleCase).join(" ")}`;
  const subtitle =
    path.length === 1
      ? "Manage agent wallets, swaps, payments, and MCP setup."
      : command.description() || `${rootName} command help`;
  const lines = [bold(green(title)), "", dim(subtitle)];
  const width = Math.max(...lines.map((line) => stripAnsi(line).length));
  const top = cyan(`╭${"─".repeat(width + 2)}╮`);
  const bottom = cyan(`╰${"─".repeat(width + 2)}╯`);
  const body = lines.map((line) => {
    const padding = " ".repeat(width - stripAnsi(line).length);
    return `${cyan("│")} ${line}${padding} ${cyan("│")}`;
  });

  return [top, ...body, bottom].join("\n");
}

function applyHelpTheme(command: Command, metadata: CliMetadata) {
  command.configureHelp({
    commandDescription: () => "",
    styleTitle: (text) => bold(cyan(text)),
    styleCommandText: (text) => bold(green(text)),
    styleSubcommandText: (text) => green(text),
    styleOptionText: (text) => cyan(text),
    styleArgumentText: (text) => bold(text),
    styleDescriptionText: (text) => text,
    formatHelp(cmd, helper) {
      const description = cmd.description();
      const lines = Help.prototype.formatHelp.call(helper, cmd, helper)
        .trimEnd()
        .split("\n");

      if (description && lines[2] === description && lines[3] === "") {
        lines.splice(2, 2);
      }

      const body = lines.join("\n");
      return `${buildHelpBanner(cmd, metadata)}\n\n${body}\n`;
    },
  });

  for (const subcommand of command.commands) {
    applyHelpTheme(subcommand, metadata);
  }
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
] as const;

const EVM_CHAIN_VALUES = ["ethereum", "base", "sepolia", "base-sepolia"] as const;
const SOLANA_CHAIN_VALUES = ["solana", "solana-devnet"] as const;
const TEMPO_CHAIN_VALUES = ["tempo", "tempo-testnet"] as const;
const ONRAMP_CHAIN_VALUES = ["base", "solana", "polygon"] as const;
const PAY_CHAIN_VALUES = ["base", "solana", "tempo", "ethereum"] as const;
const PREFERRED_X402_CHAINS = ["base", "solana", "ethereum"] as const;

type WalletSessionOpts = SharedOpts & Record<string, unknown>;

function registerCuratedCommands(
  program: Command,
  shared: (cmd: Command) => Command
) {
  shared(program.command("balance").description("Show wallet balances"))
    .addOption(new Option("--chain <chain>", "specific chain").choices([...CHAIN_VALUES, "all"]))
    .option("--allowed-chains <chains>", "comma-separated chain allowlist")
    .option("--only-usdc", "only show USDC balances")
    .action(async (opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const data = await wallet.getDetailedBalances({
        chain: opts.chain as any,
        allowedChains: parseCsv(opts.allowedChains as string | undefined) as any,
        onlyUsdc: Boolean(opts.onlyUsdc),
      });
      displayToolResult(getToolDefinition("get_balance"), data);
    });

  shared(program.command("send").description("Send assets on EVM, Solana, or Tempo"))
    .usage("<chain> <to> <asset> <amount> [options]")
    .argument("<chain>", "destination chain")
    .argument("<to>", "recipient address")
    .argument("<asset>", "currency symbol or token symbol/address")
    .argument("<amount>", "amount to send")
    .option("--chain <chain>", "destination chain")
    .option("--to <address>", "recipient address")
    .option("--amount <amount>", "amount to send")
    .option("--asset <asset>", "currency symbol or token symbol/address")
    .addHelpText("after", "\nExamples:\n  spongewallet send base 0xabc... USDC 10\n  spongewallet send tempo 0xabc... usdce 1\n")
    .action(async (
      chainArg: string | undefined,
      toArg: string | undefined,
      assetArg: string | undefined,
      amountArg: string | undefined,
      opts: Record<string, unknown>,
    ) => {
      const wallet = await connectWallet(opts);
      const chain = requiredInput(opts, chainArg, "chain", "--chain");
      const asset = isTempoChain(chain)
        ? normalizeTempoTokenSymbol(requiredInput(opts, assetArg, "asset", "--asset"), chain)
        : requiredInput(opts, assetArg, "asset", "--asset");
      const input =
        chain === "tempo" || chain === "tempo-testnet"
          ? {
              chain,
              to: requiredInput(opts, toArg, "to", "--to"),
              amount: requiredInput(opts, amountArg, "amount", "--amount"),
              token: asset,
            }
          : {
              chain,
              to: requiredInput(opts, toArg, "to", "--to"),
              amount: requiredInput(opts, amountArg, "amount", "--amount"),
              currency: asset,
            };
      const data = await wallet.transfer(input as any);
      displayToolResult(getToolDefinition(chain.startsWith("solana") ? "solana_transfer" : "evm_transfer"), data);
    });

  shared(program.command("history").description("Show recent transaction history"))
    .usage("[limit] [options]")
    .argument("[limit]", "maximum number of transactions")
    .option("--limit <n>", "maximum number of transactions", parseInt)
    .addOption(new Option("--chain <chain>", "filter by chain").choices(CHAIN_VALUES))
    .addHelpText("after", "\nExamples:\n  spongewallet history\n  spongewallet history 20 --chain base\n")
    .action(async (limitArg: string | undefined, opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const limit =
        limitArg !== undefined
          ? parseInt(limitArg, 10)
          : opts.limit as number | undefined;
      const data = await wallet.getTransactionHistoryDetailed({
        limit: Number.isFinite(limit as number) ? limit : undefined,
        chain: opts.chain as any,
      });
      displayToolResult(getToolDefinition("get_transaction_history"), data);
    });

  shared(program.command("tokens").description("List Solana wallet tokens"))
    .usage("[chain] [options]")
    .argument("[chain]", "Solana network")
    .option("--chain <chain>", "Solana network")
    .addHelpText("after", "\nExamples:\n  spongewallet tokens\n  spongewallet tokens solana-devnet\n")
    .action(async (chainArg: string | undefined, opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const chain = (chainArg ?? (opts.chain as string | undefined) ?? "solana") as any;
      const data = await wallet.getSolanaTokens(chain);
      displayToolResult(getToolDefinition("get_solana_tokens"), data);
    });

  shared(program.command("search-tokens").description("Search the Solana token list"))
    .usage("<query> [limit] [options]")
    .argument("<query>", "token symbol or name")
    .argument("[limit]", "maximum results")
    .option("--query <query>", "token symbol or name")
    .option("--limit <n>", "maximum results", parseInt)
    .addHelpText("after", "\nExamples:\n  spongewallet search-tokens BONK\n  spongewallet search-tokens BONK 5\n")
    .action(async (queryArg: string | undefined, limitArg: string | undefined, opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const limit =
        limitArg !== undefined
          ? parseInt(limitArg, 10)
          : opts.limit as number | undefined;
      const data = await wallet.searchSolanaTokens(
        requiredInput(opts, queryArg, "query", "--query"),
        Number.isFinite(limit as number) ? limit : undefined,
      );
      displayToolResult(getToolDefinition("search_solana_tokens"), data);
    });

  shared(program.command("onramp").description("Create a fiat-to-crypto onramp link"))
    .usage("[chain] [fiatAmount] [options]")
    .argument("[chain]", "destination chain")
    .argument("[fiatAmount]", "prefill fiat amount")
    .option("--chain <chain>", "destination chain")
    .option("--wallet-address <address>", "destination wallet address (defaults to agent wallet)")
    .addOption(new Option("--provider <provider>", "onramp provider").choices(["auto", "stripe", "coinbase"]).default("auto"))
    .option("--fiat-amount <amount>", "prefill fiat amount")
    .option("--fiat-currency <code>", "fiat currency code")
    .option("--lock-wallet-address", "lock destination wallet address")
    .option("--redirect-url <url>", "redirect URL after checkout")
    .addHelpText("after", "\nExamples:\n  spongewallet onramp\n  spongewallet onramp base 100\n  spongewallet onramp solana 250 --fiat-currency usd\n")
    .action(async (chainArg: string | undefined, fiatAmountArg: string | undefined, opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const chain = String(chainArg ?? opts.chain ?? "base");
      const walletAddress =
        (opts.walletAddress as string | undefined)
        ?? (await wallet.getAddress(chain as any))
        ?? "";
      const data = await wallet.onrampCrypto({
        wallet_address: walletAddress,
        chain: chain as any,
        provider: opts.provider as any,
        fiat_amount: (fiatAmountArg ?? opts.fiatAmount) as string | undefined,
        fiat_currency: opts.fiatCurrency as string | undefined,
        lock_wallet_address: Boolean(opts.lockWalletAddress),
        redirect_url: opts.redirectUrl as string | undefined,
      });
      displayToolResult(getToolDefinition("create_crypto_onramp"), data);
    });

  const txCmd = program.command("tx").description("Transaction status and signing");

  shared(txCmd.command("status").description("Check transaction status"))
    .usage("<chain> <txHash> [options]")
    .argument("<chain>", "transaction chain")
    .argument("<txHash>", "transaction hash or signature")
    .option("--tx-hash <hash>", "transaction hash or signature")
    .option("--chain <chain>", "transaction chain")
    .addHelpText("after", "\nExamples:\n  spongewallet tx status base 0x123...\n  spongewallet tx status solana 5K2...\n")
    .action(async (chainArg: string | undefined, txHashArg: string | undefined, opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const data = await wallet.getTransactionStatus(
        requiredInput(opts, txHashArg, "txHash", "--tx-hash"),
        requiredInput(opts, chainArg, "chain", "--chain") as any,
      );
      displayToolResult(getToolDefinition("get_transaction_status"), data);
    });

  shared(txCmd.command("sign").description("Sign a Solana transaction without submitting"))
    .requiredOption("--transaction <base64>", "base64-encoded serialized transaction")
    .action(async (opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "solana_sign_transaction", {
        transaction: String(opts.transaction),
      });
    });

  shared(txCmd.command("send").description("Sign and submit a Solana transaction"))
    .requiredOption("--transaction <base64>", "base64-encoded serialized transaction")
    .action(async (opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "solana_sign_and_send_transaction", {
        transaction: String(opts.transaction),
      });
    });

  const swapCmd = program.command("swap").description("Quotes and swaps");

  shared(swapCmd.command("solana").description("Swap on Solana"))
    .usage("[from] [to] [amount] [options]")
    .argument("[from]", "input token")
    .argument("[to]", "output token")
    .argument("[amount]", "amount to swap")
    .addOption(new Option("--chain <chain>", "Solana network").choices(SOLANA_CHAIN_VALUES).default("solana"))
    .option("--from <token>", "input token")
    .option("--to <token>", "output token")
    .option("--amount <amount>", "amount to swap")
    .option("--slippage-bps <bps>", "slippage in basis points", parseInt)
    .addHelpText("after", "\nExamples:\n  spongewallet swap solana SOL USDC 1\n  spongewallet swap solana --chain solana --from SOL --to USDC --amount 1\n")
    .action(async (fromArg: string | undefined, toArg: string | undefined, amountArg: string | undefined, opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const data = await wallet.swap({
        chain: opts.chain as any,
        from: requiredInput(opts, fromArg, "from", "--from"),
        to: requiredInput(opts, toArg, "to", "--to"),
        amount: requiredInput(opts, amountArg, "amount", "--amount"),
        slippageBps: opts.slippageBps as number | undefined,
      });
      displayToolResult(getToolDefinition("solana_swap"), data);
    });

  shared(swapCmd.command("quote").description("Get a Jupiter quote without executing"))
    .usage("[from] [to] [amount] [options]")
    .argument("[from]", "input token")
    .argument("[to]", "output token")
    .argument("[amount]", "amount to quote")
    .addOption(new Option("--chain <chain>", "Solana network").choices(SOLANA_CHAIN_VALUES).default("solana"))
    .option("--from <token>", "input token")
    .option("--to <token>", "output token")
    .option("--amount <amount>", "amount to quote")
    .option("--slippage-bps <bps>", "slippage in basis points", parseInt)
    .addHelpText("after", "\nExamples:\n  spongewallet swap quote SOL USDC 1\n  spongewallet swap quote --chain solana --from SOL --to USDC --amount 1\n")
    .action(async (fromArg: string | undefined, toArg: string | undefined, amountArg: string | undefined, opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "jupiter_swap_quote", {
        chain: opts.chain,
        input_token: requiredInput(opts, fromArg, "from", "--from"),
        output_token: requiredInput(opts, toArg, "to", "--to"),
        amount: requiredInput(opts, amountArg, "amount", "--amount"),
        slippage_bps: opts.slippageBps,
      });
    });

  shared(swapCmd.command("execute").description("Execute a previously quoted Jupiter swap"))
    .usage("<quoteId> [options]")
    .argument("<quoteId>", "quote ID to execute")
    .option("--quote-id <id>", "quote ID to execute")
    .addHelpText("after", "\nExamples:\n  spongewallet swap execute quote_123\n")
    .action(async (quoteIdArg: string | undefined, opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "jupiter_swap_execute", {
        quote_id: requiredInput(opts, quoteIdArg, "quoteId", "--quote-id"),
      });
    });

  shared(swapCmd.command("base").description("Swap on Base via 0x"))
    .usage("[from] [to] [amount] [options]")
    .argument("[from]", "input token")
    .argument("[to]", "output token")
    .argument("[amount]", "amount to swap")
    .option("--from <token>", "input token")
    .option("--to <token>", "output token")
    .option("--amount <amount>", "amount to swap")
    .option("--slippage-bps <bps>", "slippage in basis points", parseInt)
    .addHelpText("after", "\nExamples:\n  spongewallet swap base ETH USDC 0.1\n  spongewallet swap base --from ETH --to USDC --amount 0.1\n")
    .action(async (fromArg: string | undefined, toArg: string | undefined, amountArg: string | undefined, opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "base_swap", {
        input_token: requiredInput(opts, fromArg, "from", "--from"),
        output_token: requiredInput(opts, toArg, "to", "--to"),
        amount: requiredInput(opts, amountArg, "amount", "--amount"),
        slippage_bps: opts.slippageBps,
      });
    });

  shared(swapCmd.command("tempo").description("Swap stablecoins on Tempo via native DEX"))
    .usage("[from] [to] [amount] [options]")
    .argument("[from]", "input token")
    .argument("[to]", "output token")
    .argument("[amount]", "amount to swap")
    .addOption(new Option("--chain <chain>", "Tempo network").choices(TEMPO_CHAIN_VALUES).default("tempo"))
    .option("--from <token>", "input token")
    .option("--to <token>", "output token")
    .option("--amount <amount>", "amount to swap")
    .option("--slippage-bps <bps>", "slippage in basis points", parseInt)
    .addHelpText("after", "\nExamples:\n  spongewallet swap tempo pathUSD USDC.e 1\n  spongewallet swap tempo --chain tempo --from pathUSD --to USDC.e --amount 1\n")
    .action(async (fromArg: string | undefined, toArg: string | undefined, amountArg: string | undefined, opts: Record<string, unknown>) => {
      const chain = String(opts.chain ?? "tempo") as "tempo" | "tempo-testnet";
      await executeToolCommand(opts, "tempo_swap", {
        chain,
        input_token: normalizeTempoTokenSymbol(
          requiredInput(opts, fromArg, "from", "--from"),
          chain
        ),
        output_token: normalizeTempoTokenSymbol(
          requiredInput(opts, toArg, "to", "--to"),
          chain
        ),
        amount: requiredInput(opts, amountArg, "amount", "--amount"),
        slippage_bps: opts.slippageBps,
      });
    });

  shared(program.command("bridge").description("Bridge assets between chains"))
    .usage("[sourceChain] [destinationChain] [token] [amount] [options]")
    .argument("[sourceChain]", "source chain")
    .argument("[destinationChain]", "destination chain")
    .argument("[token]", "token to bridge")
    .argument("[amount]", "amount to bridge")
    .option("--source-chain <chain>", "source chain")
    .option("--destination-chain <chain>", "destination chain")
    .option("--token <token>", "token to bridge")
    .option("--amount <amount>", "amount to bridge")
    .option("--destination-token <token>", "token to receive on destination")
    .option("--recipient-address <address>", "recipient address on destination")
    .addHelpText("after", "\nExamples:\n  spongewallet bridge base solana USDC 25\n  spongewallet bridge base hyperliquid USDC 50\n  spongewallet bridge --source-chain base --destination-chain polymarket --token USDC --amount 50\n")
    .action(async (
      sourceChainArg: string | undefined,
      destinationChainArg: string | undefined,
      tokenArg: string | undefined,
      amountArg: string | undefined,
      opts: Record<string, unknown>,
    ) => {
      await executeToolCommand(opts, "bridge", {
        source_chain: requiredInput(opts, sourceChainArg, "sourceChain", "--source-chain"),
        destination_chain: requiredInput(opts, destinationChainArg, "destinationChain", "--destination-chain"),
        token: requiredInput(opts, tokenArg, "token", "--token"),
        amount: requiredInput(opts, amountArg, "amount", "--amount"),
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
    .action(async (opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const data = await wallet.paidFetch({
        url: String(opts.url),
        chain: opts.chain as any,
        method: opts.method as any,
        headers: opts.headers as Record<string, string> | undefined,
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
    .action(async (opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const data = await wallet.x402Fetch({
        url: String(opts.url),
        preferredChain: opts.chain as any,
        method: opts.method as any,
        headers: opts.headers as Record<string, string> | undefined,
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
    .action(async (opts: Record<string, unknown>) => {
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
    .action(async (opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "get_key_list", {});
    });

  shared(keysCmd.command("get").description("Get a stored key value"))
    .usage("<service> [options]")
    .argument("<service>", "service name")
    .option("--service <service>", "service name")
    .addHelpText("after", "\nExamples:\n  spongewallet keys get openai\n")
    .action(async (serviceArg: string | undefined, opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "get_key_value", {
        service: requiredInput(opts, serviceArg, "service", "--service"),
      });
    });

  shared(keysCmd.command("set").description("Store a service key"))
    .usage("<service> <key> [options]")
    .argument("<service>", "service name")
    .argument("<key>", "key or secret to store")
    .option("--service <service>", "service name")
    .option("--key <secret>", "key or secret to store")
    .option("--label <label>", "friendly label")
    .option("--metadata <json>", "metadata as JSON", parseJsonObject)
    .addHelpText("after", "\nExamples:\n  spongewallet keys set openai sk-... --label primary\n")
    .action(async (serviceArg: string | undefined, keyArg: string | undefined, opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "store_key", {
        service: requiredInput(opts, serviceArg, "service", "--service"),
        key: requiredInput(opts, keyArg, "key", "--key"),
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
    .action(async (opts: Record<string, unknown>) => {
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
    .action(async (opts: Record<string, unknown>) => {
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
    .action(async (opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const data = await wallet.submitPlan({
        title: String(opts.title),
        reasoning: opts.reasoning as string | undefined,
        steps: opts.steps as any,
      });
      displayToolResult(getToolDefinition("submit_plan"), data);
    });

  shared(planCmd.command("approve").description("Approve and execute a submitted plan"))
    .usage("<planId> [options]")
    .argument("<planId>", "plan ID")
    .option("--plan-id <id>", "plan ID")
    .addHelpText("after", "\nExamples:\n  spongewallet plan approve plan_123\n")
    .action(async (planIdArg: string | undefined, opts: Record<string, unknown>) => {
      const wallet = await connectWallet(opts);
      const data = await wallet.approvePlan(
        requiredInput(opts, planIdArg, "planId", "--plan-id"),
      );
      displayToolResult(getToolDefinition("approve_plan"), data);
    });

  const tradeCmd = program.command("trade").description("Single trade proposal flow");

  shared(tradeCmd.command("propose").description("Propose a trade for approval"))
    .usage("<from> <to> <amount> --reason <text> [options]")
    .argument("<from>", "input token")
    .argument("<to>", "output token")
    .argument("<amount>", "amount to trade")
    .option("--from <token>", "input token")
    .option("--to <token>", "output token")
    .option("--amount <amount>", "amount to trade")
    .requiredOption("--reason <text>", "reason shown to the user")
    .addHelpText("after", "\nExamples:\n  spongewallet trade propose ETH USDC 0.5 --reason \"Reduce exposure\"\n")
    .action(async (
      fromArg: string | undefined,
      toArg: string | undefined,
      amountArg: string | undefined,
      opts: Record<string, unknown>,
    ) => {
      const wallet = await connectWallet(opts);
      const data = await wallet.proposeTrade({
        input_token: requiredInput(opts, fromArg, "from", "--from"),
        output_token: requiredInput(opts, toArg, "to", "--to"),
        amount: requiredInput(opts, amountArg, "amount", "--amount"),
        reason: String(opts.reason),
      });
      displayToolResult(getToolDefinition("propose_trade"), data);
    });

  const authCmd = program.command("auth").description("Authentication helpers");

  shared(authCmd.command("siwe").description("Generate a SIWE signature"))
    .usage("<domain> <uri> [options]")
    .argument("<domain>", "requesting domain")
    .argument("<uri>", "resource URI")
    .option("--domain <domain>", "requesting domain")
    .option("--uri <uri>", "resource URI")
    .option("--statement <text>", "human-readable statement")
    .option("--chain-id <id>", "chain ID", parseInt)
    .option("--expiration-time <iso>", "expiration time")
    .option("--not-before <iso>", "not before time")
    .option("--resources <json>", "resources array as JSON", parseJsonValue)
    .addHelpText("after", "\nExamples:\n  spongewallet auth siwe app.example.com https://app.example.com\n")
    .action(async (domainArg: string | undefined, uriArg: string | undefined, opts: Record<string, unknown>) => {
      await executeToolCommand(opts, "generate_siwe", {
        domain: requiredInput(opts, domainArg, "domain", "--domain"),
        uri: requiredInput(opts, uriArg, "uri", "--uri"),
        statement: opts.statement,
        chain_id: opts.chainId,
        expiration_time: opts.expirationTime,
        not_before: opts.notBefore,
        resources: opts.resources,
      });
    });

  const marketCmd = program.command("market").description("Trading venue integrations");
  const hyperliquidCmd = marketCmd.command("hyperliquid").description("Trade or inspect Hyperliquid");

  shared(hyperliquidCmd.command("status").description("Show Hyperliquid account status"))
    .action(async (opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, { action: "status" });
    });

  shared(hyperliquidCmd.command("markets").description("List Hyperliquid markets"))
    .usage("[limit] [offset] [options]")
    .argument("[limit]", "result limit")
    .argument("[offset]", "result offset")
    .option("--limit <n>", "result limit", parseInt)
    .option("--offset <n>", "result offset", parseInt)
    .addHelpText("after", "\nExamples:\n  spongewallet market hyperliquid markets\n  spongewallet market hyperliquid markets 10\n")
    .action(async (limitArg: string | undefined, offsetArg: string | undefined, opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, {
        action: "markets",
        limit: limitArg !== undefined ? parseInt(limitArg, 10) : opts.limit,
        offset: offsetArg !== undefined ? parseInt(offsetArg, 10) : opts.offset,
      });
    });

  shared(hyperliquidCmd.command("positions").description("List open Hyperliquid positions"))
    .action(async (opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, { action: "positions" });
    });

  shared(hyperliquidCmd.command("orders").description("List open Hyperliquid orders"))
    .usage("[limit] [offset] [options]")
    .argument("[limit]", "result limit")
    .argument("[offset]", "result offset")
    .option("--limit <n>", "result limit", parseInt)
    .option("--offset <n>", "result offset", parseInt)
    .addHelpText("after", "\nExamples:\n  spongewallet market hyperliquid orders\n  spongewallet market hyperliquid orders 20\n")
    .action(async (limitArg: string | undefined, offsetArg: string | undefined, opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, {
        action: "orders",
        limit: limitArg !== undefined ? parseInt(limitArg, 10) : opts.limit,
        offset: offsetArg !== undefined ? parseInt(offsetArg, 10) : opts.offset,
      });
    });

  shared(hyperliquidCmd.command("fills").description("List recent Hyperliquid fills"))
    .usage("[limit] [offset] [options]")
    .argument("[limit]", "result limit")
    .argument("[offset]", "result offset")
    .option("--limit <n>", "result limit", parseInt)
    .option("--offset <n>", "result offset", parseInt)
    .addHelpText("after", "\nExamples:\n  spongewallet market hyperliquid fills\n  spongewallet market hyperliquid fills 20\n")
    .action(async (limitArg: string | undefined, offsetArg: string | undefined, opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, {
        action: "fills",
        limit: limitArg !== undefined ? parseInt(limitArg, 10) : opts.limit,
        offset: offsetArg !== undefined ? parseInt(offsetArg, 10) : opts.offset,
      });
    });

  shared(hyperliquidCmd.command("order").description("Place a Hyperliquid order"))
    .argument("<symbol>", "market symbol")
    .argument("<side>", "buy or sell")
    .argument("<type>", "order type")
    .argument("<amount>", "order amount")
    .argument("[price]", "limit price")
    .option("--symbol <symbol>", "market symbol")
    .option("--side <side>", "buy or sell")
    .option("--type <type>", "order type")
    .option("--amount <amount>", "order amount")
    .option("--price <price>", "limit price")
    .addHelpText("after", "\nExamples:\n  spongewallet market hyperliquid order ETH buy market 0.1\n  spongewallet market hyperliquid order ETH buy limit 0.1 3000\n")
    .action(async (
      symbolArg: string | undefined,
      sideArg: string | undefined,
      typeArg: string | undefined,
      amountArg: string | undefined,
      priceArg: string | undefined,
      opts: Record<string, unknown>,
    ) => {
      await executeHyperliquidAction(opts, {
        action: "order",
        symbol: requiredInput(opts, symbolArg, "symbol", "--symbol"),
        side: requiredInput(opts, sideArg, "side", "--side"),
        type: requiredInput(opts, typeArg, "type", "--type"),
        amount: requiredInput(opts, amountArg, "amount", "--amount"),
        price: priceArg ?? (opts.price as string | undefined),
      });
    });

  shared(hyperliquidCmd.command("cancel").description("Cancel a Hyperliquid order"))
    .argument("<orderId>", "order ID")
    .option("--order-id <id>", "order ID")
    .action(async (orderIdArg: string | undefined, opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, {
        action: "cancel",
        order_id: requiredInput(opts, orderIdArg, "orderId", "--order-id"),
      });
    });

  shared(hyperliquidCmd.command("cancel-all").description("Cancel all Hyperliquid orders"))
    .action(async (opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, { action: "cancel_all" });
    });

  shared(hyperliquidCmd.command("leverage").description("Set Hyperliquid leverage"))
    .argument("<symbol>", "market symbol")
    .argument("<leverage>", "leverage")
    .option("--symbol <symbol>", "market symbol")
    .option("--leverage <n>", "leverage", parseFloat)
    .action(async (symbolArg: string | undefined, leverageArg: string | undefined, opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, {
        action: "set_leverage",
        symbol: requiredInput(opts, symbolArg, "symbol", "--symbol"),
        leverage: leverageArg !== undefined ? parseFloat(leverageArg) : opts.leverage,
      });
    });

  shared(hyperliquidCmd.command("raw").description("Call a raw Hyperliquid action"))
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
    .action(async (opts: Record<string, unknown>) => {
      await executeHyperliquidAction(opts, {
        ...(opts.json as Record<string, unknown> | undefined),
        action: String(opts.action),
        symbol: opts.symbol as string | undefined,
        side: opts.side as any,
        type: opts.type as any,
        amount: opts.amount as string | undefined,
        price: opts.price as string | undefined,
        leverage: opts.leverage as number | undefined,
        order_id: opts.orderId as string | undefined,
        limit: opts.limit as number | undefined,
        offset: opts.offset as number | undefined,
      });
    });
}

async function connectWallet(opts: WalletSessionOpts): Promise<SpongeWallet> {
  return SpongeWallet.connect({
    baseUrl: opts.baseUrl as string | undefined,
    credentialsPath: opts.credentialsPath as string | undefined,
  });
}

async function executeHyperliquidAction(
  opts: WalletSessionOpts,
  input: Record<string, unknown>,
) {
  const wallet = await connectWallet(opts);
  const data = await wallet.hyperliquid(input as any);
  displayToolResult(getToolDefinition("hyperliquid"), data);
}

async function executeToolCommand(
  opts: WalletSessionOpts,
  toolName: string,
  input: Record<string, unknown>,
) {
  const wallet = await connectWallet(opts);
  const tools = await wallet.tools();
  const result = await tools.execute(toolName, input);

  if (result.status === "error") {
    p.log.error(result.error);
    process.exit(1);
  }

  displayToolResult(getToolDefinition(toolName), result.data);
}

function getToolDefinition(name: string): ToolDefinition {
  const tool = TOOL_DEFINITIONS.find((entry) => entry.name === name);
  if (!tool) {
    throw new Error(`Unknown CLI tool mapping: ${name}`);
  }
  return tool;
}

function parseCsv(value?: string): string[] | undefined {
  if (!value) return undefined;
  const values = value.split(",").map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function parseJsonValue(value: string): unknown {
  return JSON.parse(value);
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value);
  if (!isRecord(parsed)) {
    throw new Error("Expected a JSON object");
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Auto-generated raw tool commands
// ---------------------------------------------------------------------------

interface SchemaProperty {
  type?: string;
  enum?: string[];
  description?: string;
}

function registerToolCommands(
  program: Command,
  shared: (cmd: Command) => Command
) {
  for (const tool of TOOL_DEFINITIONS) {
    const cmdName = tool.name.replace(/_/g, "-");
    const cmd = program
      .command(cmdName)
      .description(firstSentence(tool.description));

    shared(cmd);

    const keyMap = addSchemaOptions(cmd, tool.input_schema);

    cmd.action(async (opts: Record<string, unknown>, command: Command) => {
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
        baseUrl: opts.baseUrl as string | undefined,
        credentialsPath: opts.credentialsPath as string | undefined,
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
function addSchemaOptions(
  cmd: Command,
  schema: { properties: Record<string, unknown>; required?: string[] }
): Map<string, string> {
  const keyMap = new Map<string, string>();
  const { properties, required = [] } = schema;

  for (const [originalKey, raw] of Object.entries(properties)) {
    const prop = raw as SchemaProperty;
    const flag = toKebab(originalKey);
    const camel = toCamel(flag);
    keyMap.set(camel, originalKey);

    const desc = prop.description ?? "";
    const isReq = required.includes(originalKey);

    const reqTag = isReq ? " (required)" : "";

    if (prop.enum) {
      const opt = new Option(`--${flag} <value>`, desc + reqTag).choices(prop.enum);
      cmd.addOption(opt);
    } else if (prop.type === "boolean") {
      cmd.option(`--${flag}`, desc + reqTag);
    } else if (prop.type === "number") {
      cmd.option(`--${flag} <n>`, desc + reqTag, parseFloat);
    } else if (prop.type === "object" || prop.type === "array") {
      cmd.option(`--${flag} <json>`, desc + reqTag, (val: string) => JSON.parse(val));
    } else {
      cmd.option(`--${flag} <value>`, desc + reqTag);
    }
  }

  return keyMap;
}

/** Map Commander's camelCase opts back to original tool property keys. */
function mapOptsToInput(
  opts: Record<string, unknown>,
  keyMap: Map<string, string>
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const [camel, original] of keyMap) {
    if (opts[camel] !== undefined) {
      input[original] = opts[camel];
    }
  }
  return input;
}

/** camelCase / snake_case → kebab-case */
function toKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

/** kebab-case → camelCase */
function toCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Extract the first sentence from a description. */
function firstSentence(str: string): string {
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

type ToolFormatter = (data: unknown) => void;

const toolFormatters: Record<string, ToolFormatter> = {
  get_balance(data) {
    const chains = data as Record<
      string,
      { address: string; balances: { token: string; amount: string; usdValue?: string }[] }
    >;

    const rows: { chain: string; token: string; amount: string; usd: string }[] = [];
    let emptyCount = 0;
    let totalUsd = 0;

    for (const [chain, info] of Object.entries(chains)) {
      if (TESTNET_CHAINS.has(chain)) continue;
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
        if (b.usdValue) {
          const parsed = Number(b.usdValue);
          if (Number.isFinite(parsed)) totalUsd += parsed;
        }
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

    const row = (c: string, t: string, a: string, u: string) =>
      `  ${c.padEnd(col.chain)}  ${t.padEnd(col.token)}  ${a.padStart(col.amount)}  ${u.padStart(col.usd)}`;

    console.log();
    console.log(row("Chain", "Token", "Amount", "USD"));
    console.log(`  ${"─".repeat(col.chain + col.token + col.amount + col.usd + 6)}`);
    for (const r of rows) {
      console.log(row(r.chain, r.token, r.amount, r.usd));
    }
    console.log();
    console.log(`  Total: $${totalUsd.toFixed(2)}`);
    console.log();

    if (emptyCount > 0) {
      p.log.step(`${emptyCount} chain${emptyCount !== 1 ? "s" : ""} with no balance`);
    }
  },
  hyperliquid(data) {
    if (!isRecord(data)) {
      p.log.success("Hyperliquid");
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const action = getValueByKey(data, "tool_call.arguments.action");
    const title = action
      ? `Hyperliquid ${toTitleCase(String(action).replace(/_/g, " "))}`
      : "Hyperliquid";

    if (getValueByKey(data, "address") && isRecord(getValueByKey(data, "balances"))) {
      const perps = getValueByKey(data, "balances.perps") as Record<string, unknown> | undefined;
      const spot = getValueByKey(data, "balances.spot") as Record<string, unknown> | undefined;
      const openOrders = getValueByKey(data, "openOrders");
      const spotRows = Object.entries(spot ?? {}).map(([symbol, value]) => ({
        symbol,
        amount: getValueByKey(value, "amount"),
        usdValue: getValueByKey(value, "usdValue"),
      }));

      p.log.success(title);
      p.log.info([
        `Wallet: ${formatInlineValue(getValueByKey(data, "address"))}`,
        `Perps total: ${formatInlineValue(getValueByKey(perps, "total.USDC"))} USDC`,
        `Perps free: ${formatInlineValue(getValueByKey(perps, "free.USDC"))} USDC`,
        `Perps used: ${formatInlineValue(getValueByKey(perps, "used.USDC"))} USDC`,
        `Spot assets: ${spotRows.length}`,
        `Open orders: ${formatInlineValue(getValueByKey(data, "openOrderCount"))}`,
      ].join("\n"));

      if (spotRows.length > 0) {
        renderTable("Spot balances", [
          { key: "symbol", label: "Symbol" },
          { key: "amount", label: "Amount" },
          { key: "usdValue", label: "USD Value" },
        ], spotRows);
      }

      if (Array.isArray(openOrders) && openOrders.length > 0) {
        renderTable("Open orders", [
          { key: "symbol", label: "Symbol" },
          { key: "side", label: "Side" },
          { key: "price", label: "Price" },
          { key: "remaining", label: "Remaining" },
          { key: "status", label: "Status" },
        ], openOrders);
      }
      return;
    }

    const positions = getValueByKey(data, "positions");
    if (Array.isArray(positions)) {
      if (positions.length === 0) {
        p.log.info("No open Hyperliquid positions.");
        return;
      }
      renderTable(title, [
        { key: "symbol", label: "Symbol" },
        { key: "side", label: "Side" },
        { key: "contracts", label: "Size" },
        { key: "entryPrice", label: "Entry" },
        { key: "markPrice", label: "Mark" },
        { key: "leverage", label: "Lev" },
        { key: "unrealizedPnl", label: "PnL" },
      ], positions);
      return;
    }

    const orders = getValueByKey(data, "orders");
    if (Array.isArray(orders)) {
      if (orders.length === 0) {
        p.log.info("No open Hyperliquid orders.");
        return;
      }
      renderTable(title, [
        { key: "symbol", label: "Symbol" },
        { key: "side", label: "Side" },
        { key: "price", label: "Price" },
        { key: "remaining", label: "Remaining" },
        { key: "reduceOnly", label: "Reduce" },
        { key: "status", label: "Status" },
      ], orders);
      return;
    }

    const fills = getValueByKey(data, "fills");
    if (Array.isArray(fills)) {
      if (fills.length === 0) {
        p.log.info("No recent Hyperliquid fills.");
        return;
      }
      renderTable(title, [
        { key: "symbol", label: "Symbol" },
        { key: "side", label: "Side" },
        { key: "price", label: "Price" },
        { key: "amount", label: "Amount" },
        { key: "closedPnl", label: "PnL" },
        { key: "datetime", label: "Time" },
      ], fills);
      return;
    }

    const markets = getValueByKey(data, "markets");
    if (Array.isArray(markets)) {
      if (markets.length === 0) {
        p.log.info("No Hyperliquid markets found.");
        return;
      }
      renderTable(title, [
        { key: "symbol", label: "Symbol" },
        { key: "type", label: "Type" },
        { key: "base", label: "Base" },
        { key: "quote", label: "Quote" },
        { key: "maxLeverage", label: "Max Lev" },
      ], markets);

      const total = getValueByKey(data, "total");
      const nextOffset = getValueByKey(data, "nextOffset");
      if (total !== undefined) {
        p.log.info(`Showing ${markets.length} of ${formatInlineValue(total)} markets.`);
      }
      if (nextOffset !== null && nextOffset !== undefined) {
        p.log.info(`Next offset: ${formatInlineValue(nextOffset)}`);
      }
      return;
    }

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== "tool_call")
    );

    if (renderFields(title, [
      { key: "message", label: "Message" },
      { key: "status", label: "Status" },
      { key: "orderId", label: "Order ID" },
      { key: "clientOrderId", label: "Client Order ID" },
      { key: "symbol", label: "Symbol" },
      { key: "leverage", label: "Leverage" },
      { key: "cancelled", label: "Cancelled" },
      { key: "address", label: "Address" },
      { key: "webChartUrl", label: "Chart" },
    ], cleanData)) {
      return;
    }

    p.log.success(title);
    console.log(JSON.stringify(cleanData, null, 2));
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatToolTitle(tool: ToolDefinition): string {
  return tool.cli_output?.title ?? tool.name.replace(/_/g, " ");
}

function getPathValue(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, data);
}

function getValueByKey(data: unknown, key: string | string[]): unknown {
  const paths = Array.isArray(key) ? key : [key];
  for (const path of paths) {
    const value = getPathValue(data, path);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function resolveOutputData(data: unknown, config: CliOutputDefinition): unknown {
  if (!config.dataPath) return data;
  return getPathValue(data, config.dataPath);
}

function formatInlineValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim() || "-";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => formatInlineValue(item)).join(", ");
  }
  if (isRecord(value)) {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatBlockValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function renderFields(title: string, fields: CliOutputField[], data: unknown): boolean {
  const lines: string[] = [];
  const notes: Array<{ title: string; body: string }> = [];

  for (const field of fields) {
    const value = getValueByKey(data, field.key);
    if (value === undefined || value === null || value === "") continue;

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

function renderTable(title: string, columns: CliOutputColumn[], rows: unknown[]): boolean {
  const normalizedRows = rows.filter(isRecord);
  if (normalizedRows.length === 0) {
    return false;
  }

  const widths = columns.map((column) =>
    Math.max(
      column.label.length,
      ...normalizedRows.map((row) => formatInlineValue(getValueByKey(row, column.key)).length),
    ),
  );

  const renderRow = (values: string[]) =>
    `  ${values.map((value, index) => value.padEnd(widths[index])).join("  ")}`;

  p.log.success(title);
  console.log(renderRow(columns.map((column) => column.label)));
  console.log(`  ${"-".repeat(widths.reduce((sum, width) => sum + width, 0) + (columns.length - 1) * 2)}`);
  for (const row of normalizedRows) {
    console.log(
      renderRow(columns.map((column) => formatInlineValue(getValueByKey(row, column.key)))),
    );
  }

  return true;
}

function renderTxOutput(title: string, data: unknown): boolean {
  if (!isRecord(data)) return false;

  const hash = getValueByKey(data, ["transactionHash", "txHash", "signature"]);
  const inputAmount = getValueByKey(data, ["inputToken.amount", "input_token.amount"]);
  const inputSymbol = getValueByKey(data, ["inputToken.symbol", "input_token.symbol"]);
  const outputAmount = getValueByKey(data, ["outputToken.amount", "output_token.amount"]);
  const outputSymbol = getValueByKey(data, ["outputToken.symbol", "output_token.symbol"]);
  const flow =
    inputAmount && inputSymbol && outputAmount && outputSymbol
      ? `${formatInlineValue(inputAmount)} ${formatInlineValue(inputSymbol)} -> ${formatInlineValue(outputAmount)} ${formatInlineValue(outputSymbol)}`
      : undefined;
  const sourceChain = getValueByKey(data, ["sourceChain", "source_chain"]);
  const destinationChain = getValueByKey(data, ["destinationChain", "destination_chain"]);
  const route =
    sourceChain && destinationChain
      ? `${formatInlineValue(sourceChain)} -> ${formatInlineValue(destinationChain)}`
      : undefined;
  const lines = [
    route ? `Route: ${route}` : undefined,
    flow ? `Flow: ${flow}` : undefined,
    hash ? `Transaction: ${formatInlineValue(hash)}` : undefined,
    getValueByKey(data, "status") ? `Status: ${formatInlineValue(getValueByKey(data, "status"))}` : undefined,
    getValueByKey(data, "priceImpactPct") ? `Price impact: ${formatInlineValue(getValueByKey(data, "priceImpactPct"))}%` : undefined,
    getValueByKey(data, "gasUsed") ? `Gas used: ${formatInlineValue(getValueByKey(data, "gasUsed"))}` : undefined,
    getValueByKey(data, "explorerUrl") ? `Explorer: ${formatInlineValue(getValueByKey(data, "explorerUrl"))}` : undefined,
    getValueByKey(data, "chain") ? `Chain: ${formatInlineValue(getValueByKey(data, "chain"))}` : undefined,
    getValueByKey(data, "from") ? `Signer: ${formatInlineValue(getValueByKey(data, "from"))}` : undefined,
    getValueByKey(data, "message") ? formatInlineValue(getValueByKey(data, "message")) : undefined,
  ].filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return false;
  }

  p.log.success(title);
  p.log.info(lines.join("\n"));
  return true;
}

function renderLinkOutput(title: string, config: CliOutputDefinition, data: unknown): boolean {
  const linkValue = getValueByKey(data, config.linkField ?? ["url", "dashboardUrl"]);
  if (!linkValue) return false;

  p.log.success(title);
  p.log.info(`Link: ${formatInlineValue(linkValue)}`);

  if (config.fields?.length) {
    const extraLines = config.fields
      .map((field) => {
        const value = getValueByKey(data, field.key);
        if (value === undefined || value === null || value === "") return undefined;
        return `${field.label}: ${formatInlineValue(value)}`;
      })
      .filter((line): line is string => Boolean(line));

    if (extraLines.length > 0) {
      p.log.info(extraLines.join("\n"));
    }
  }

  return true;
}

function renderHttpResponse(title: string, data: unknown): boolean {
  if (!isRecord(data)) return false;

  const status = getValueByKey(data, "status");
  const ok = getValueByKey(data, "ok");
  const paymentMade = getValueByKey(data, "payment_made");
  const paymentDetails = getValueByKey(data, "payment_details");
  const route = getValueByKey(data, "route");
  const hint = getValueByKey(data, "hint");

  const headline = status ? `${title}: ${formatInlineValue(status)}` : title;
  if (ok === false) {
    p.log.warn(headline);
  } else {
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
  ].filter((line): line is string => Boolean(line));

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
    } else {
      console.log(JSON.stringify(body, null, 2));
    }
  }

  return true;
}

function renderGenericCliOutput(tool: ToolDefinition, data: unknown): boolean {
  const config = tool.cli_output;
  if (!config) return false;

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

export function displayToolResult(tool: ToolDefinition, data: unknown) {
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
