import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "openapi.json",
  parser: {
    filters: {
      operations: {
        include: [
          "POST /api/agents/",
          "GET /api/agents/",
          "GET /api/agents/{id}",
          "GET /api/agents/me",
          "PUT /api/agents/{id}",
          "DELETE /api/agents/{id}",
          "GET /api/wallets/",
          "GET /api/wallets/{id}",
          "GET /api/wallets/{id}/balance",
          "POST /api/transfers/evm",
          "POST /api/transfers/solana",
          "POST /api/transfers/tempo",
          "POST /api/transactions/swap",
          "GET /api/transactions/status/{txHash}",
          "GET /api/transactions/",
          "GET /api/balances",
          "GET /api/solana/tokens",
          "GET /api/solana/tokens/search",
          "GET /api/transactions/history",
          "POST /api/onramp/crypto",
          "POST /api/signup-bonus/claim",
          "POST /api/x402/payments",
        ],
      },
    },
  },
  output: {
    path: "src/api/generated/heyapi",
    importFileExtension: ".js",
  },
  plugins: [
    "@hey-api/typescript",
    {
      name: "@hey-api/sdk",
      client: true,
      operations: "flat",
      responseStyle: "data",
    },
    {
      name: "zod",
      compatibilityVersion: 3,
    },
    "@hey-api/client-fetch",
  ],
});
