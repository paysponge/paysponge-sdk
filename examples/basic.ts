/**
 * Basic SDK Test
 *
 * Tests the core functionality:
 * 1. Connect (browser auth flow or API key)
 * 2. Get wallet addresses
 * 3. Get balances
 *
 * Run with:
 *   cd packages/spongewallet-sdk
 *   bun run examples/basic.ts
 *
 * Or with API key:
 *   SPONGE_API_KEY=sponge_test_xxx bun run examples/basic.ts
 */

import { SpongeWallet } from "../src/index.js";

async function main() {
  console.log("=".repeat(60));
  console.log("SpongeWallet SDK - Basic Test");
  console.log("=".repeat(60));
  console.log();

  // Check if we have an API key in env
  const apiKey = process.env.SPONGE_API_KEY;
  if (apiKey) {
    console.log("Using API key from environment variable");
  } else {
    console.log("No API key found - will start browser auth flow");
  }
  console.log();

  // Connect to SpongeWallet
  console.log("1. Connecting to SpongeWallet...");
  const wallet = await SpongeWallet.connect({
    name: "SDK Test Agent",
    // Use local dev server if SPONGE_API_URL is set
    baseUrl: process.env.SPONGE_API_URL || undefined,
  });
  console.log("   Connected!");
  console.log(`   Agent ID: ${wallet.getAgentId()}`);
  console.log();

  // Get wallet addresses
  console.log("2. Getting wallet addresses...");
  const addresses = await wallet.getAddresses();
  console.log("   Addresses:");
  for (const [chain, address] of Object.entries(addresses)) {
    console.log(`     ${chain}: ${address}`);
  }
  console.log();

  // Get balances
  console.log("3. Getting balances...");
  try {
    const balances = await wallet.getBalances();
    console.log("   Balances:");
    for (const [chain, balance] of Object.entries(balances)) {
      const tokens = Object.entries(balance)
        .map(([symbol, amount]) => `${amount} ${symbol}`)
        .join(", ");
      console.log(`     ${chain}: ${tokens || "(empty)"}`);
    }
  } catch (error) {
    console.log(`   Error getting balances: ${error}`);
  }
  console.log();

  // Get MCP config
  console.log("4. MCP Configuration:");
  const mcpConfig = wallet.mcp();
  console.log(`   URL: ${mcpConfig.url}`);
  console.log(`   Auth: Bearer ${mcpConfig.headers.Authorization.substring(0, 30)}...`);
  console.log();

  // Get tool definitions
  console.log("5. Available Tools:");
  const tools = await wallet.tools();
  for (const tool of tools.definitions) {
    console.log(`   - ${tool.name}: ${tool.description.substring(0, 60)}...`);
  }
  console.log();

  console.log("=".repeat(60));
  console.log("Basic test completed successfully!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
