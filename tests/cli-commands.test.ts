import { describe, expect, it } from "vitest";
import { buildCliProgram } from "../src/cli.js";

function commandNames(command: { commands: Array<{ name(): string }> }) {
  return command.commands.map((entry) => entry.name());
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
      "mcp",
      "wallet",
      "tx",
      "swap",
      "bridge",
      "pay",
      "keys",
      "card",
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
    expect(commandNames(advanced!)).toContain("generate-siwe");
  });

  it("groups wallet workflows under wallet", () => {
    const program = buildCliProgram();
    const wallet = program.commands.find((entry) => entry.name() === "wallet");

    expect(wallet).toBeDefined();
    expect(commandNames(wallet!)).toEqual([
      "balance",
      "send",
      "history",
      "tokens",
      "search-tokens",
      "onramp",
    ]);
  });
});
