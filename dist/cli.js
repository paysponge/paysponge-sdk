import { Command, Help, Option } from "commander";
import * as p from "@clack/prompts";
import { SpongeWallet } from "./client.js";
import { setVersionNoticeHandler } from "./api/http.js";
import { SDK_VERSION } from "./version.js";
import { deviceFlowAuth } from "./auth/device-flow.js";
import { deleteCredentials, hasCredentials, getCredentialsPath, loadCredentials, saveCredentials, } from "./auth/credentials.js";
import { registerAgentFirst } from "./registration.js";
import { captureCliCommandEvent, classifyBaseUrl, sanitizeErrorForTelemetry, shutdownCliTelemetry, } from "./telemetry.js";
import { TOOL_DEFINITIONS, } from "./tools/definitions.js";
const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";
const DEFAULT_APP_URL = "https://wallet.paysponge.com";
const WALLET_SKILL_NAME = "sponge-wallet";
const WALLET_SKILL_VERSION = "0.2.2";
const WALLET_SKILL_URL = "https://wallet.paysponge.com/skill.md";
const CLI_SKILL_NAME = "spongewallet-cli";
const CLI_SKILL_VERSION = "0.1.1";
const CLI_SKILL_URL = "https://docs.paysponge.com/cli-skill.md";
// ---------------------------------------------------------------------------
// CLI setup
// ---------------------------------------------------------------------------
export function buildCliProgram(metadata = {}) {
    setVersionNoticeHandler((notice) => {
        const message = notice.message ?? `Sponge SDK status: ${notice.status}`;
        const skill = notice.walletSkillUrl
            ? ` Redownload ${notice.walletSkillUrl}${notice.walletSkillVersion ? ` for skill v${notice.walletSkillVersion}` : ""}.`
            : "";
        console.error(`[spongewallet] ${message}${skill}`);
    });
    const cmdName = metadata.commandName ?? "spongewallet";
    const pkgName = metadata.packageName ?? "@paysponge/sdk";
    const version = metadata.version ?? "0.1.0";
    const program = new Command()
        .name(cmdName)
        .description(`${pkgName} – CLI for managing agent wallets`)
        .version(`${pkgName} v${version}`, "-v, --version");
    program.showSuggestionAfterError();
    program.showHelpAfterError();
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
        .description("Claim a pending agent or authenticate and cache credentials"))
        .option("--continue-claim", "open the cached claim URL for the current agent")
        .option("--switch", "replace cached credentials with a new agent login")
        .action((opts) => handleLogin(opts));
    shared(program.command("logout").description("Remove stored credentials")).action((opts) => handleLogout(opts));
    shared(program
        .command("whoami")
        .description("Show current authentication status")).action((opts) => handleWhoami(opts, metadata));
    shared(program.command("version").description("Show CLI, API header, and skill versions"))
        .option("--json", "print raw JSON")
        .option("--check", "check the Sponge API and npm for newer versions")
        .action((opts) => handleVersion(opts, metadata));
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
    applyHelpTheme(program, metadata);
    return program;
}
export async function runCli(args, metadata = {}) {
    const program = buildCliProgram(metadata);
    const telemetry = attachCliTelemetry(program, args, metadata);
    try {
        await program.parseAsync(args, { from: "user" });
        await telemetry.track("succeeded");
    }
    catch (error) {
        await telemetry.track("failed", error);
        throw error;
    }
    finally {
        await shutdownCliTelemetry();
    }
}
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
async function handleLogin(opts) {
    const creds = loadCredentials(opts.credentialsPath);
    if (opts.switch) {
        deleteCredentials(opts.credentialsPath);
    }
    if (opts.continueClaim) {
        if (!creds?.claimUrl) {
            throw new Error("No pending claim URL found in cached credentials. Run `spongewallet login --switch` to authenticate a different agent.");
        }
        await continueClaimFlow(creds, opts);
        return;
    }
    if (!opts.switch && !process.env.SPONGE_API_KEY && creds?.claimUrl) {
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
        info.push(`API Key:     ${registration.apiKey}`);
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
    p.log.step(skillRefreshPrompt());
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
    if (creds.claimUrl) {
        const cmd = meta.commandName ?? "spongewallet";
        p.log.step(`Run \`${cmd} login --continue-claim\` to reopen this claim flow.`);
        p.log.step(`Run \`${cmd} login --switch\` to replace this cached agent with a different one.`);
    }
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
    p.log.step(skillRefreshPrompt());
}
async function handleVersion(opts, meta) {
    const current = {
        command: meta.commandName ?? "spongewallet",
        packageName: meta.packageName ?? "@paysponge/sdk",
        packageVersion: meta.version ?? "0.1.0",
        apiHeaderVersion: SDK_VERSION,
        walletSkill: {
            name: WALLET_SKILL_NAME,
            version: WALLET_SKILL_VERSION,
            url: WALLET_SKILL_URL,
        },
        cliSkill: {
            name: CLI_SKILL_NAME,
            version: CLI_SKILL_VERSION,
            url: CLI_SKILL_URL,
        },
    };
    const npm = opts.check
        ? {
            sdk: await getNpmLatestVersion("@paysponge/sdk"),
            spongewallet: await getNpmLatestVersion("spongewallet"),
        }
        : undefined;
    const server = opts.check ? await getServerVersionInfo(opts.baseUrl) : undefined;
    const payload = { ...current, server, npm };
    if (opts.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
    }
    p.log.success(`${current.packageName} v${current.packageVersion}`);
    p.log.info([
        `Command:       ${current.command}`,
        `API header:    Sponge-Version ${current.apiHeaderVersion}`,
        `Wallet skill:  ${current.walletSkill.name} v${current.walletSkill.version}`,
        `CLI skill:     ${current.cliSkill.name} v${current.cliSkill.version}`,
        `Wallet URL:    ${current.walletSkill.url}`,
        `CLI URL:       ${current.cliSkill.url}`,
    ].join("\n"));
    if (npm) {
        const lines = Object.entries(npm).map(([name, latest]) => {
            if (!latest)
                return `${name}: unable to check`;
            const local = name === "sdk"
                ? current.apiHeaderVersion
                : name === "spongewallet" && meta.packageName === "spongewallet"
                    ? current.packageVersion
                    : undefined;
            const marker = local && compareSemver(latest, local) > 0 ? " update available" : "";
            return `${name}: ${latest}${marker}`;
        });
        p.note(lines.join("\n"), "Published Versions");
    }
    if (server) {
        p.note([
            `status: ${server.status}`,
            `latest SDK: ${server.latestSdkVersion}`,
            `minimum SDK: ${server.minimumSdkVersion}`,
            `wallet skill: ${server.walletSkillVersion}`,
            `message: ${server.message}`,
        ].join("\n"), "API Version Check");
    }
    p.log.step(skillRefreshPrompt());
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
    p.log.step("To authenticate a different agent, run `spongewallet login --switch`.");
    p.outro("Claim flow ready");
}
function requiredInput(command, opts, positional, optionKey, flagName) {
    const fromOption = opts[optionKey];
    const value = positional
        ?? (typeof fromOption === "string" ? fromOption : undefined);
    if (!value) {
        command.error(`missing required argument or option: ${flagName}`, {
            exitCode: 1,
            code: "sponge.missing_required_input",
        });
    }
    return value;
}
function isTempoChain(chain) {
    return chain === "tempo" || chain === "tempo-testnet";
}
function normalizeTempoTokenSymbol(token, chain) {
    const trimmed = token.trim();
    if (trimmed.startsWith("0x") && trimmed.length === 42) {
        return trimmed;
    }
    const normalized = trimmed.toLowerCase().replace(/[\s_-]/g, "");
    const aliasMap = {
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
function defaultAgentName(email) {
    const local = email?.split("@")[0]?.trim().toLowerCase();
    const slug = local
        ?.replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug ? `agent-${slug}` : "sponge-agent";
}
const ANSI_PATTERN = /\u001B\[[0-9;]*m/g;
const HELP_COLOR_ENABLED = Boolean(!process.env.NO_COLOR
    && (process.stdout.isTTY || process.env.FORCE_COLOR));
function ansi(text, open, close = "\u001B[0m") {
    if (!HELP_COLOR_ENABLED)
        return text;
    return `${open}${text}${close}`;
}
function stripAnsi(text) {
    return text.replace(ANSI_PATTERN, "");
}
function bold(text) {
    return ansi(text, "\u001B[1m");
}
function cyan(text) {
    return ansi(text, "\u001B[36m");
}
function green(text) {
    return ansi(text, "\u001B[32m");
}
function dim(text) {
    return ansi(text, "\u001B[2m");
}
function toTitleCase(value) {
    return value
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
function commandPath(command) {
    const parts = [];
    let current = command;
    while (current) {
        parts.unshift(current.name());
        current = current.parent ?? null;
    }
    return parts;
}
function attachCliTelemetry(program, rawArgs, metadata) {
    const state = {
        actionCommand: null,
        startedAt: 0,
        tracked: false,
    };
    const register = (command) => {
        command.hook("preAction", (_thisCommand, actionCommand) => {
            state.actionCommand = actionCommand;
            if (state.startedAt === 0) {
                state.startedAt = Date.now();
            }
        });
        for (const subcommand of command.commands) {
            register(subcommand);
        }
    };
    register(program);
    return {
        async track(status, error) {
            if (state.tracked || !state.actionCommand) {
                return;
            }
            state.tracked = true;
            const opts = getCommandTelemetryOptions(state.actionCommand);
            const credentialsPath = opts.credentialsPath;
            await captureCliCommandEvent({
                status,
                command_name: state.actionCommand.name(),
                command_path: commandPath(state.actionCommand).slice(1).join(" "),
                command_group: commandPath(state.actionCommand)[1] ?? state.actionCommand.name(),
                duration_ms: Math.max(Date.now() - state.startedAt, 0),
                raw_arg_count: rawArgs.length,
                flags: extractFlagNames(rawArgs),
                auth_source: getCliAuthSource(credentialsPath),
                has_cached_credentials: hasCredentials(credentialsPath),
                has_custom_credentials_path: Boolean(credentialsPath),
                base_url_kind: classifyBaseUrl(opts.baseUrl),
                package_name: metadata.packageName,
                package_version: metadata.version,
                command_name_override: metadata.commandName,
                ...sanitizeErrorForTelemetry(error),
            }, credentialsPath);
        },
    };
}
function getCommandTelemetryOptions(command) {
    const value = typeof command.optsWithGlobals === "function"
        ? command.optsWithGlobals()
        : command.opts();
    return {
        baseUrl: typeof value.baseUrl === "string" ? value.baseUrl : undefined,
        credentialsPath: typeof value.credentialsPath === "string" ? value.credentialsPath : undefined,
    };
}
function getCliAuthSource(credentialsPath) {
    if (process.env.SPONGE_API_KEY) {
        return "env_api_key";
    }
    if (hasCredentials(credentialsPath)) {
        return "cached_credentials";
    }
    return "interactive_or_public";
}
function extractFlagNames(rawArgs) {
    const flags = new Set();
    for (const arg of rawArgs) {
        if (!arg.startsWith("-")) {
            continue;
        }
        flags.add(arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg);
    }
    return [...flags];
}
function buildHelpBanner(command, metadata) {
    const path = commandPath(command);
    const rootName = metadata.commandName ?? "spongewallet";
    const title = path.length === 1
        ? "Sponge Wallet CLI"
        : `Sponge Wallet ${path.slice(1).map(toTitleCase).join(" ")}`;
    const subtitle = path.length === 1
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
function applyHelpTheme(command, metadata) {
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
    "polygon",
    "sepolia",
    "base-sepolia",
    "polygon-amoy",
    "tempo-testnet",
    "tempo",
    "solana",
    "solana-devnet",
];
const EVM_CHAIN_VALUES = ["ethereum", "base", "polygon", "sepolia", "base-sepolia", "polygon-amoy"];
const SOLANA_CHAIN_VALUES = ["solana", "solana-devnet"];
const TEMPO_CHAIN_VALUES = ["tempo", "tempo-testnet"];
const ONRAMP_CHAIN_VALUES = ["base", "solana", "polygon"];
const PAY_CHAIN_VALUES = ["base", "solana", "tempo", "ethereum"];
const PREFERRED_X402_CHAINS = ["base", "solana", "ethereum"];
function registerCuratedCommands(program, shared) {
    shared(program.command("balance").description("Show wallet balances"))
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
    shared(program.command("send").description("Send assets on EVM, Solana, or Tempo"))
        .usage("[chain] [to] [asset] [amount] [options]")
        .argument("[chain]", "destination chain")
        .argument("[to]", "recipient address")
        .argument("[asset]", "currency symbol or token symbol/address")
        .argument("[amount]", "amount to send")
        .option("--chain <chain>", "destination chain")
        .option("--to <address>", "recipient address")
        .option("--amount <amount>", "amount to send")
        .option("--asset <asset>", "currency symbol or token symbol/address")
        .addHelpText("after", "\nExamples:\n  spongewallet send base 0xabc... USDC 10\n  spongewallet send tempo 0xabc... usdce 1\n")
        .action(async (chainArg, toArg, assetArg, amountArg, opts, command) => {
        const chain = requiredInput(command, opts, chainArg, "chain", "--chain");
        const asset = isTempoChain(chain)
            ? normalizeTempoTokenSymbol(requiredInput(command, opts, assetArg, "asset", "--asset"), chain)
            : requiredInput(command, opts, assetArg, "asset", "--asset");
        const input = chain === "tempo" || chain === "tempo-testnet"
            ? {
                chain,
                to: requiredInput(command, opts, toArg, "to", "--to"),
                amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
                token: asset,
            }
            : {
                chain,
                to: requiredInput(command, opts, toArg, "to", "--to"),
                amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
                currency: asset,
            };
        const wallet = await connectWallet(opts);
        const data = await wallet.transfer(input);
        displayToolResult(getToolDefinition(chain.startsWith("solana") ? "solana_transfer" : "evm_transfer"), data);
    });
    shared(program.command("history").description("Show recent transaction history"))
        .usage("[limit] [options]")
        .argument("[limit]", "maximum number of transactions")
        .option("--limit <n>", "maximum number of transactions", parseInt)
        .addOption(new Option("--chain <chain>", "filter by chain").choices(CHAIN_VALUES))
        .addHelpText("after", "\nExamples:\n  spongewallet history\n  spongewallet history 20 --chain base\n")
        .action(async (limitArg, opts) => {
        const wallet = await connectWallet(opts);
        const limit = limitArg !== undefined
            ? parseInt(limitArg, 10)
            : opts.limit;
        const data = await wallet.getTransactionHistoryDetailed({
            limit: Number.isFinite(limit) ? limit : undefined,
            chain: opts.chain,
        });
        displayToolResult(getToolDefinition("get_transaction_history"), data);
    });
    shared(program.command("tokens").description("List Solana wallet tokens"))
        .usage("[chain] [options]")
        .argument("[chain]", "Solana network")
        .option("--chain <chain>", "Solana network")
        .addHelpText("after", "\nExamples:\n  spongewallet tokens\n  spongewallet tokens solana-devnet\n")
        .action(async (chainArg, opts) => {
        const wallet = await connectWallet(opts);
        const chain = (chainArg ?? opts.chain ?? "solana");
        const data = await wallet.getSolanaTokens(chain);
        displayToolResult(getToolDefinition("get_solana_tokens"), data);
    });
    shared(program.command("search-tokens").description("Search the Solana token list"))
        .usage("[query] [limit] [options]")
        .argument("[query]", "token symbol or name")
        .argument("[limit]", "maximum results")
        .option("--query <query>", "token symbol or name")
        .option("--limit <n>", "maximum results", parseInt)
        .addHelpText("after", "\nExamples:\n  spongewallet search-tokens BONK\n  spongewallet search-tokens BONK 5\n")
        .action(async (queryArg, limitArg, opts, command) => {
        const limit = limitArg !== undefined
            ? parseInt(limitArg, 10)
            : opts.limit;
        const query = requiredInput(command, opts, queryArg, "query", "--query");
        const wallet = await connectWallet(opts);
        const data = await wallet.searchSolanaTokens(query, Number.isFinite(limit) ? limit : undefined);
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
        .action(async (chainArg, fiatAmountArg, opts) => {
        const wallet = await connectWallet(opts);
        const chain = String(chainArg ?? opts.chain ?? "base");
        const walletAddress = opts.walletAddress
            ?? (await wallet.getAddress(chain))
            ?? "";
        const data = await wallet.onrampCrypto({
            wallet_address: walletAddress,
            chain: chain,
            provider: opts.provider,
            fiat_amount: (fiatAmountArg ?? opts.fiatAmount),
            fiat_currency: opts.fiatCurrency,
            lock_wallet_address: Boolean(opts.lockWalletAddress),
            redirect_url: opts.redirectUrl,
        });
        displayToolResult(getToolDefinition("create_crypto_onramp"), data);
    });
    const txCmd = program.command("tx").description("Transaction status and signing");
    shared(txCmd.command("status").description("Check transaction status"))
        .usage("[chain] [txHash] [options]")
        .argument("[chain]", "transaction chain")
        .argument("[txHash]", "transaction hash or signature")
        .option("--tx-hash <hash>", "transaction hash or signature")
        .option("--chain <chain>", "transaction chain")
        .addHelpText("after", "\nExamples:\n  spongewallet tx status base 0x123...\n  spongewallet tx status solana 5K2...\n")
        .action(async (chainArg, txHashArg, opts, command) => {
        const txHash = requiredInput(command, opts, txHashArg, "txHash", "--tx-hash");
        const chain = requiredInput(command, opts, chainArg, "chain", "--chain");
        const wallet = await connectWallet(opts);
        const data = await wallet.getTransactionStatus(txHash, chain);
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
        .action(async (fromArg, toArg, amountArg, opts, command) => {
        const from = requiredInput(command, opts, fromArg, "from", "--from");
        const to = requiredInput(command, opts, toArg, "to", "--to");
        const amount = requiredInput(command, opts, amountArg, "amount", "--amount");
        const wallet = await connectWallet(opts);
        const data = await wallet.swap({
            chain: opts.chain,
            from,
            to,
            amount,
            slippageBps: opts.slippageBps,
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
        .action(async (fromArg, toArg, amountArg, opts, command) => {
        await executeToolCommand(opts, "jupiter_swap_quote", {
            chain: opts.chain,
            input_token: requiredInput(command, opts, fromArg, "from", "--from"),
            output_token: requiredInput(command, opts, toArg, "to", "--to"),
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
            slippage_bps: opts.slippageBps,
        });
    });
    shared(swapCmd.command("execute").description("Execute a previously quoted Jupiter swap"))
        .usage("[quoteId] [options]")
        .argument("[quoteId]", "quote ID to execute")
        .option("--quote-id <id>", "quote ID to execute")
        .addHelpText("after", "\nExamples:\n  spongewallet swap execute quote_123\n")
        .action(async (quoteIdArg, opts, command) => {
        await executeToolCommand(opts, "jupiter_swap_execute", {
            quote_id: requiredInput(command, opts, quoteIdArg, "quoteId", "--quote-id"),
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
        .action(async (fromArg, toArg, amountArg, opts, command) => {
        await executeToolCommand(opts, "base_swap", {
            input_token: requiredInput(command, opts, fromArg, "from", "--from"),
            output_token: requiredInput(command, opts, toArg, "to", "--to"),
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
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
        .action(async (fromArg, toArg, amountArg, opts, command) => {
        const chain = String(opts.chain ?? "tempo");
        await executeToolCommand(opts, "tempo_swap", {
            chain,
            input_token: normalizeTempoTokenSymbol(requiredInput(command, opts, fromArg, "from", "--from"), chain),
            output_token: normalizeTempoTokenSymbol(requiredInput(command, opts, toArg, "to", "--to"), chain),
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
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
        .action(async (sourceChainArg, destinationChainArg, tokenArg, amountArg, opts, command) => {
        await executeToolCommand(opts, "bridge", {
            source_chain: requiredInput(command, opts, sourceChainArg, "sourceChain", "--source-chain"),
            destination_chain: requiredInput(command, opts, destinationChainArg, "destinationChain", "--destination-chain"),
            token: requiredInput(command, opts, tokenArg, "token", "--token"),
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
            destination_token: opts.destinationToken,
            recipient_address: opts.recipientAddress,
        });
    });
    const payCmd = program.command("pay").description("Paid API and payment helpers");
    shared(payCmd.command("discover").description("Discover paid API services"))
        .usage("[query] [options]")
        .argument("[query]", "service search query")
        .option("--query <query>", "service search query")
        .option("--category <category>", "service category filter")
        .option("--type <type>", "service type filter")
        .option("--limit <n>", "maximum results", parseInt)
        .option("--offset <n>", "result offset", parseInt)
        .addHelpText("after", "\nExamples:\n  spongewallet pay discover \"web search\"\n  spongewallet pay discover --category search --limit 5\n")
        .action(async (queryArg, opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.discoverServices({
            query: queryArg ?? opts.query,
            category: opts.category,
            type: opts.type,
            limit: opts.limit,
            offset: opts.offset,
        });
        displayToolResult(getToolDefinition("discover_services"), data);
    });
    shared(payCmd.command("service").description("Get paid API service endpoint details"))
        .usage("[serviceId] [options]")
        .argument("[serviceId]", "service ID returned by discover")
        .option("--service-id <id>", "service ID returned by discover")
        .addHelpText("after", "\nExamples:\n  spongewallet pay service ctg_123\n")
        .action(async (serviceIdArg, opts, command) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.getService(requiredInput(command, opts, serviceIdArg, "serviceId", "--service-id"));
        displayToolResult(getToolDefinition("get_service"), data);
    });
    shared(payCmd.command("fetch").description("Fetch with automatic paid API handling"))
        .requiredOption("--url <url>", "target URL")
        .addOption(new Option("--chain <chain>", "preferred spend chain").choices(PAY_CHAIN_VALUES))
        .addOption(new Option("--protocol <protocol>", "explicit protocol override").choices(["x402", "mpp"]))
        .addOption(new Option("--method <method>", "HTTP method").choices(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"))
        .option("--headers <json>", "headers as JSON", parseJsonObject)
        .option("--body <json>", "request body as JSON", parseJsonValue)
        .action(async (opts) => {
        const wallet = await connectWallet(opts);
        const data = await wallet.paidFetch({
            url: String(opts.url),
            chain: opts.chain,
            protocol: opts.protocol,
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
        .usage("[service] [options]")
        .argument("[service]", "service name")
        .option("--service <service>", "service name")
        .addHelpText("after", "\nExamples:\n  spongewallet keys get openai\n")
        .action(async (serviceArg, opts, command) => {
        await executeToolCommand(opts, "get_key_value", {
            service: requiredInput(command, opts, serviceArg, "service", "--service"),
        });
    });
    shared(keysCmd.command("set").description("Store a service key"))
        .usage("[service] [key] [options]")
        .argument("[service]", "service name")
        .argument("[key]", "key or secret to store")
        .option("--service <service>", "service name")
        .option("--key <secret>", "key or secret to store")
        .option("--label <label>", "friendly label")
        .option("--metadata <json>", "metadata as JSON", parseJsonObject)
        .addHelpText("after", "\nExamples:\n  spongewallet keys set openai sk-... --label primary\n")
        .action(async (serviceArg, keyArg, opts, command) => {
        await executeToolCommand(opts, "store_key", {
            service: requiredInput(command, opts, serviceArg, "service", "--service"),
            key: requiredInput(command, opts, keyArg, "key", "--key"),
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
    shared(cardCmd.command("add").description("Open the dashboard flow for adding a user-owned card"))
        .option("--app-url <url>", "custom wallet app URL", DEFAULT_APP_URL)
        .option("--agent-id <id>", "agent ID to preselect in the dashboard")
        .addOption(new Option("--flow <flow>", "card setup flow to open").choices(["choose", "basis-theory", "link"]).default("choose"))
        .option("--no-browser", "print the URL without opening a browser")
        .action(async (opts) => {
        await handleCardAdd(opts);
    });
    shared(cardCmd.command("virtual").description("Issue a per-transaction virtual card"))
        .requiredOption("--amount <amount>", "transaction amount")
        .option("--currency <code>", "ISO currency code")
        .requiredOption("--merchant-name <name>", "merchant name")
        .requiredOption("--merchant-url <url>", "merchant URL")
        .option("--merchant-country-code <code>", "merchant country code")
        .option("--description <text>", "purchase description")
        .option("--products <json>", "products array as JSON", parseJsonValue)
        .option("--shipping-address <json>", "shipping address as JSON", parseJsonObject)
        .option("--enrollment-id <id>", "specific enrollment ID")
        .action(async (opts) => {
        await executeToolCommand(opts, "issue_virtual_card", {
            amount: opts.amount,
            currency: opts.currency,
            merchant_name: opts.merchantName,
            merchant_url: opts.merchantUrl,
            merchant_country_code: opts.merchantCountryCode,
            description: opts.description,
            products: opts.products,
            shipping_address: opts.shippingAddress,
            enrollment_id: opts.enrollmentId,
        });
    });
    shared(cardCmd.command("get").description("Fetch the user's card (Sponge Card or vaulted card)"))
        .option("--card-type <type>", "explicit card source: 'rain' or 'basis_theory_vaulted'")
        .option("--payment-method-id <id>", "specific Basis Theory payment method ID")
        .option("--amount <amount>", "transaction amount for spending-limit checks (BT path only)")
        .option("--currency <code>", "ISO currency code (BT path only)")
        .option("--merchant-name <name>", "merchant name (BT path only)")
        .option("--merchant-url <url>", "merchant URL (BT path only)")
        .action(async (opts) => {
        await executeToolCommand(opts, "get_card", {
            card_type: opts.cardType,
            payment_method_id: opts.paymentMethodId,
            amount: opts.amount,
            currency: opts.currency,
            merchant_name: opts.merchantName,
            merchant_url: opts.merchantUrl,
        });
    });
    shared(cardCmd.command("vaulted").description("Fetch a Basis Theory vaulted card session"))
        .option("--payment-method-id <id>", "specific Basis Theory payment method ID")
        .option("--amount <amount>", "transaction amount for spending-limit checks")
        .option("--currency <code>", "ISO currency code")
        .option("--merchant-name <name>", "merchant name")
        .option("--merchant-url <url>", "merchant URL")
        .action(async (opts) => {
        await executeToolCommand(opts, "get_card", {
            card_type: "basis_theory_vaulted",
            payment_method_id: opts.paymentMethodId,
            amount: opts.amount,
            currency: opts.currency,
            merchant_name: opts.merchantName,
            merchant_url: opts.merchantUrl,
        });
    });
    shared(cardCmd.command("usage").description("Report the outcome of a card purchase attempt"))
        .requiredOption("--payment-method-id <id>", "payment method ID used for the purchase")
        .addOption(new Option("--status <status>", "purchase outcome").choices(["success", "failed", "cancelled"]).makeOptionMandatory())
        .option("--merchant-name <name>", "merchant name")
        .option("--merchant-domain <domain>", "merchant domain")
        .option("--amount <amount>", "amount charged or attempted")
        .option("--currency <code>", "currency code")
        .option("--failure-reason <reason>", "failure reason when status is failed")
        .action(async (opts) => {
        await executeToolCommand(opts, "report_card_usage", {
            payment_method_id: opts.paymentMethodId,
            merchant_name: opts.merchantName,
            merchant_domain: opts.merchantDomain,
            amount: opts.amount,
            currency: opts.currency,
            status: opts.status,
            failure_reason: opts.failureReason,
        });
    });
    const linkCmd = cardCmd.command("link").description("Link payment method workflows");
    shared(linkCmd.command("start").description("Start Link login for payment-method connection"))
        .option("--client-name <name>", "optional Link connection label")
        .action(async (opts) => {
        await executeToolCommand(opts, "add_link_payment_method", {
            client_name: opts.clientName,
        });
    });
    shared(linkCmd.command("save").description("Save a Link payment method after Link login"))
        .option("--link-payment-method-id <id>", "Link payment method ID; required if multiple methods are available")
        .option("--set-as-default", "make this the default Link payment method")
        .option("--no-set-as-default", "do not make this the default Link payment method")
        .option("--client-name <name>", "optional Link connection label")
        .requiredOption("--email <email>", "contact email")
        .requiredOption("--phone <phone>", "contact phone")
        .requiredOption("--shipping <json>", "shipping address JSON with name, line1, city, state, postalCode, country", parseJsonObject)
        .option("--billing <json>", "optional billing address JSON", parseJsonObject)
        .action(async (opts) => {
        await executeToolCommand(opts, "add_link_payment_method", {
            link_payment_method_id: opts.linkPaymentMethodId,
            set_as_default: opts.setAsDefault,
            client_name: opts.clientName,
            email: opts.email,
            phone: opts.phone,
            shipping: opts.shipping,
            billing: opts.billing,
        });
    });
    shared(linkCmd.command("credential").description("Generate one-time card credentials from a saved Link payment method"))
        .option("--link-payment-method-id <id>", "saved Link payment method ID")
        .option("--spend-request-id <id>", "existing spend request ID returned by approval_required")
        .option("--amount <amount>", "purchase amount")
        .option("--currency <code>", "ISO currency code")
        .option("--merchant-name <name>", "merchant name")
        .option("--merchant-url <url>", "merchant URL")
        .option("--context <text>", "optional context shown during Link approval")
        .action(async (opts) => {
        await executeToolCommand(opts, "create_link_payment_credential", {
            link_payment_method_id: opts.linkPaymentMethodId,
            spend_request_id: opts.spendRequestId,
            amount: opts.amount,
            currency: opts.currency,
            merchant_name: opts.merchantName,
            merchant_url: opts.merchantUrl,
            context: opts.context,
        });
    });
    shared(cardCmd.command("status").description("Show Sponge Card onboarding, card, and balance status"))
        .option("--refresh", "force-refresh issuer status before returning")
        .option("--no-refresh", "use cached issuer status when available")
        .action(async (opts) => {
        await executeToolCommand(opts, "get_sponge_card_status", {
            refresh: opts.refresh,
        });
    });
    shared(cardCmd.command("onboard").description("Start Sponge Card onboarding or internal Persona KYC"))
        .option("--occupation <occupation>", "occupation or SOC code")
        .option("--redirect-uri <url>", "Persona redirect URL after KYC completion")
        .option("--accept-all", "set all required Sponge Card consent acknowledgements to true")
        .option("--e-sign-consent", "accept E-Sign Consent")
        .option("--account-opening-privacy-notice", "accept Account Opening Privacy Notice; required for US KYC")
        .option("--sponge-card-terms", "accept Sponge Card terms and issuer privacy policy")
        .option("--information-certification", "certify KYC information is accurate")
        .option("--unauthorized-solicitation-acknowledgement", "acknowledge application is not unauthorized solicitation")
        .action(async (opts) => {
        await executeToolCommand(opts, "onboard_sponge_card", {
            occupation: opts.occupation,
            redirect_uri: opts.redirectUri,
            ...spongeCardConsentInput(opts),
        });
    });
    shared(cardCmd.command("terms").description("Accept Sponge Card terms for an existing application"))
        .option("--accept-all", "set all required Sponge Card consent acknowledgements to true")
        .option("--e-sign-consent", "accept E-Sign Consent")
        .option("--account-opening-privacy-notice", "accept Account Opening Privacy Notice; required for US KYC")
        .option("--sponge-card-terms", "accept Sponge Card terms and issuer privacy policy")
        .option("--information-certification", "certify KYC information is accurate")
        .option("--unauthorized-solicitation-acknowledgement", "acknowledge application is not unauthorized solicitation")
        .action(async (opts) => {
        await executeToolCommand(opts, "accept_sponge_card_terms", spongeCardConsentInput(opts));
    });
    shared(cardCmd.command("create").description("Create a Sponge Card after approval and consent"))
        .requiredOption("--billing-address <json>", "billing address JSON with line1, city, region, postal_code, country_code")
        .requiredOption("--email <email>", "contact email")
        .requiredOption("--phone <phone>", "contact phone")
        .option("--shipping-address <json>", "optional shipping address JSON", parseJsonObject)
        .action(async (opts) => {
        await executeToolCommand(opts, "create_sponge_card", {
            billing: parseJsonObject(String(opts.billingAddress)),
            email: opts.email,
            phone: opts.phone,
            shipping: opts.shippingAddress,
        });
    });
    shared(cardCmd.command("details").description("Fetch encrypted Sponge Card PAN/CVC and spending power"))
        .action(async (opts) => {
        await executeToolCommand(opts, "get_sponge_card_details", {});
    });
    shared(cardCmd.command("fund").description("Top up Sponge Card collateral with USDC from the wallet"))
        .usage("[amount] [options]")
        .argument("[amount]", "USDC amount")
        .option("--amount <amount>", "USDC amount")
        .addOption(new Option("--chain <chain>", "collateral chain").choices(CHAIN_VALUES))
        .action(async (amountArg, opts, command) => {
        await executeToolCommand(opts, "fund_sponge_card", {
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
            chain: opts.chain,
        });
    });
    shared(cardCmd.command("withdraw").description("Withdraw Sponge Card collateral back to the wallet"))
        .usage("[amount] [options]")
        .argument("[amount]", "USDC amount")
        .option("--amount <amount>", "USDC amount")
        .addOption(new Option("--chain <chain>", "collateral chain").choices(CHAIN_VALUES))
        .action(async (amountArg, opts, command) => {
        await executeToolCommand(opts, "withdraw_sponge_card", {
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
            chain: opts.chain,
        });
    });
    const bankCmd = program.command("bank").description("Bank accounts and USD transfers");
    shared(bankCmd.command("onboard").description("Start or resume banking KYC onboarding"))
        .option("--wallet-id <id>", "wallet ID to associate with onboarding")
        .option("--redirect-uri <url>", "redirect URL after KYC completion")
        .addOption(new Option("--customer-type <type>", "KYC customer type").choices(["individual", "business"]))
        .option("--signed-agreement-id <id>", "Bridge signed agreement ID from the terms redirect")
        .action(async (opts) => {
        await executeToolCommand(opts, "bank_onboard", {
            wallet_id: opts.walletId,
            redirect_uri: opts.redirectUri,
            customer_type: opts.customerType,
            signed_agreement_id: opts.signedAgreementId,
        });
    });
    shared(bankCmd.command("status").description("Show banking KYC and capability status"))
        .action(async (opts) => {
        await executeToolCommand(opts, "bank_status", {});
    });
    const bankVirtualCmd = bankCmd.command("virtual-account").description("Virtual bank accounts for USD deposits");
    shared(bankVirtualCmd.command("create").description("Create or retrieve a virtual bank account for a wallet"))
        .usage("[walletId] [options]")
        .argument("[walletId]", "wallet ID")
        .option("--wallet-id <id>", "wallet ID")
        .action(async (walletIdArg, opts, command) => {
        await executeToolCommand(opts, "bank_create_virtual_account", {
            wallet_id: requiredInput(command, opts, walletIdArg, "walletId", "--wallet-id"),
        });
    });
    shared(bankVirtualCmd.command("get").description("Get virtual bank account deposit instructions"))
        .usage("[walletId] [options]")
        .argument("[walletId]", "wallet ID; omit to list all")
        .option("--wallet-id <id>", "wallet ID")
        .action(async (walletIdArg, opts) => {
        await executeToolCommand(opts, "bank_get_virtual_account", {
            wallet_id: walletIdArg ?? opts.walletId,
        });
    });
    const bankExternalCmd = bankCmd.command("external-accounts").description("Linked external bank accounts");
    shared(bankExternalCmd.command("list").description("List linked external bank accounts"))
        .action(async (opts) => {
        await executeToolCommand(opts, "bank_list_external_accounts", {});
    });
    shared(bankExternalCmd.command("add").description("Link an external US bank account"))
        .requiredOption("--bank-name <name>", "bank name")
        .requiredOption("--account-owner-name <name>", "account holder full name")
        .requiredOption("--routing-number <number>", "9-digit ABA routing number")
        .requiredOption("--account-number <number>", "bank account number")
        .addOption(new Option("--checking-or-savings <type>", "account type").choices(["checking", "savings"]).makeOptionMandatory())
        .requiredOption("--street-line-1 <line>", "account holder street address line 1")
        .option("--street-line-2 <line>", "account holder street address line 2")
        .requiredOption("--city <city>", "account holder city")
        .requiredOption("--state <state>", "account holder US state")
        .requiredOption("--postal-code <code>", "account holder ZIP code")
        .action(async (opts) => {
        await executeToolCommand(opts, "bank_add_external_account", {
            bank_name: opts.bankName,
            account_owner_name: opts.accountOwnerName,
            routing_number: opts.routingNumber,
            account_number: opts.accountNumber,
            checking_or_savings: opts.checkingOrSavings,
            street_line_1: opts.streetLine1,
            street_line_2: opts.streetLine2,
            city: opts.city,
            state: opts.state,
            postal_code: opts.postalCode,
        });
    });
    shared(bankCmd.command("send").description("Send USD to a linked bank account"))
        .usage("[walletId] [externalAccountId] [amount] [options]")
        .argument("[walletId]", "wallet ID to send USDC from")
        .argument("[externalAccountId]", "external bank account ID")
        .argument("[amount]", "USD amount")
        .option("--wallet-id <id>", "wallet ID to send USDC from")
        .option("--external-account-id <id>", "external bank account ID")
        .option("--amount <amount>", "USD amount")
        .addOption(new Option("--payment-rail <rail>", "payout rail").choices(["ach", "wire"]))
        .action(async (walletIdArg, externalAccountIdArg, amountArg, opts, command) => {
        await executeToolCommand(opts, "bank_send", {
            wallet_id: requiredInput(command, opts, walletIdArg, "walletId", "--wallet-id"),
            external_account_id: requiredInput(command, opts, externalAccountIdArg, "externalAccountId", "--external-account-id"),
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
            payment_rail: opts.paymentRail,
        });
    });
    shared(bankCmd.command("transfers").description("List bank transfer history"))
        .usage("[transferId] [options]")
        .argument("[transferId]", "transfer ID")
        .option("--transfer-id <id>", "transfer ID")
        .action(async (transferIdArg, opts) => {
        await executeToolCommand(opts, "bank_list_transfers", {
            transfer_id: transferIdArg ?? opts.transferId,
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
        .usage("[planId] [options]")
        .argument("[planId]", "plan ID")
        .option("--plan-id <id>", "plan ID")
        .addHelpText("after", "\nExamples:\n  spongewallet plan approve plan_123\n")
        .action(async (planIdArg, opts, command) => {
        const planId = requiredInput(command, opts, planIdArg, "planId", "--plan-id");
        const wallet = await connectWallet(opts);
        const data = await wallet.approvePlan(planId);
        displayToolResult(getToolDefinition("approve_plan"), data);
    });
    const tradeCmd = program.command("trade").description("Single trade proposal flow");
    shared(tradeCmd.command("propose").description("Propose a trade for approval"))
        .usage("[from] [to] [amount] --reason <text> [options]")
        .argument("[from]", "input token")
        .argument("[to]", "output token")
        .argument("[amount]", "amount to trade")
        .option("--from <token>", "input token")
        .option("--to <token>", "output token")
        .option("--amount <amount>", "amount to trade")
        .requiredOption("--reason <text>", "reason shown to the user")
        .addHelpText("after", "\nExamples:\n  spongewallet trade propose ETH USDC 0.5 --reason \"Reduce exposure\"\n")
        .action(async (fromArg, toArg, amountArg, opts, command) => {
        const inputToken = requiredInput(command, opts, fromArg, "from", "--from");
        const outputToken = requiredInput(command, opts, toArg, "to", "--to");
        const amount = requiredInput(command, opts, amountArg, "amount", "--amount");
        const wallet = await connectWallet(opts);
        const data = await wallet.proposeTrade({
            input_token: inputToken,
            output_token: outputToken,
            amount,
            reason: String(opts.reason),
        });
        displayToolResult(getToolDefinition("propose_trade"), data);
    });
    const authCmd = program.command("auth").description("Authentication helpers");
    shared(authCmd.command("siwe").description("Generate a SIWE signature"))
        .usage("[domain] [uri] [options]")
        .argument("[domain]", "requesting domain")
        .argument("[uri]", "resource URI")
        .option("--domain <domain>", "requesting domain")
        .option("--uri <uri>", "resource URI")
        .option("--statement <text>", "human-readable statement")
        .option("--chain-id <id>", "chain ID", parseInt)
        .option("--expiration-time <iso>", "expiration time")
        .option("--not-before <iso>", "not before time")
        .option("--resources <json>", "resources array as JSON", parseJsonValue)
        .addHelpText("after", "\nExamples:\n  spongewallet auth siwe app.example.com https://app.example.com\n")
        .action(async (domainArg, uriArg, opts, command) => {
        await executeToolCommand(opts, "generate_siwe", {
            domain: requiredInput(command, opts, domainArg, "domain", "--domain"),
            uri: requiredInput(command, opts, uriArg, "uri", "--uri"),
            statement: opts.statement,
            chain_id: opts.chainId,
            expiration_time: opts.expirationTime,
            not_before: opts.notBefore,
            resources: opts.resources,
        });
    });
    const marketCmd = program.command("market").description("Trading venue integrations");
    const polymarketCmd = marketCmd.command("polymarket").description("Trade or inspect Polymarket");
    shared(polymarketCmd.command("status").description("Show Polymarket account status"))
        .action(async (opts) => {
        await executePolymarketAction(opts, { action: "status" });
    });
    shared(polymarketCmd.command("enable").description("Provision or link Polymarket trading"))
        .action(async (opts) => {
        await executePolymarketAction(opts, { action: "enable" });
    });
    shared(polymarketCmd.command("search").description("Search Polymarket markets"))
        .usage("[query] [limit] [options]")
        .argument("[query]", "market search query")
        .argument("[limit]", "result limit")
        .option("--query <query>", "market search query")
        .option("--limit <n>", "result limit", parseInt)
        .addHelpText("after", "\nExamples:\n  spongewallet market polymarket search \"Sixers Celtics\"\n  spongewallet market polymarket search \"NBA\" 20\n")
        .action(async (queryArg, limitArg, opts, command) => {
        await executePolymarketAction(opts, {
            action: "search_markets",
            query: requiredInput(command, opts, queryArg, "query", "--query"),
            limit: limitArg !== undefined ? parseInt(limitArg, 10) : opts.limit,
        });
    });
    shared(polymarketCmd.command("get").description("Get Polymarket market metadata"))
        .usage("[marketSlug] [options]")
        .argument("[marketSlug]", "market or event slug")
        .option("--market-slug <slug>", "market or event slug")
        .option("--token-id <id>", "CLOB token ID")
        .addHelpText("after", "\nExamples:\n  spongewallet market polymarket get nba-phi-bos-2026-05-02\n")
        .action(async (marketSlugArg, opts, command) => {
        if (!marketSlugArg && !opts.marketSlug && !opts.tokenId) {
            requiredInput(command, opts, marketSlugArg, "marketSlug", "--market-slug");
        }
        await executePolymarketAction(opts, {
            action: "get_market",
            market_slug: marketSlugArg ?? opts.marketSlug,
            token_id: opts.tokenId,
        });
    });
    shared(polymarketCmd.command("price").description("Get Polymarket market price"))
        .usage("[marketSlug] [options]")
        .argument("[marketSlug]", "market or event slug")
        .option("--market-slug <slug>", "market or event slug")
        .option("--token-id <id>", "CLOB token ID")
        .addHelpText("after", "\nExamples:\n  spongewallet market polymarket price nba-phi-bos-2026-05-02\n")
        .action(async (marketSlugArg, opts, command) => {
        if (!marketSlugArg && !opts.marketSlug && !opts.tokenId) {
            requiredInput(command, opts, marketSlugArg, "marketSlug", "--market-slug");
        }
        await executePolymarketAction(opts, {
            action: "get_market_price",
            market_slug: marketSlugArg ?? opts.marketSlug,
            token_id: opts.tokenId,
        });
    });
    shared(polymarketCmd.command("positions").description("List Polymarket positions"))
        .action(async (opts) => {
        await executePolymarketAction(opts, { action: "positions" });
    });
    shared(polymarketCmd.command("orders").description("List open Polymarket orders"))
        .action(async (opts) => {
        await executePolymarketAction(opts, { action: "orders" });
    });
    shared(polymarketCmd.command("balance").description("Show Polymarket balance and allowance"))
        .action(async (opts) => {
        await executePolymarketAction(opts, { action: "balance_allowance" });
    });
    shared(polymarketCmd.command("refresh-balance").description("Refresh Polymarket balance and allowance"))
        .action(async (opts) => {
        await executePolymarketAction(opts, { action: "refresh_balance_allowance" });
    });
    shared(polymarketCmd.command("order").description("Place a Polymarket order"))
        .usage("[marketSlug] [outcome] [side] [size] [options]")
        .argument("[marketSlug]", "market or event slug")
        .argument("[outcome]", "yes or no")
        .argument("[side]", "buy or sell")
        .argument("[size]", "order size in shares")
        .option("--market-slug <slug>", "market or event slug")
        .option("--token-id <id>", "CLOB token ID")
        .addOption(new Option("--outcome <outcome>", "outcome").choices(["yes", "no"]))
        .addOption(new Option("--side <side>", "order side").choices(["buy", "sell"]))
        .option("--size <shares>", "order size in shares")
        .addOption(new Option("--type <type>", "execution type").choices(["limit", "market"]).default("limit"))
        .option("--price <price>", "limit price from 0 to 1", parseFloat)
        .addOption(new Option("--order-type <type>", "CLOB order type").choices(["GTC", "GTD", "FOK", "FAK"]))
        .addHelpText("after", "\nExamples:\n  spongewallet market polymarket order nba-phi-bos-2026-05-02 yes buy 3 --price 0.40\n  spongewallet market polymarket order --token-id 123 --outcome yes --side buy --size 3 --type market\n")
        .action(async (marketSlugArg, outcomeArg, sideArg, sizeArg, opts, command) => {
        if (!marketSlugArg && !opts.marketSlug && !opts.tokenId) {
            requiredInput(command, opts, marketSlugArg, "marketSlug", "--market-slug");
        }
        await executePolymarketAction(opts, {
            action: "order",
            market_slug: marketSlugArg ?? opts.marketSlug,
            token_id: opts.tokenId,
            outcome: requiredInput(command, opts, outcomeArg, "outcome", "--outcome"),
            side: requiredInput(command, opts, sideArg, "side", "--side"),
            size: Number(requiredInput(command, opts, sizeArg, "size", "--size")),
            type: opts.type,
            price: opts.price,
            order_type: opts.orderType,
        });
    });
    shared(polymarketCmd.command("get-order").description("Get a Polymarket order"))
        .argument("[orderId]", "order ID")
        .option("--order-id <id>", "order ID")
        .action(async (orderIdArg, opts, command) => {
        await executePolymarketAction(opts, {
            action: "get_order",
            order_id: requiredInput(command, opts, orderIdArg, "orderId", "--order-id"),
        });
    });
    shared(polymarketCmd.command("cancel").description("Cancel a Polymarket order"))
        .argument("[orderId]", "order ID")
        .option("--order-id <id>", "order ID")
        .action(async (orderIdArg, opts, command) => {
        await executePolymarketAction(opts, {
            action: "cancel",
            order_id: requiredInput(command, opts, orderIdArg, "orderId", "--order-id"),
        });
    });
    shared(polymarketCmd.command("set-allowances").description("Approve Polymarket contracts for trading"))
        .action(async (opts) => {
        await executePolymarketAction(opts, { action: "set_allowances" });
    });
    shared(polymarketCmd.command("deposit").description("Make Safe-held USDC.e available for trading"))
        .action(async (opts) => {
        await executePolymarketAction(opts, { action: "deposit" });
    });
    shared(polymarketCmd.command("deposit-from-wallet").description("Move Polygon wallet USDC.e into Polymarket Safe"))
        .argument("[amount]", "USDC.e amount")
        .option("--amount <amount>", "USDC.e amount")
        .action(async (amountArg, opts, command) => {
        await executePolymarketAction(opts, {
            action: "deposit_from_wallet",
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
        });
    });
    shared(polymarketCmd.command("withdraw").description("Withdraw USDC.e to Polygon wallet"))
        .argument("[amount]", "USDC.e amount")
        .option("--amount <amount>", "USDC.e amount")
        .action(async (amountArg, opts, command) => {
        await executePolymarketAction(opts, {
            action: "withdraw",
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
        });
    });
    shared(polymarketCmd.command("withdraw-native").description("Withdraw Polygon-native USDC to Polygon wallet"))
        .argument("[amount]", "USDC amount")
        .option("--amount <amount>", "USDC amount")
        .action(async (amountArg, opts, command) => {
        await executePolymarketAction(opts, {
            action: "withdraw_native",
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
        });
    });
    shared(polymarketCmd.command("redeem").description("Redeem settled winning Polymarket positions"))
        .argument("[conditionId]", "optional condition ID")
        .option("--condition-id <id>", "optional condition ID")
        .action(async (conditionIdArg, opts) => {
        await executePolymarketAction(opts, {
            action: "redeem",
            condition_id: conditionIdArg ?? opts.conditionId,
        });
    });
    shared(polymarketCmd.command("raw").description("Call a raw Polymarket action"))
        .requiredOption("--action <action>", "Polymarket action")
        .option("--market-slug <slug>", "market or event slug")
        .option("--token-id <id>", "CLOB token ID")
        .option("--outcome <outcome>", "yes or no")
        .option("--side <side>", "buy or sell")
        .option("--size <shares>", "order size in shares", parseFloat)
        .option("--type <type>", "limit or market")
        .option("--price <price>", "limit price from 0 to 1", parseFloat)
        .option("--order-type <type>", "CLOB order type")
        .option("--order-id <id>", "order ID")
        .option("--query <query>", "market search query")
        .option("--limit <n>", "result limit", parseInt)
        .option("--amount <amount>", "amount")
        .option("--condition-id <id>", "condition ID")
        .option("--json <json>", "additional args as JSON", parseJsonObject)
        .action(async (opts) => {
        await executePolymarketAction(opts, {
            ...opts.json,
            action: String(opts.action),
            market_slug: opts.marketSlug,
            token_id: opts.tokenId,
            outcome: opts.outcome,
            side: opts.side,
            size: opts.size,
            type: opts.type,
            price: opts.price,
            order_type: opts.orderType,
            order_id: opts.orderId,
            query: opts.query,
            limit: opts.limit,
            amount: opts.amount,
            condition_id: opts.conditionId,
        });
    });
    const hyperliquidCmd = marketCmd.command("hyperliquid").description("Trade or inspect Hyperliquid");
    shared(hyperliquidCmd.command("status").description("Show Hyperliquid account status"))
        .action(async (opts) => {
        await executeHyperliquidAction(opts, { action: "status" });
    });
    shared(hyperliquidCmd.command("markets").description("List Hyperliquid markets"))
        .usage("[limit] [offset] [options]")
        .argument("[limit]", "result limit")
        .argument("[offset]", "result offset")
        .option("--limit <n>", "result limit", parseInt)
        .option("--offset <n>", "result offset", parseInt)
        .addHelpText("after", "\nExamples:\n  spongewallet market hyperliquid markets\n  spongewallet market hyperliquid markets 10\n")
        .action(async (limitArg, offsetArg, opts) => {
        await executeHyperliquidAction(opts, {
            action: "markets",
            limit: limitArg !== undefined ? parseInt(limitArg, 10) : opts.limit,
            offset: offsetArg !== undefined ? parseInt(offsetArg, 10) : opts.offset,
        });
    });
    shared(hyperliquidCmd.command("positions").description("List open Hyperliquid positions"))
        .action(async (opts) => {
        await executeHyperliquidAction(opts, { action: "positions" });
    });
    shared(hyperliquidCmd.command("orders").description("List open Hyperliquid orders"))
        .usage("[limit] [offset] [options]")
        .argument("[limit]", "result limit")
        .argument("[offset]", "result offset")
        .option("--limit <n>", "result limit", parseInt)
        .option("--offset <n>", "result offset", parseInt)
        .addHelpText("after", "\nExamples:\n  spongewallet market hyperliquid orders\n  spongewallet market hyperliquid orders 20\n")
        .action(async (limitArg, offsetArg, opts) => {
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
        .action(async (limitArg, offsetArg, opts) => {
        await executeHyperliquidAction(opts, {
            action: "fills",
            limit: limitArg !== undefined ? parseInt(limitArg, 10) : opts.limit,
            offset: offsetArg !== undefined ? parseInt(offsetArg, 10) : opts.offset,
        });
    });
    shared(hyperliquidCmd.command("order").description("Place a Hyperliquid order"))
        .argument("[symbol]", "market symbol")
        .argument("[side]", "buy or sell")
        .argument("[type]", "order type")
        .argument("[amount]", "order amount")
        .argument("[price]", "limit price")
        .option("--symbol <symbol>", "market symbol")
        .option("--side <side>", "buy or sell")
        .option("--type <type>", "order type")
        .option("--amount <amount>", "order amount")
        .option("--price <price>", "limit price")
        .addHelpText("after", "\nExamples:\n  spongewallet market hyperliquid order ETH buy market 0.1\n  spongewallet market hyperliquid order ETH buy limit 0.1 3000\n")
        .action(async (symbolArg, sideArg, typeArg, amountArg, priceArg, opts, command) => {
        await executeHyperliquidAction(opts, {
            action: "order",
            symbol: requiredInput(command, opts, symbolArg, "symbol", "--symbol"),
            side: requiredInput(command, opts, sideArg, "side", "--side"),
            type: requiredInput(command, opts, typeArg, "type", "--type"),
            amount: requiredInput(command, opts, amountArg, "amount", "--amount"),
            price: priceArg ?? opts.price,
        });
    });
    shared(hyperliquidCmd.command("cancel").description("Cancel a Hyperliquid order"))
        .argument("[orderId]", "order ID")
        .option("--order-id <id>", "order ID")
        .action(async (orderIdArg, opts, command) => {
        await executeHyperliquidAction(opts, {
            action: "cancel",
            order_id: requiredInput(command, opts, orderIdArg, "orderId", "--order-id"),
        });
    });
    shared(hyperliquidCmd.command("cancel-all").description("Cancel all Hyperliquid orders"))
        .action(async (opts) => {
        await executeHyperliquidAction(opts, { action: "cancel_all" });
    });
    shared(hyperliquidCmd.command("leverage").description("Set Hyperliquid leverage"))
        .argument("[symbol]", "market symbol")
        .argument("[leverage]", "leverage")
        .option("--symbol <symbol>", "market symbol")
        .option("--leverage <n>", "leverage", parseFloat)
        .action(async (symbolArg, leverageArg, opts, command) => {
        await executeHyperliquidAction(opts, {
            action: "set_leverage",
            symbol: requiredInput(command, opts, symbolArg, "symbol", "--symbol"),
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
        .action(async (opts) => {
        await executeHyperliquidAction(opts, {
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
    });
}
async function connectWallet(opts) {
    return SpongeWallet.connect({
        baseUrl: opts.baseUrl,
        credentialsPath: opts.credentialsPath,
    });
}
async function executeHyperliquidAction(opts, input) {
    const wallet = await connectWallet(opts);
    const data = await wallet.hyperliquid(input);
    displayToolResult(getToolDefinition("hyperliquid"), data);
}
async function executePolymarketAction(opts, input) {
    const wallet = await connectWallet(opts);
    const data = await wallet.polymarket(input);
    displayToolResult(getToolDefinition("polymarket"), data);
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
function spongeCardConsentInput(opts) {
    const acceptAll = Boolean(opts.acceptAll);
    return {
        e_sign_consent: acceptAll || Boolean(opts.eSignConsent),
        account_opening_privacy_notice: acceptAll || Boolean(opts.accountOpeningPrivacyNotice),
        sponge_card_terms: acceptAll || Boolean(opts.spongeCardTerms),
        information_certification: acceptAll || Boolean(opts.informationCertification),
        unauthorized_solicitation_acknowledgement: acceptAll || Boolean(opts.unauthorizedSolicitationAcknowledgement),
    };
}
function skillRefreshPrompt() {
    return `If this agent has an older Sponge skill installed, redownload ${WALLET_SKILL_URL} so it knows ${WALLET_SKILL_NAME} v${WALLET_SKILL_VERSION}.`;
}
function buildCardSetupUrl(args) {
    const url = new URL("/dashboard", args.appUrl ?? DEFAULT_APP_URL);
    url.searchParams.set("tab", "cards");
    url.searchParams.set("addCard", "1");
    if (args.agentId)
        url.searchParams.set("agentId", args.agentId);
    if (args.flow && args.flow !== "choose")
        url.searchParams.set("cardFlow", args.flow);
    return url.toString();
}
async function handleCardAdd(opts) {
    const credentials = loadCredentials(opts.credentialsPath);
    const agentId = typeof opts.agentId === "string" && opts.agentId.length > 0
        ? opts.agentId
        : credentials?.agentId;
    const flow = typeof opts.flow === "string" ? opts.flow : "choose";
    const url = buildCardSetupUrl({
        appUrl: typeof opts.appUrl === "string" ? opts.appUrl : DEFAULT_APP_URL,
        agentId,
        flow,
    });
    p.log.info([
        "Open this dashboard flow to add a user-owned card:",
        url,
        "",
        flow === "link"
            ? "This opens the Link card connection flow."
            : flow === "basis-theory"
                ? "This opens the manual card flow backed by Basis Theory Elements tokenization."
                : "Choose manual Basis Theory tokenization or Link in the dashboard.",
    ].join("\n"));
    if (opts.browser === false)
        return;
    try {
        const open = await import("open");
        await open.default(url);
        p.log.step("Opened browser for card setup.");
    }
    catch {
        p.log.step("Could not open browser automatically. Open the URL manually.");
    }
}
async function getNpmLatestVersion(packageName) {
    try {
        const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
            headers: { Accept: "application/json" },
        });
        if (!response.ok)
            return null;
        const data = await response.json();
        return isRecord(data) && typeof data.version === "string" ? data.version : null;
    }
    catch {
        return null;
    }
}
async function getServerVersionInfo(baseUrl) {
    try {
        const url = new URL("/api/version", baseUrl ?? DEFAULT_BASE_URL);
        const response = await fetch(url.toString(), {
            headers: {
                Accept: "application/json",
                "Sponge-Version": SDK_VERSION,
            },
        });
        if (!response.ok)
            return null;
        const data = await response.json();
        return isRecord(data) ? data : null;
    }
    catch {
        return null;
    }
}
function compareSemver(a, b) {
    const parse = (value) => value
        .split(/[.-]/)
        .slice(0, 3)
        .map(part => {
        const parsed = Number.parseInt(part, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    });
    const left = parse(a);
    const right = parse(b);
    for (let index = 0; index < 3; index += 1) {
        const diff = (left[index] ?? 0) - (right[index] ?? 0);
        if (diff !== 0)
            return diff > 0 ? 1 : -1;
    }
    return 0;
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
        let totalUsd = 0;
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
                if (b.usdValue) {
                    const parsed = Number(b.usdValue);
                    if (Number.isFinite(parsed))
                        totalUsd += parsed;
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
        const row = (c, t, a, u) => `  ${c.padEnd(col.chain)}  ${t.padEnd(col.token)}  ${a.padStart(col.amount)}  ${u.padStart(col.usd)}`;
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
            const perps = getValueByKey(data, "balances.perps");
            const spot = getValueByKey(data, "balances.spot");
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
        const cleanData = Object.fromEntries(Object.entries(data).filter(([key]) => key !== "tool_call"));
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
    const hash = getValueByKey(data, ["transactionHash", "txHash", "tx_hash", "signature"]);
    const inputAmount = getValueByKey(data, ["inputToken.amount", "input_token.amount"]);
    const inputSymbol = getValueByKey(data, ["inputToken.symbol", "input_token.symbol"]);
    const outputAmount = getValueByKey(data, ["outputToken.amount", "output_token.amount"]);
    const outputSymbol = getValueByKey(data, ["outputToken.symbol", "output_token.symbol"]);
    const flow = inputAmount && inputSymbol && outputAmount && outputSymbol
        ? `${formatInlineValue(inputAmount)} ${formatInlineValue(inputSymbol)} -> ${formatInlineValue(outputAmount)} ${formatInlineValue(outputSymbol)}`
        : undefined;
    const sourceChain = getValueByKey(data, ["sourceChain", "source_chain"]);
    const destinationChain = getValueByKey(data, ["destinationChain", "destination_chain"]);
    const route = sourceChain && destinationChain
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