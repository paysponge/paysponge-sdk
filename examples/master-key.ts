/**
 * Master Key - Programmatic Agent Creation (REST)
 *
 * Uses a master API key to create a new agent via REST,
 * then connects to the returned agent key with SpongeWallet.
 *
 * Run with:
 *   cd packages/spongewallet-sdk
 *   SPONGE_MASTER_KEY=sponge_master_xxx bun run examples/master-key.ts
 *
 * Optional:
 *   SPONGE_API_URL=http://localhost:8000
 */

import { SpongeWallet, deviceFlowAuth } from "../src/index.js";

async function main() {
  console.log("=".repeat(60));
  console.log("SpongeWallet SDK - Master Key Example");
  console.log("=".repeat(60));
  console.log();

  const baseUrl = process.env.SPONGE_API_URL || "https://api.wallet.paysponge.com";
  const envMasterKey = process.env.SPONGE_MASTER_KEY;

  const masterKey =
    envMasterKey ??
    (await deviceFlowAuth({
      baseUrl,
      keyType: "master",
    })).apiKey;

  if (!envMasterKey) {
    console.log("Obtained a new master key via device flow.");
    console.log();
  }

  console.log("1. Creating agent via REST...");
  const createResponse = await fetch(`${baseUrl}/api/agents/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${masterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `bot-${Date.now()}`,
      description: "Created via master key example",
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create agent: ${createResponse.status} ${createResponse.statusText}`);
  }

  const createResult = (await createResponse.json()) as {
    agent: { id: string; name: string };
    apiKey: string;
  };

  console.log(`   Agent: ${createResult.agent.name} (${createResult.agent.id})`);
  console.log(`   API Key: ${createResult.apiKey.substring(0, 24)}...`);
  console.log();

  console.log("2. Connecting to created agent wallet...");
  const wallet = await SpongeWallet.connect({
    apiKey: createResult.apiKey,
    agentId: createResult.agent.id,
    baseUrl,
  });
  console.log(`   Connected! Agent ID: ${wallet.getAgentId()}`);
  console.log();

  console.log("3. Getting wallet addresses...");
  const addresses = await wallet.getAddresses();
  for (const [chain, address] of Object.entries(addresses)) {
    console.log(`   ${chain}: ${address}`);
  }
  console.log();

  console.log("=".repeat(60));
  console.log("Master key example completed!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
