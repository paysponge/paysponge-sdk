/**
 * Platform Control Plane Example
 *
 * Uses SpongePlatform with a master API key to create and manage agents,
 * then connects to the returned agent key with SpongeWallet.
 *
 * Run with:
 *   cd packages/spongewallet-sdk
 *   SPONGE_MASTER_KEY=sponge_master_xxx bun run examples/platform.ts
 *
 * Optional:
 *   SPONGE_API_URL=http://localhost:8000
 */

import { SpongePlatform } from "../src/index.js";

async function main() {
  console.log("=".repeat(60));
  console.log("SpongeWallet SDK - Platform Example");
  console.log("=".repeat(60));
  console.log();

  const baseUrl = process.env.SPONGE_API_URL || "https://api.wallet.paysponge.com";
  const masterKey = process.env.SPONGE_MASTER_KEY;
  if (!masterKey) {
    throw new Error("SPONGE_MASTER_KEY is required. Create one in Dashboard -> Settings -> Master API Keys.");
  }

  console.log("1. Connecting platform client...");
  const platform = await SpongePlatform.connect({
    apiKey: masterKey,
    baseUrl,
  });
  console.log(`   Connected to ${platform.getBaseUrl()}`);
  console.log();

  console.log("2. Creating agent via SpongePlatform...");
  const created = await platform.createAgent({
      name: `bot-${Date.now()}`,
      description: "Created via master key example",
      isTestMode: true,
  });
  console.log(`   Agent: ${created.agent.name} (${created.agent.id})`);
  console.log(`   API Key: ${created.apiKey.substring(0, 24)}...`);
  console.log();

  console.log("3. Connecting to created agent wallet...");
  const wallet = await platform.connectAgent({
    apiKey: created.apiKey,
    agentId: created.agent.id,
  });
  console.log(`   Connected! Agent ID: ${wallet.getAgentId()}`);
  console.log();

  console.log("4. Getting wallet addresses...");
  const addresses = await wallet.getAddresses();
  for (const [chain, address] of Object.entries(addresses)) {
    console.log(`   ${chain}: ${address}`);
  }
  console.log();

  console.log("5. Listing agents for this platform...");
  const agents = await platform.listAgents();
  console.log(`   Agent count: ${agents.length}`);
  console.log();

  console.log("=".repeat(60));
  console.log("Platform example completed!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
