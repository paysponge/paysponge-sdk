import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildCliProgram } from "../src/cli.js";

function commandNames(command: { commands: Array<{ name(): string }> }) {
  return command.commands.map((entry) => entry.name());
}

function optionFlags(command: { options: Array<{ flags: string }> }) {
  return command.options.map((entry) => entry.flags);
}

function argumentRequirements(command: {
  registeredArguments: Array<{ name(): string; required: boolean }>;
}) {
  return command.registeredArguments.map((entry) => ({
    name: entry.name(),
    required: entry.required,
  }));
}

function applyExitOverride(command: {
  exitOverride(): unknown;
  commands: Array<{ exitOverride(): unknown; commands: Array<any> }>;
}) {
  command.exitOverride();
  for (const subcommand of command.commands) {
    applyExitOverride(subcommand);
  }
}

describe("CLI command tree", () => {
  it("exposes a curated top-level command surface", () => {
    const program = buildCliProgram();
    const topLevel = commandNames(program);

    expect(topLevel).toEqual([
      "init",
      "login",
      "logout",
      "whoami",
      "version",
      "mcp",
      "balance",
      "send",
      "history",
      "tokens",
      "search-tokens",
      "onramp",
      "tx",
      "swap",
      "bridge",
      "pay",
      "keys",
      "card",
      "bank",
      "plan",
      "trade",
      "auth",
      "market",
      "advanced",
    ]);
    expect(topLevel).not.toContain("get-balance");
    expect(topLevel).not.toContain("evm-transfer");
  });

  it("keeps raw tool commands under advanced", () => {
    const program = buildCliProgram();
    const advanced = program.commands.find((entry) => entry.name() === "advanced");

    expect(advanced).toBeDefined();
    expect(commandNames(advanced!)).toContain("get-balance");
    expect(commandNames(advanced!)).toContain("discover-services");
    expect(commandNames(advanced!)).toContain("get-service");
    expect(commandNames(advanced!)).toContain("polymarket");
    expect(commandNames(advanced!)).toContain("generate-siwe");
  });

  it("exposes discovery commands under pay", () => {
    const program = buildCliProgram();
    const pay = program.commands.find((entry) => entry.name() === "pay");

    expect(pay).toBeDefined();
    expect(commandNames(pay!)).toEqual(expect.arrayContaining([
      "discover",
      "service",
      "fetch",
      "x402",
      "mpp",
    ]));
  });

  it("exposes bank account and transfer commands under bank", () => {
    const program = buildCliProgram();
    const bank = program.commands.find((entry) => entry.name() === "bank");
    const virtualAccount = bank?.commands.find((entry) => entry.name() === "virtual-account");
    const externalAccounts = bank?.commands.find((entry) => entry.name() === "external-accounts");

    expect(bank).toBeDefined();
    expect(commandNames(bank!)).toEqual(expect.arrayContaining([
      "onboard",
      "status",
      "virtual-account",
      "external-accounts",
      "send",
      "transfers",
    ]));
    expect(commandNames(virtualAccount!)).toEqual(expect.arrayContaining(["create", "get"]));
    expect(commandNames(externalAccounts!)).toEqual(expect.arrayContaining(["list", "add"]));
  });

  it("exposes Polymarket commands under market", () => {
    const program = buildCliProgram();
    const market = program.commands.find((entry) => entry.name() === "market");
    const polymarket = market?.commands.find((entry) => entry.name() === "polymarket");

    expect(polymarket).toBeDefined();
    expect(commandNames(polymarket!)).toEqual(expect.arrayContaining([
      "status",
      "enable",
      "search",
      "get",
      "price",
      "positions",
      "orders",
      "balance",
      "order",
      "cancel",
      "deposit",
      "deposit-from-wallet",
      "withdraw",
      "redeem",
      "raw",
    ]));
  });

  it("exposes Hyperliquid chart commands under market", () => {
    const program = buildCliProgram();
    const market = program.commands.find((entry) => entry.name() === "market");
    const hyperliquid = market?.commands.find((entry) => entry.name() === "hyperliquid");
    const chart = hyperliquid?.commands.find((entry) => entry.name() === "chart");
    const raw = hyperliquid?.commands.find((entry) => entry.name() === "raw");

    expect(hyperliquid).toBeDefined();
    expect(commandNames(hyperliquid!)).toEqual(expect.arrayContaining([
      "status",
      "markets",
      "positions",
      "orders",
      "chart",
      "order",
      "raw",
    ]));
    expect(chart).toBeDefined();
    expect(argumentRequirements(chart as any)).toEqual([
      { name: "symbol", required: false },
    ]);
    expect(optionFlags(chart!)).toEqual(expect.arrayContaining([
      "--symbol <symbol>",
      "--interval <interval>",
      "--chart-style <style>",
    ]));
    expect(optionFlags(raw!)).toEqual(expect.arrayContaining([
      "--interval <interval>",
      "--chart-style <style>",
    ]));
  });

  it("keeps wallet workflows as direct top-level commands", () => {
    const program = buildCliProgram();
    const topLevel = commandNames(program);

    expect(topLevel).not.toContain("wallet");
    expect(topLevel).toEqual(expect.arrayContaining([
      "balance",
      "send",
      "history",
      "tokens",
      "search-tokens",
      "onramp",
    ]));
  });

  it("makes switching agents explicit on login", () => {
    const program = buildCliProgram();
    const login = program.commands.find((entry) => entry.name() === "login");

    expect(login).toBeDefined();
    expect(optionFlags(login!)).toEqual(expect.arrayContaining([
      "--continue-claim",
      "--switch",
    ]));
  });

  it("makes switching agents explicit on init", () => {
    const program = buildCliProgram();
    const init = program.commands.find((entry) => entry.name() === "init");

    expect(init).toBeDefined();
    expect(optionFlags(init!)).toEqual(expect.arrayContaining([
      "--switch",
    ]));
  });

  it("refuses to overwrite cached credentials during init without --switch", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sponge-cli-"));
    const credentialsPath = path.join(tempDir, "credentials.json");
    fs.writeFileSync(credentialsPath, JSON.stringify({
      apiKey: "sponge_live_existing",
      agentId: "11111111-1111-4111-8111-111111111111",
      agentName: "Existing Agent",
      createdAt: new Date().toISOString(),
    }));

    const program = buildCliProgram();

    try {
      await expect(
        program.parseAsync(["init", "--credentials-path", credentialsPath], { from: "user" })
      ).rejects.toThrow("Refusing to overwrite existing Sponge credentials");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("allows option-only forms for commands that advertise flag fallbacks", () => {
    const program = buildCliProgram();
    const send = program.commands.find((entry) => entry.name() === "send");
    const searchTokens = program.commands.find((entry) => entry.name() === "search-tokens");
    const keys = program.commands.find((entry) => entry.name() === "keys");
    const tx = program.commands.find((entry) => entry.name() === "tx");
    const swap = program.commands.find((entry) => entry.name() === "swap");
    const trade = program.commands.find((entry) => entry.name() === "trade");
    const auth = program.commands.find((entry) => entry.name() === "auth");

    expect(argumentRequirements(send as any)).toEqual([
      { name: "chain", required: false },
      { name: "to", required: false },
      { name: "asset", required: false },
      { name: "amount", required: false },
    ]);
    expect(argumentRequirements(searchTokens as any)).toEqual([
      { name: "query", required: false },
      { name: "limit", required: false },
    ]);
    expect(argumentRequirements(tx!.commands.find((entry) => entry.name() === "status") as any)).toEqual([
      { name: "chain", required: false },
      { name: "txHash", required: false },
    ]);
    expect(argumentRequirements(swap!.commands.find((entry) => entry.name() === "execute") as any)).toEqual([
      { name: "quoteId", required: false },
    ]);
    expect(argumentRequirements(keys!.commands.find((entry) => entry.name() === "get") as any)).toEqual([
      { name: "service", required: false },
    ]);
    expect(argumentRequirements(keys!.commands.find((entry) => entry.name() === "set") as any)).toEqual([
      { name: "service", required: false },
      { name: "key", required: false },
    ]);
    expect(argumentRequirements(program.commands.find((entry) => entry.name() === "plan")!.commands.find((entry) => entry.name() === "approve") as any)).toEqual([
      { name: "planId", required: false },
    ]);
    expect(argumentRequirements(trade!.commands.find((entry) => entry.name() === "propose") as any)).toEqual([
      { name: "from", required: false },
      { name: "to", required: false },
      { name: "amount", required: false },
    ]);
    expect(argumentRequirements(auth!.commands.find((entry) => entry.name() === "siwe") as any)).toEqual([
      { name: "domain", required: false },
      { name: "uri", required: false },
    ]);
  });

  it("shows command help when required fallback inputs are missing", async () => {
    const program = buildCliProgram();
    const output: string[] = [];
    applyExitOverride(program as any);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      output.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
      return true;
    }) as any);

    try {
      await expect(program.parseAsync(["send"], { from: "user" })).rejects.toMatchObject({
        code: "sponge.missing_required_input",
      });
    } finally {
      stderr.mockRestore();
    }

    const rendered = output.join("");
    expect(rendered).toContain("missing required argument or option: --chain");
    expect(rendered).toContain("Usage: spongewallet send [chain] [to] [asset] [amount] [options]");
  });
});
