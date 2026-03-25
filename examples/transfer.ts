/**
 * Transfer Test
 *
 * Tests the transfer functionality:
 * 1. Connect to wallet
 * 2. Check balance before transfer
 * 3. Make a transfer (testnet)
 * 4. Check balance after transfer
 *
 * Run with:
 *   cd packages/spongewallet-sdk
 *   bun run examples/transfer.ts
 *
 * Environment variables:
 *   SPONGE_API_KEY - Your API key (optional, will do device flow if not set)
 *   SPONGE_API_URL - Backend URL (optional, defaults to production)
 *   RECIPIENT_ADDRESS - Address to send to (optional, uses a test address)
 */

import { SpongeWallet } from "../src/index.js";

// Default test recipient (you can override with env var)
const DEFAULT_RECIPIENT = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bC12";

async function main() {
  console.log("=".repeat(60));
  console.log("SpongeWallet SDK - Transfer Test");
  console.log("=".repeat(60));
  console.log();

  // Connect to SpongeWallet (testnet mode)
  console.log("1. Connecting to SpongeWallet (testnet mode)...");
  const wallet = await SpongeWallet.connect({
    name: "Transfer Test Agent",
    testnet: true,
    baseUrl: process.env.SPONGE_API_URL || undefined,
  });
  console.log("   Connected!");
  console.log(`   Agent ID: ${wallet.getAgentId()}`);
  console.log();

  // Get testnet addresses
  console.log("2. Getting testnet wallet addresses...");
  const addresses = await wallet.getAddresses();
  console.log("   Addresses:");
  for (const [chain, address] of Object.entries(addresses)) {
    if (chain.includes("sepolia") || chain.includes("devnet") || chain === "tempo") {
      console.log(`     ${chain}: ${address}`);
    }
  }
  console.log();

  // Check balance before transfer
  console.log("3. Checking balance on Base Sepolia...");
  const balanceBefore = await wallet.getBalance("base-sepolia");
  console.log("   Balance before:");
  for (const [symbol, amount] of Object.entries(balanceBefore)) {
    console.log(`     ${symbol}: ${amount}`);
  }
  console.log();

  // Perform a transfer
  const recipient = process.env.RECIPIENT_ADDRESS || DEFAULT_RECIPIENT;
  const amount = "0.001"; // Small test amount

  console.log("4. Making transfer...");
  console.log(`   Chain: base-sepolia`);
  console.log(`   To: ${recipient}`);
  console.log(`   Amount: ${amount} ETH`);
  console.log();

  try {
    const tx = await wallet.transfer({
      chain: "base-sepolia",
      to: recipient,
      amount,
      currency: "ETH",
    });

    console.log("   Transfer submitted!");
    console.log(`   TX Hash: ${tx.txHash}`);
    console.log(`   Status: ${tx.status}`);
    if (tx.explorerUrl) {
      console.log(`   Explorer: ${tx.explorerUrl}`);
    }
    console.log();

    // Check transaction status
    console.log("5. Checking transaction status...");
    const status = await wallet.getTransactionStatus(tx.txHash, "base-sepolia");
    console.log(`   Status: ${status.status}`);
    if (status.confirmations) {
      console.log(`   Confirmations: ${status.confirmations}`);
    }
    console.log();

    // Check balance after transfer
    console.log("6. Checking balance after transfer...");
    const balanceAfter = await wallet.getBalance("base-sepolia");
    console.log("   Balance after:");
    for (const [symbol, amountVal] of Object.entries(balanceAfter)) {
      console.log(`     ${symbol}: ${amountVal}`);
    }
  } catch (error: any) {
    console.error("   Transfer failed:", error.message || error);
    console.log();
    console.log("   Note: Make sure you have testnet ETH on Base Sepolia.");
    console.log("   You can get testnet ETH from a faucet.");
  }

  console.log();
  console.log("=".repeat(60));
  console.log("Transfer test completed!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
