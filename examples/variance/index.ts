/**
 * Variance HyperEVM Integration Test
 *
 * Encodes and optionally submits a USDC approval plus Variance vault action
 * through the SpongeWallet SDK on HyperEVM mainnet.
 *
 * This script talks to the UUPS proxy, not the implementation contract.
 *
 * Run dry-run:
 *   bun run index.ts deposit 1
 *   bun run index.ts bet 1 --win-prob-bps 5000 --min-payout 1.95
 *   bun run index.ts check 230
 *
 * Submit transactions:
 *   SPONGE_API_KEY=sponge_live_xxx bun run index.ts deposit 1 --execute
 *   SPONGE_API_KEY=sponge_live_xxx bun run index.ts bet 1 --execute
 *
 * Optional flags:
 *   --execute                      Submit transactions instead of dry-running
 *   --wallet 0x...                 Check an address against the vault allowlist
 *   --win-prob-bps 5000            Bet win probability, default 5000
 *   --min-payout 1.95              Bet min gross payout in USDC, default 0
 *   --debug                        Print raw calldata and full vault state
 *   SPONGE_API_URL                 Optional Sponge API URL override
 */

import { SpongeWallet } from "@paysponge/sdk";

const HYPEREVM_CHAIN = "hyperevm" as const;
const HYPEREVM_CHAIN_ID = 999;
const HYPEREVM_EXPLORER = "https://app.hyperliquid.xyz/explorer";
const HYPEREVM_RPC_URL = "https://rpc.hyperliquid.xyz/evm";
const VAULT_PROXY = "0xc1a018fd2995EBc7890dfFf196dEC2cEE75C7dbE" as const;
const USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f" as const;
const APPROVE_SELECTOR = "0x095ea7b3";
const ALLOWANCE_SELECTOR = "0xdd62ed3e";
const DEPOSIT_SELECTOR = "0xb6b55f25"; // deposit(uint256)
const PLACE_BET_SELECTOR = "0x85df1d1e"; // placeBet(uint256,uint256,uint256,string,string)
const BETS_SELECTOR = "0x22af00fa"; // bets(uint256)
const BET_PLACED_TOPIC = "0xdbfc6f7962c7e432f99f0f173c76a548d757014f1aa276cb39b2215be1ce9b93";
const BET_SETTLED_TOPIC = "0x37362630678c982c87b2a2f58a9d816cce6a49d26c82ddf6f348b2efabe2f1bf";
const USDC_DECIMALS = 6;
const DEFAULT_WIN_PROB_BPS = 5000n;
const DEFAULT_MIN_GROSS_PAYOUT = 0n;
const DEFAULT_WIN_MESSAGE = "win";
const DEFAULT_LOSS_MESSAGE = "loss";
const HARD_CODED_SPONGE_API_KEY = "";
const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  asset: "0x38d52e0f",
  balanceOf: "0x70a08231",
  allowlistEnabled: "0x94c8e4ff",
  allowed: "0xd63a8e11",
  depositCap: "0xdbd5edc7",
  depositFeeBps: "0xab879827",
  edgeBps: "0x48f5d78b",
  maxPayoutBps: "0xbdcf1753",
  outstandingLiability: "0x536c9fe4",
  nextBetId: "0x9aca2792",
} as const;

type Action = "deposit" | "bet" | "check";

type CliArgs = {
  action: Action;
  amount: string;
  debug: boolean;
  execute: boolean;
  walletAddress?: `0x${string}`;
  winProbBps: bigint;
  minGrossPayout: bigint;
};

type TransactionReceipt = {
  status: `0x${string}`;
  blockNumber: `0x${string}`;
  transactionHash: `0x${string}`;
  logs: Array<{
    address: string;
    topics: `0x${string}`[];
    data: `0x${string}`;
    transactionHash?: string;
  }>;
};

type VaultState = {
  allowlistEnabled: boolean;
  nextBetId: bigint;
  vaultUsdcBalance: string;
};

type BetInfo = {
  bettor: `0x${string}`;
  stake: bigint;
  grossPayout: bigint;
  winProbBps: bigint;
  commitBlock: bigint;
  status: bigint;
};

type SettlementInfo = {
  betId: bigint;
  won: boolean;
  payout: bigint;
  txHash: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const amount = args.amount;
  if (args.action === "check") {
    await printBet(BigInt(amount));
    return;
  }

  const rawAmount = parseUnits(amount, USDC_DECIMALS);
  const execute = args.execute;
  const vaultProxy = VAULT_PROXY;
  const usdc = USDC;
  let vaultCalldata: `0x${string}`;
  let actionLabel: string;
  if (args.action === "deposit") {
    vaultCalldata = encodeDeposit(rawAmount);
    actionLabel = "deposit(uint256)";
  } else {
    vaultCalldata = encodePlaceBet({
      stake: rawAmount,
      winProbBps: args.winProbBps,
      minGrossPayout: args.minGrossPayout,
      winMessage: DEFAULT_WIN_MESSAGE,
      lossMessage: DEFAULT_LOSS_MESSAGE,
    });
    actionLabel = "placeBet(uint256,uint256,uint256,string,string)";
  }

  console.log(`Variance ${args.action} on HyperEVM`);
  console.log(`Amount:  ${amount} USDC`);
  if (args.action === "bet") {
    console.log(`Odds:    ${formatBps(args.winProbBps)} win probability`);
    console.log(`Guard:   ${formatUnits(args.minGrossPayout, USDC_DECIMALS)} USDC minimum gross payout`);
  }
  console.log(`Mode:    ${execute ? "execute" : "dry-run"}`);
  console.log();

  const vaultState = await readVaultState(vaultProxy, usdc, args.walletAddress, args.debug);
  if (!args.debug) {
    console.log(`Vault:   ${vaultState.vaultUsdcBalance} USDC, next bet #${vaultState.nextBetId}`);
    console.log(`Access:  allowlist ${vaultState.allowlistEnabled ? "enabled" : "disabled"}`);
    console.log();
  }

  const approveCalldata = encodeApprove(vaultProxy, rawAmount);
  if (args.debug) {
    console.log("Encoded calls:");
    console.log(`  USDC.approve(vault, amount): ${approveCalldata}`);
    console.log(`  Vault ${actionLabel}:        ${vaultCalldata}`);
    console.log();
  }

  if (!execute) {
    console.log("Dry-run only. Add --execute to submit via SpongeWallet.");
    return;
  }

  const wallet = await SpongeWallet.connect({
    apiKey: HARD_CODED_SPONGE_API_KEY || process.env.SPONGE_API_KEY,
    baseUrl: process.env.SPONGE_API_URL || undefined,
    noBrowser: true,
  });

  const addresses = await wallet.getAddresses();
  const walletAddress = addresses[HYPEREVM_CHAIN]
    ? requireAddress(addresses[HYPEREVM_CHAIN], "hyperevm wallet")
    : null;
  if (!walletAddress) {
    throw new Error("SpongeWallet did not return a HyperEVM wallet address");
  }

  const [hypeBalance, walletUsdcBalance, walletAllowed] = await Promise.all([
    ethGetBalance(walletAddress),
    ethCall(usdc, `${SELECTORS.balanceOf}${encodeAddress(walletAddress)}` as `0x${string}`),
    ethCall(vaultProxy, `${SELECTORS.allowed}${encodeAddress(walletAddress)}` as `0x${string}`),
  ]);
  console.log(`Agent:   ${wallet.getAgentId()}`);
  console.log(`Wallet:  ${walletAddress}`);
  console.log(`Balance: ${formatUnits(decodeUint256(walletUsdcBalance), USDC_DECIMALS)} USDC, ${formatUnits(hypeBalance, 18)} HYPE`);
  console.log(`Access:  ${decodeBool(walletAllowed) ? "allowlisted" : "not allowlisted"}`);
  console.log();

  console.log("Submitting USDC approval...");
  const approval = await wallet.sendTransaction({
    chain: HYPEREVM_CHAIN,
    to: usdc,
    value: "0",
    data: approveCalldata,
  });
  console.log(`  Approval tx: ${approval.txHash}`);
  console.log(`  Explorer:    ${txUrl(approval.txHash)}`);
  console.log();

  console.log("Waiting for approval to confirm...");
  await waitForTransaction(approval.txHash);
  await waitForAllowance(usdc, walletAddress, vaultProxy, rawAmount);
  console.log("  Approval confirmed.");
  console.log();

  console.log(`Submitting Variance ${actionLabel}...`);
  const vaultTx = await wallet.sendTransaction({
    chain: HYPEREVM_CHAIN,
    to: vaultProxy,
    value: "0",
    data: vaultCalldata,
  });
  console.log(`  Vault tx:    ${vaultTx.txHash}`);
  console.log(`  Explorer:    ${txUrl(vaultTx.txHash)}`);
  const vaultReceipt = await waitForTransaction(vaultTx.txHash);
  if (args.action === "bet") {
    const betId = getBetIdFromReceipt(vaultReceipt) ?? vaultState.nextBetId;
    console.log();
    await printBet(betId);
    console.log();
    console.log("Waiting for settlement...");
    const settlement = await waitForSettlement(betId, BigInt(vaultReceipt.blockNumber));
    printSettlement(settlement);
  }
  console.log();
  console.log("Done.");
}

main().catch((error) => {
  console.error("Variance integration test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

function requireAddress(value: string, label: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${label} must be a 20-byte EVM address`);
  }
  return value as `0x${string}`;
}

function encodeUint256(value: bigint): string {
  if (value < 0n) throw new Error("uint256 cannot be negative");
  return value.toString(16).padStart(64, "0");
}

function encodeAddress(value: `0x${string}`): string {
  return value.slice(2).toLowerCase().padStart(64, "0");
}

function parseUnits(value: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`Invalid decimal amount: ${value}`);
  }
  const [whole, fractional = ""] = value.split(".");
  if (fractional.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimal places`);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fractional.padEnd(decimals, "0") || "0");
}

function encodeApprove(spender: `0x${string}`, rawAmount: bigint): `0x${string}` {
  return `${APPROVE_SELECTOR}${encodeAddress(spender)}${encodeUint256(rawAmount)}` as `0x${string}`;
}

function encodeAllowance(owner: `0x${string}`, spender: `0x${string}`): `0x${string}` {
  return `${ALLOWANCE_SELECTOR}${encodeAddress(owner)}${encodeAddress(spender)}` as `0x${string}`;
}

function encodeDeposit(rawAmount: bigint): `0x${string}` {
  return `${DEPOSIT_SELECTOR}${encodeUint256(rawAmount)}` as `0x${string}`;
}

function stringToHex(value: string): string {
  return Buffer.from(value, "utf8").toString("hex");
}

function encodeAbiString(value: string): string {
  const hex = stringToHex(value);
  const byteLength = hex.length / 2;
  const paddedLength = Math.ceil(byteLength / 32) * 64;
  return `${encodeUint256(BigInt(byteLength))}${hex.padEnd(paddedLength, "0")}`;
}

function encodePlaceBet(params: {
  stake: bigint;
  winProbBps: bigint;
  minGrossPayout: bigint;
  winMessage: string;
  lossMessage: string;
}): `0x${string}` {
  const winMessageEncoded = encodeAbiString(params.winMessage);
  const lossMessageEncoded = encodeAbiString(params.lossMessage);
  const staticBytes = 5n * 32n;
  const winMessageOffset = staticBytes;
  const lossMessageOffset = staticBytes + BigInt(winMessageEncoded.length / 2);

  return `${PLACE_BET_SELECTOR}${encodeUint256(params.stake)}${encodeUint256(params.winProbBps)}${encodeUint256(params.minGrossPayout)}${encodeUint256(winMessageOffset)}${encodeUint256(lossMessageOffset)}${winMessageEncoded}${lossMessageEncoded}` as `0x${string}`;
}

function txUrl(txHash: string): string {
  return `${HYPEREVM_EXPLORER}/tx/${txHash}`;
}

function formatUnits(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatBps(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}%`;
}

function decodeUint256(hex: string): bigint {
  return BigInt(hex);
}

function decodeBool(hex: string): boolean {
  return decodeUint256(hex) !== 0n;
}

function decodeAddress(hex: string): `0x${string}` {
  return `0x${hex.slice(-40)}` as `0x${string}`;
}

function decodeString(hex: string): string {
  const clean = hex.slice(2);
  const offset = Number(BigInt(`0x${clean.slice(0, 64)}`));
  const lengthStart = offset * 2;
  const length = Number(BigInt(`0x${clean.slice(lengthStart, lengthStart + 64)}`));
  const dataStart = lengthStart + 64;
  const dataHex = clean.slice(dataStart, dataStart + length * 2);
  return Buffer.from(dataHex, "hex").toString("utf8");
}

function decodeWords(hex: `0x${string}`): string[] {
  const clean = hex.slice(2);
  const words: string[] = [];
  for (let i = 0; i < clean.length; i += 64) {
    words.push(`0x${clean.slice(i, i + 64)}`);
  }
  return words;
}

function encodeTopic(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}` as `0x${string}`;
}

function betStatusLabel(status: bigint): string {
  if (status === 0n) return "open";
  if (status === 1n) return "settled";
  if (status === 2n) return "voided";
  return `unknown (${status.toString()})`;
}

async function ethCall(to: `0x${string}`, data: `0x${string}`): Promise<`0x${string}`> {
  const response = await fetch(HYPEREVM_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const body = await response.json() as { result?: `0x${string}`; error?: { message?: string } };
  if (!body.result) {
    throw new Error(body.error?.message ?? "eth_call failed");
  }
  return body.result;
}

async function ethGetBalance(address: `0x${string}`): Promise<bigint> {
  const response = await fetch(HYPEREVM_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const body = await response.json() as { result?: `0x${string}`; error?: { message?: string } };
  if (!body.result) {
    throw new Error(body.error?.message ?? "eth_getBalance failed");
  }
  return BigInt(body.result);
}

async function ethBlockNumber(): Promise<bigint> {
  const response = await fetch(HYPEREVM_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_blockNumber",
      params: [],
    }),
  });
  const body = await response.json() as { result?: `0x${string}`; error?: { message?: string } };
  if (!body.result) {
    throw new Error(body.error?.message ?? "eth_blockNumber failed");
  }
  return BigInt(body.result);
}

async function ethGetTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
  const response = await fetch(HYPEREVM_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });
  const body = await response.json() as {
    result?: TransactionReceipt | null;
    error?: { message?: string };
  };
  if (body.error) {
    throw new Error(body.error.message ?? "eth_getTransactionReceipt failed");
  }
  return body.result ?? null;
}

async function ethGetLogs(params: {
  address: `0x${string}`;
  fromBlock: bigint;
  toBlock: bigint;
  topics: Array<`0x${string}` | null>;
}): Promise<TransactionReceipt["logs"]> {
  const response = await fetch(HYPEREVM_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{
        address: params.address,
        fromBlock: `0x${params.fromBlock.toString(16)}`,
        toBlock: `0x${params.toBlock.toString(16)}`,
        topics: params.topics,
      }],
    }),
  });
  const body = await response.json() as {
    result?: TransactionReceipt["logs"];
    error?: { message?: string };
  };
  if (body.error) {
    throw new Error(body.error.message ?? "eth_getLogs failed");
  }
  return body.result ?? [];
}

async function waitForTransaction(txHash: string): Promise<TransactionReceipt> {
  for (let i = 0; i < 60; i++) {
    const receipt = await ethGetTransactionReceipt(txHash);
    if (receipt) {
      if (receipt.status !== "0x1") {
        throw new Error(`Transaction reverted: ${txHash}`);
      }
      return receipt;
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for transaction confirmation: ${txHash}`);
}

async function waitForAllowance(
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  requiredAllowance: bigint,
): Promise<void> {
  for (let i = 0; i < 30; i++) {
    const allowance = decodeUint256(await ethCall(token, encodeAllowance(owner, spender)));
    if (allowance >= requiredAllowance) {
      return;
    }
    await sleep(1000);
  }
  throw new Error("Timed out waiting for USDC allowance to update");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeBet(betId: bigint): `0x${string}` {
  return `${BETS_SELECTOR}${encodeUint256(betId)}` as `0x${string}`;
}

async function readBet(betId: bigint): Promise<BetInfo> {
  const words = decodeWords(await ethCall(VAULT_PROXY, encodeBet(betId)));
  return {
    bettor: decodeAddress(words[0]),
    stake: decodeUint256(words[1]),
    grossPayout: decodeUint256(words[2]),
    winProbBps: decodeUint256(words[3]),
    commitBlock: decodeUint256(words[4]),
    status: decodeUint256(words[5]),
  };
}

async function printBet(betId: bigint): Promise<void> {
  const bet = await readBet(betId);
  console.log(`Bet #${betId.toString()}`);
  console.log(`Status:      ${betStatusLabel(bet.status)}`);
  console.log(`Bettor:      ${bet.bettor}`);
  console.log(`Stake:       ${formatUnits(bet.stake, USDC_DECIMALS)} USDC`);
  console.log(`Max payout:  ${formatUnits(bet.grossPayout, USDC_DECIMALS)} USDC`);
  console.log(`Win chance:  ${formatBps(bet.winProbBps)}`);
  console.log(`Commit block:${bet.commitBlock.toString()}`);
  if (bet.status === 0n) {
    console.log("Outcome:     pending settlement");
  } else if (bet.status === 1n) {
    const settlement = await findSettlement(betId, bet.commitBlock);
    if (settlement) {
      printSettlement(settlement);
    } else {
      console.log("Outcome:     settled");
    }
  }
}

function parseSettlementLog(log: TransactionReceipt["logs"][number]): SettlementInfo | null {
  if (
    log.address.toLowerCase() !== VAULT_PROXY.toLowerCase()
    || log.topics[0]?.toLowerCase() !== BET_SETTLED_TOPIC
    || !log.topics[1]
  ) {
    return null;
  }
  const words = decodeWords(log.data);
  return {
    betId: BigInt(log.topics[1]),
    won: decodeBool(words[0]),
    payout: decodeUint256(words[1]),
    txHash: (log as { transactionHash?: string }).transactionHash ?? "",
  };
}

async function findSettlement(betId: bigint, fromBlock: bigint): Promise<SettlementInfo | null> {
  const latestBlock = await ethBlockNumber();
  if (latestBlock < fromBlock) {
    return null;
  }
  const logs = await ethGetLogs({
    address: VAULT_PROXY,
    fromBlock,
    toBlock: latestBlock,
    topics: [BET_SETTLED_TOPIC, encodeTopic(betId)],
  });
  for (const log of logs) {
    const settlement = parseSettlementLog(log);
    if (settlement) return settlement;
  }
  return null;
}

async function waitForSettlement(betId: bigint, fromBlock: bigint): Promise<SettlementInfo> {
  for (let i = 0; i < 120; i++) {
    const settlement = await findSettlement(betId, fromBlock);
    if (settlement) return settlement;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for settlement of bet #${betId.toString()}`);
}

function printSettlement(settlement: SettlementInfo): void {
  console.log(`Outcome:     ${settlement.won ? "won" : "lost"}`);
  console.log(`Payout:      ${formatUnits(settlement.payout, USDC_DECIMALS)} USDC`);
  if (settlement.txHash) {
    console.log(`Settlement:  ${txUrl(settlement.txHash)}`);
  }
}

function getBetIdFromReceipt(receipt: TransactionReceipt): bigint | null {
  const placed = receipt.logs.find((log) =>
    log.address.toLowerCase() === VAULT_PROXY.toLowerCase()
    && log.topics[0]?.toLowerCase() === BET_PLACED_TOPIC
  );
  return placed?.topics[1] ? BigInt(placed.topics[1]) : null;
}

async function readVaultState(
  vaultProxy: `0x${string}`,
  usdc: `0x${string}`,
  walletAddress?: `0x${string}`,
  debug = false,
): Promise<VaultState> {
  const [
    poolName,
    poolSymbol,
    totalSupply,
    asset,
    usdcSymbol,
    usdcDecimalsRaw,
    vaultUsdcBalance,
    allowlistEnabled,
    depositCap,
    depositFeeBps,
    edgeBps,
    maxPayoutBps,
    outstandingLiability,
    nextBetId,
  ] = await Promise.all([
    ethCall(vaultProxy, SELECTORS.name),
    ethCall(vaultProxy, SELECTORS.symbol),
    ethCall(vaultProxy, SELECTORS.totalSupply),
    ethCall(vaultProxy, SELECTORS.asset),
    ethCall(usdc, SELECTORS.symbol),
    ethCall(usdc, SELECTORS.decimals),
    ethCall(usdc, `${SELECTORS.balanceOf}${encodeAddress(vaultProxy)}` as `0x${string}`),
    ethCall(vaultProxy, SELECTORS.allowlistEnabled),
    ethCall(vaultProxy, SELECTORS.depositCap),
    ethCall(vaultProxy, SELECTORS.depositFeeBps),
    ethCall(vaultProxy, SELECTORS.edgeBps),
    ethCall(vaultProxy, SELECTORS.maxPayoutBps),
    ethCall(vaultProxy, SELECTORS.outstandingLiability),
    ethCall(vaultProxy, SELECTORS.nextBetId),
  ]);

  const usdcDecimals = Number(decodeUint256(usdcDecimalsRaw));
  const walletAllowed = walletAddress
    ? decodeBool(await ethCall(vaultProxy, `${SELECTORS.allowed}${encodeAddress(walletAddress)}` as `0x${string}`))
    : null;

  if (debug) {
    console.log("On-chain vault state:");
    console.log(`  Pool token:           ${decodeString(poolName)} (${decodeString(poolSymbol)})`);
    console.log(`  Vault asset:          ${decodeAddress(asset)}`);
    console.log(`  USDC token:           ${decodeString(usdcSymbol)} (${usdcDecimals} decimals)`);
    console.log(`  Vault USDC balance:   ${formatUnits(decodeUint256(vaultUsdcBalance), usdcDecimals)} USDC`);
    console.log(`  vPOOL total supply:   ${formatUnits(decodeUint256(totalSupply), usdcDecimals)}`);
    console.log(`  Deposit cap:          ${formatUnits(decodeUint256(depositCap), usdcDecimals)} USDC`);
    console.log(`  Deposit fee:          ${decodeUint256(depositFeeBps).toString()} bps`);
    console.log(`  Edge:                 ${decodeUint256(edgeBps).toString()} bps`);
    console.log(`  Max payout:           ${decodeUint256(maxPayoutBps).toString()} bps`);
    console.log(`  Outstanding liability:${formatUnits(decodeUint256(outstandingLiability), usdcDecimals)} USDC`);
    console.log(`  Next bet id:          ${decodeUint256(nextBetId).toString()}`);
    console.log(`  Allowlist enabled:    ${decodeBool(allowlistEnabled)}`);
    if (walletAddress) {
      console.log(`  Wallet allowed:       ${walletAllowed}`);
    }
    console.log();
  }

  return {
    allowlistEnabled: decodeBool(allowlistEnabled),
    nextBetId: decodeUint256(nextBetId),
    vaultUsdcBalance: formatUnits(decodeUint256(vaultUsdcBalance), usdcDecimals),
  };
}

function printUsage(): never {
  console.error("Usage:");
  console.error("  bun run examples/variance-hyperevm.ts deposit <usdc> [--execute] [--wallet 0x...]");
  console.error("  bun run examples/variance-hyperevm.ts bet <usdc> [--win-prob-bps 5000] [--min-payout 1.95] [--execute]");
  console.error("  bun run examples/variance-hyperevm.ts check <bet-id>");
  process.exit(1);
}

function readFlagValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv: string[]): CliArgs {
  const [actionArg, amountArg, ...flags] = argv;
  if (actionArg === "--help" || actionArg === "-h") {
    printUsage();
  }
  if (actionArg !== "deposit" && actionArg !== "bet" && actionArg !== "check") {
    printUsage();
  }
  if (!amountArg) {
    printUsage();
  }

  const parsed: CliArgs = {
    action: actionArg,
    amount: amountArg,
    debug: false,
    execute: false,
    winProbBps: DEFAULT_WIN_PROB_BPS,
    minGrossPayout: DEFAULT_MIN_GROSS_PAYOUT,
  };

  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    if (flag === "--execute") {
      parsed.execute = true;
    } else if (flag === "--debug") {
      parsed.debug = true;
    } else if (flag === "--wallet") {
      parsed.walletAddress = requireAddress(readFlagValue(flags, i, flag), "--wallet");
      i++;
    } else if (flag === "--win-prob-bps") {
      parsed.winProbBps = BigInt(readFlagValue(flags, i, flag));
      i++;
    } else if (flag === "--min-payout") {
      parsed.minGrossPayout = parseUnits(readFlagValue(flags, i, flag), USDC_DECIMALS);
      i++;
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }

  if (parsed.winProbBps <= 0n || parsed.winProbBps >= 10000n) {
    throw new Error("--win-prob-bps must be between 1 and 9999");
  }

  return parsed;
}
