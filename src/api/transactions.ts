import { z } from "zod";
import {
  TransactionResultSchema,
  TransactionStatusSchema,
  TransferOptionsSchema,
  SwapOptionsSchema,
  TempoSwapOptionsSchema,
  SubmitTransactionSchema,
  CHAIN_IDS,
  type TransactionResult,
  type TransactionStatus,
  type TransferOptions,
  type SwapOptions,
  type TempoSwapOptions,
  type Chain,
} from "../types/schemas.js";
import type { HttpClient } from "./http.js";
import { createGeneratedApiClient } from "./generated/openapi-adapter.js";

// Swap response from API
const SwapResponseSchema = z.object({
  signature: z.string(),
  inputToken: z.string(),
  outputToken: z.string(),
  inputAmount: z.string(),
  outputAmount: z.string(),
  explorerUrl: z.string().optional(),
});

// Transaction status response from API
const TransactionStatusResponseSchema = z.object({
  transactionHash: z.string(),
  status: z.enum(["pending", "confirmed", "failed"]),
  confirmations: z.number().nullable(),
  blockNumber: z.number().nullable(),
  gasUsed: z.string().nullable(),
  effectiveGasPrice: z.string().nullable(),
});

// Transaction history response from API
const TransactionHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      txHash: z.string().nullable(),
      txStatus: z.string(),
      fromAddress: z.string(),
      toAddress: z.string(),
      value: z.string(),
      chainId: z.number(),
      txType: z.string(),
      createdAt: z.coerce.date(),
    })
  ),
  total: z.number(),
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
});

export class TransactionsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly agentId: string
  ) {}

  private normalizeCurrencySymbol(currency: string): string {
    return currency.trim().toUpperCase();
  }

  /**
   * Transfer tokens (EVM or Solana)
   * Uses the /api/transactions/transfer endpoint
   */
  async transfer(options: TransferOptions): Promise<TransactionResult> {
    const client = createGeneratedApiClient(this.http);
    const validated = TransferOptionsSchema.parse(options);

    const chainId = CHAIN_IDS[validated.chain];
    if (chainId === undefined) {
      throw new Error(`Unknown chain: ${validated.chain}`);
    }

    // Solana transfers
    if (validated.chain === "solana" || validated.chain === "solana-devnet") {
      const normalizedCurrency = this.normalizeCurrencySymbol(validated.currency ?? "");
      if (normalizedCurrency !== "SOL" && normalizedCurrency !== "USDC") {
        throw new Error(`Currency ${validated.currency} not supported on ${validated.chain}`);
      }

      const response = await client.request(
        client.api.postApiTransfersSolanaRequestOpts({
          postApiTransfersSolanaRequest: {
            chain: validated.chain,
            to: validated.to,
            amount: validated.amount,
            currency: normalizedCurrency,
          },
        }),
      );

      const parsed = SubmitTransactionSchema.parse(response);
      const status = parsed.status === "pending" || parsed.status === "submitted" ? "pending" : "confirmed";
      return TransactionResultSchema.parse({
        txHash: parsed.transactionHash,
        status,
        explorerUrl: parsed.explorerUrl,
        chainId,
      });
    }

    // Tempo TIP-20 transfers
    if (validated.chain === "tempo-testnet" || validated.chain === "tempo") {
      const tempoToken = validated.token ?? validated.currency;
      if (!tempoToken) {
        throw new Error(`A Tempo token symbol or contract address is required on ${validated.chain}`);
      }

      const response = await client.request(
        client.api.postApiTransfersTempoRequestOpts({
          postApiTransfersTempoRequest: {
            chain: validated.chain,
            to: validated.to,
            amount: validated.amount,
            token: tempoToken,
          },
        }),
      );

      const parsed = SubmitTransactionSchema.parse(response);
      const status = parsed.status === "pending" || parsed.status === "submitted" ? "pending" : "confirmed";
      return TransactionResultSchema.parse({
        txHash: parsed.transactionHash,
        status,
        explorerUrl: parsed.explorerUrl,
        chainId,
      });
    }

    // EVM transfers
    const normalizedCurrency = this.normalizeCurrencySymbol(validated.currency ?? "");
    if (normalizedCurrency !== "ETH" && normalizedCurrency !== "MON" && normalizedCurrency !== "POL" && normalizedCurrency !== "USDC") {
      throw new Error(`Currency ${validated.currency} not supported on ${validated.chain}`);
    }

    const response = await client.request(
      client.api.postApiTransfersEvmRequestOpts({
        postApiTransfersEvmRequest: {
          chain: validated.chain,
          to: validated.to,
          amount: validated.amount,
          currency: normalizedCurrency,
        },
      }),
    );

    const parsed = SubmitTransactionSchema.parse(response);
    const status = parsed.status === "pending" || parsed.status === "submitted" ? "pending" : "confirmed";
    return TransactionResultSchema.parse({
      txHash: parsed.transactionHash,
      status,
      explorerUrl: parsed.explorerUrl,
      chainId,
    });
  }

  /**
   * Swap tokens (Solana via Jupiter)
   * Uses the /api/transactions/swap endpoint
   */
  async swap(options: SwapOptions): Promise<TransactionResult> {
    const client = createGeneratedApiClient(this.http);
    const validated = SwapOptionsSchema.parse(options);

    const response = await client.request(
      client.api.postApiTransactionsSwapRequestOpts({
        postApiTransactionsSwapRequest: {
          chain: validated.chain,
          inputToken: validated.from,
          outputToken: validated.to,
          amount: validated.amount,
          slippageBps: validated.slippageBps,
        },
      }),
    );

    const parsed = SwapResponseSchema.parse(response);

    return TransactionResultSchema.parse({
      txHash: parsed.signature,
      status: "confirmed",
      explorerUrl: parsed.explorerUrl,
    });
  }

  /**
   * Swap stablecoins on Tempo via the native StablecoinExchange DEX
   * Uses the /api/transactions/tempo-swap endpoint
   */
  async tempoSwap(options: TempoSwapOptions): Promise<TransactionResult> {
    const client = createGeneratedApiClient(this.http);
    const validated = TempoSwapOptionsSchema.parse(options);

    const response = await client.request(
      client.api.postApiTransactionsTempoSwapRequestOpts({
        postApiTransactionsSwapRequest: {
          chain: validated.chain,
          inputToken: validated.from,
          outputToken: validated.to,
          amount: validated.amount,
          slippageBps: validated.slippageBps,
        },
      }),
    );

    const parsed = SwapResponseSchema.parse(response);

    return TransactionResultSchema.parse({
      txHash: parsed.signature,
      status: "confirmed",
      explorerUrl: parsed.explorerUrl,
    });
  }

  /**
   * Get transaction status
   * Uses the /api/transactions/status/:txHash endpoint
   */
  async getStatus(txHash: string, chain: Chain): Promise<TransactionStatus> {
    const client = createGeneratedApiClient(this.http);
    const params: { chain: Chain } = {
      chain,
    };

    const response = await client.request(
      client.api.getApiTransactionsStatusByTxHashRequestOpts({
        txHash,
        ...params,
      }),
    );

    const parsed = TransactionStatusResponseSchema.parse(response);

    return TransactionStatusSchema.parse({
      txHash: parsed.transactionHash,
      status: parsed.status,
      blockNumber: parsed.blockNumber,
      confirmations: parsed.confirmations,
      errorMessage: null,
    });
  }

  /**
   * Get transaction history
   */
  async getHistory(
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<TransactionStatus[]> {
    const client = createGeneratedApiClient(this.http);
    const params: Record<string, string> = {
      agentId: this.agentId,
    };
    if (options?.limit !== undefined) {
      params.limit = options.limit.toString();
    }
    if (options?.offset !== undefined) {
      params.offset = options.offset.toString();
    }

    const response = await client.request(
      client.api.getApiTransactionsRequestOpts(params),
    );
    const parsed = TransactionHistoryResponseSchema.parse(response);

    return parsed.items.map((tx) => ({
      txHash: tx.txHash ?? "",
      status: tx.txStatus as "pending" | "confirmed" | "failed" | "unknown",
      blockNumber: null,
      confirmations: null,
      errorMessage: null,
    }));
  }
}
