# Sponge + Variance HyperEVM Example

Standalone example for using the SpongeWallet SDK with the Variance vault on HyperEVM mainnet.

It demonstrates:

- reading Variance vault state on HyperEVM chain `999`
- depositing HyperEVM USDC into the Variance vault
- placing a Variance bet through `placeBet`
- waiting for approval confirmation before the vault call
- waiting for bet settlement and printing win/loss plus payout
- checking an existing bet by id

## Contract Constants

```txt
chain:       hyperevm / 999
vault proxy: 0xc1a018fd2995EBc7890dfFf196dEC2cEE75C7dbE
USDC:        0xb88339CB7199b77E23DB6E890353E22632Ba630f
RPC:         https://rpc.hyperliquid.xyz/evm
explorer:    https://app.hyperliquid.xyz/explorer
```

The script talks to the UUPS proxy, not the implementation contract.

## Install

```bash
bun install
```

For gist usage, keep the `@paysponge/sdk` dependency in `package.json`.

Inside the Sponge monorepo, you can also run the example from `mobwallet/packages/spongewallet-sdk`:

```bash
bun run examples/variance/index.ts bet 0.01
```

## Configure

Set your Sponge API key before executing transactions:

```bash
export SPONGE_API_KEY=sponge_live_xxx
```

Optional:

```bash
export SPONGE_API_URL=https://api.paysponge.com
```

Do not commit real API keys. If you need quick local testing, `index.ts` has a `HARD_CODED_SPONGE_API_KEY` constant, but leave it empty before sharing the gist.

## Dry Runs

Dry runs do not use your Sponge API key. They only read the vault and print a concise plan.

```bash
bun run index.ts deposit 1
bun run index.ts bet 0.01
bun run index.ts bet 0.01 --win-prob-bps 2500 --min-payout 0.039
```

Use `--debug` to print raw calldata and full vault state:

```bash
bun run index.ts bet 0.01 --debug
```

## Execute

Deposit `0.1` USDC:

```bash
SPONGE_API_KEY=sponge_live_xxx bun run index.ts deposit 0.1 --execute
```

Place a `0.01` USDC bet:

```bash
SPONGE_API_KEY=sponge_live_xxx bun run index.ts bet 0.01 --execute
```

Place a lower-probability, higher-payout bet:

```bash
SPONGE_API_KEY=sponge_live_xxx bun run index.ts bet 0.01 --win-prob-bps 2500 --min-payout 0.039 --execute
```

`winProbBps` is the effective odds input:

```txt
5000 bps = 50% win chance ~= 2x gross payout before edge
2500 bps = 25% win chance ~= 4x gross payout before edge
1000 bps = 10% win chance ~= 10x gross payout before edge
```

The vault currently has an edge, so actual payout is lower than the naive multiple. `--min-payout` is a slippage guard.

## Check A Bet

```bash
bun run index.ts check 230
```

Example output:

```txt
Bet #230
Status:      settled
Stake:       0.01 USDC
Max payout:  0.0197 USDC
Win chance:  50%
Outcome:     won
Payout:      0.0197 USDC
Settlement:  https://app.hyperliquid.xyz/explorer/tx/0x...
```

## Settlement

`placeBet` creates the bet. Variance settlement is a later transaction. In current mainnet behavior, a Variance keeper settles shortly after placement.

When you run `bet ... --execute`, this script waits for:

1. the USDC approval transaction
2. the vault `placeBet` transaction
3. the settlement event for the created bet

If no settlement appears within 120 seconds, the script exits with a timeout.

## Gas And Funding Requirements

The Sponge HyperEVM wallet needs:

- HyperEVM USDC for the deposit or stake
- HYPE for gas, or a funded Sponge gas sponsor on HyperEVM
- allowlist access in the Variance vault while `allowlistEnabled` is true

The script prints the executing wallet's USDC/HYPE balance and allowlist status before submitting transactions.

## Claude Agent SDK Integration

The same flow can be exposed as a Claude tool. Keep Sponge as the wallet layer and let the Claude agent decide when to call deposit, bet, or check.

Example shape:

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const tools = {
  variance_bet: async ({ amount, winProbBps }: { amount: string; winProbBps?: number }) => {
    const args = ["run", "index.ts", "bet", amount, "--execute"];
    if (winProbBps) {
      args.push("--win-prob-bps", String(winProbBps));
    }

    const proc = Bun.spawn(["bun", ...args], {
      env: { ...process.env, SPONGE_API_KEY: process.env.SPONGE_API_KEY! },
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(stderr || stdout);
    }

    return stdout;
  },
  variance_check: async ({ betId }: { betId: number }) => {
    const proc = Bun.spawn(["bun", "run", "index.ts", "check", String(betId)], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(stderr || stdout);
    }

    return stdout;
  },
};

for await (const message of query({
  prompt: "Place a 0.01 USDC 50/50 Variance bet, then report the settlement result.",
  options: {
    // Register tools with your Claude Agent SDK tool adapter here.
  },
})) {
  console.log(message);
}
```

In production, do not shell out from the tool. Move the logic from `index.ts` into exported functions like `placeVarianceBet`, `depositVariance`, and `checkVarianceBet`, then register those functions directly as Claude tools.

The important integration boundary is:

- Claude decides intent and parameters.
- Sponge signs/submits the HyperEVM transactions.
- Variance settles the bet on-chain.
- Your tool returns the settlement tx, payout, and win/loss result to the agent.
