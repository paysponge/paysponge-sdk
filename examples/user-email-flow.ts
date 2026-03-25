/**
 * Per-User Email Flow (control-plane style)
 *
 * Demonstrates a practical flow for:
 * 1) Ensuring one Sponge agent per user email (email registration endpoint not wired yet)
 * 2) Connecting wallet for that user agent
 * 3) Creating onramp link
 * 4) Reading balances
 * 5) Making x402 payments
 *
 * Run with:
 *   cd packages/spongewallet-sdk
 *   USER_EMAIL=user@example.com SPONGE_MASTER_KEY=sponge_master_xxx bun run examples/user-email-flow.ts
 *
 * Optional env vars:
 *   SPONGE_API_URL=https://api.wallet.paysponge.com
 *   SPONGE_MASTER_KEY=sponge_master_...
 *   X402_URL=https://paid.example.com/protected
 *   X402_PAY_TO=0x...
 *   X402_AMOUNT=0.01
 */

import { SpongePlatform } from "../src/index.js";

type UserAgentRecord = {
  agentId: string;
  apiKey: string;
};

// Demo-only in-memory store. Replace with your DB (keyed by user email/user id).
const userAgentStore = new Map<string, UserAgentRecord>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailToAgentName(email: string): string {
  const local = email.split("@")[0] ?? "user";
  return `agent-${local.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 32)}`;
}

async function createAgentForEmail(args: {
  email: string;
  platform: SpongePlatform;
}): Promise<UserAgentRecord> {
  const created = await args.platform.createAgent({
      name: emailToAgentName(args.email),
      description: `Auto-provisioned wallet agent for ${args.email}`,
      isTestMode: true,
  });

  return {
    agentId: created.agent.id,
    apiKey: created.apiKey,
  };
}

async function ensureUserAgent(email: string, platform: SpongePlatform): Promise<UserAgentRecord> {
  const key = normalizeEmail(email);
  const existing = userAgentStore.get(key);
  if (existing) {
    return existing;
  }

  const created = await createAgentForEmail({
    email: key,
    platform,
  });
  userAgentStore.set(key, created);
  return created;
}

async function main() {
  const baseUrl = process.env.SPONGE_API_URL ?? "https://api.wallet.paysponge.com";
  const userEmail = process.env.USER_EMAIL;
  const masterKey = process.env.SPONGE_MASTER_KEY;

  if (!userEmail) {
    throw new Error("USER_EMAIL is required");
  }
  if (!masterKey) {
    throw new Error("SPONGE_MASTER_KEY is required");
  }

  console.log("=".repeat(60));
  console.log("SpongeWallet SDK - Per-User Email Flow");
  console.log("=".repeat(60));
  console.log(`User: ${userEmail}`);
  console.log();

  const platform = await SpongePlatform.connect({
    apiKey: masterKey,
    baseUrl,
  });

  // Step 1: Ensure one agent per user email (placeholder logic until dedicated endpoint exists).
  const userAgent = await ensureUserAgent(userEmail, platform);
  console.log("1. Agent provisioned/resolved");
  console.log(`   Agent ID: ${userAgent.agentId}`);
  console.log();

  // Step 2: Connect wallet scoped to that user's agent key.
  const wallet = await platform.connectAgent({
    apiKey: userAgent.apiKey,
    agentId: userAgent.agentId,
  });
  console.log("2. Wallet connected");
  console.log(`   Agent ID: ${wallet.getAgentId()}`);
  console.log();

  // Step 3: Onramp workflow.
  const addresses = await wallet.getAddresses();
  const baseAddress = addresses.base;

  console.log("3. Onramp link (USDC -> Base wallet)");
  const onramp = await wallet.onrampCrypto({
    wallet_address: baseAddress,
    provider: "auto",
    chain: "base",
    fiat_amount: "100",
    fiat_currency: "usd",
    lock_wallet_address: true,
  });
  console.log("   Onramp response:", onramp);
  console.log();

  // Step 4: Read balances.
  console.log("4. Current balances");
  const balances = await wallet.getBalances();
  console.log(JSON.stringify(balances, null, 2));
  console.log();

  // Step 5a: Explicit x402 payment payload creation.
  const payTo = process.env.X402_PAY_TO;
  if (payTo) {
    console.log("5. Create x402 payment payload");
    const payment = await wallet.createX402Payment({
      chain: "base",
      to: payTo,
      amount: process.env.X402_AMOUNT ?? "0.01",
      resource_url: process.env.X402_URL ?? "https://paid.example.com/protected",
      resource_description: "Example paid API call",
      http_method: "GET",
    });
    console.log("   Payment response:", payment);
    console.log();
  } else {
    console.log("6. Skipping createX402Payment (set X402_PAY_TO to enable)");
    console.log();
  }

  // Step 5b: Auto x402 fetch by URL.
  const x402Url = process.env.X402_URL;
  if (x402Url) {
    console.log("6. x402Fetch");
    const paidResponse = await wallet.x402Fetch({
      url: x402Url,
      method: "GET",
      preferredChain: "base",
    });
    console.log("   x402Fetch response:", paidResponse);
  } else {
    console.log("6. Skipping x402Fetch (set X402_URL to enable)");
  }

  console.log();
  console.log("Flow complete.");
}

main().catch((error) => {
  console.error("Flow failed:", error);
  process.exit(1);
});
