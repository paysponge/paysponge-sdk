/**
 * Direct OpenAPI Generator client example
 *
 * Shows how to use the generated request builders directly while keeping the
 * SDK's existing auth and error handling through HttpClient.
 *
 * Run with:
 *   cd packages/spongewallet-sdk
 *   SPONGE_API_KEY=sponge_test_xxx bun run examples/openapi-generated.ts
 */

import {
  HttpClient,
  createGeneratedApiClient,
} from "../src/index.js";

async function main() {
  const apiKey = process.env.SPONGE_API_KEY;
  if (!apiKey) {
    throw new Error("SPONGE_API_KEY is required for the generated OpenAPI example");
  }

  const http = new HttpClient({
    apiKey,
    baseUrl: process.env.SPONGE_API_URL || undefined,
  });
  const client = createGeneratedApiClient(http);

  console.log("=".repeat(60));
  console.log("OpenAPI Generator Client Example");
  console.log("=".repeat(60));
  console.log();

  console.log("1. Fetch current agent");
  const currentAgent = await client.request<Record<string, unknown>>(
    client.api.getApiAgentsMeRequestOpts(),
  );
  console.log(JSON.stringify(currentAgent, null, 2));
  console.log();

  const agentId = String(currentAgent.id ?? "");
  if (!agentId) {
    throw new Error("Current agent response did not include an id");
  }

  console.log("2. Fetch wallets for the current agent");
  const wallets = await client.request<Array<Record<string, unknown>>>(
    client.api.getApiWalletsRequestOpts({
      agentId,
      includeBalances: "true",
    }),
  );
  console.log(JSON.stringify(wallets, null, 2));
  console.log();

  console.log("3. Fetch detailed balances");
  const balances = await client.request<Record<string, unknown>>(
    client.api.getApiBalancesRequestOpts({
      chain: "all",
    }),
  );
  console.log(JSON.stringify(balances, null, 2));
  console.log();

  console.log("4. Build, but do not submit, an onramp request body");
  const requestOpts = await client.api.postApiOnrampCryptoRequestOpts({
    postApiOnrampCryptoRequest: {
      wallet_address: String(wallets[0]?.address ?? ""),
      chain: "base",
      provider: "auto",
      fiat_amount: "100",
      fiat_currency: "usd",
      lock_wallet_address: true,
    },
  });
  console.log(JSON.stringify(requestOpts, null, 2));
  console.log();
}

main().catch((error) => {
  console.error("OpenAPI example failed:", error);
  process.exit(1);
});
