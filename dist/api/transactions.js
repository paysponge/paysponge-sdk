import { z } from "zod";
import { TransactionResultSchema, TransactionStatusSchema, TransferOptionsSchema, SwapOptionsSchema, SubmitTransactionSchema, CHAIN_IDS, } from "../types/schemas.js";
import { getApiTransactions, getApiTransactionsStatusByTxHash, postApiTransactionsSwap, postApiTransfersEvm, postApiTransfersSolana, postApiTransfersTempo, } from "./generated/heyapi/sdk.gen.js";
import { getHeyApiClient } from "./generated/heyapi-adapter.js";
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
    items: z.array(z.object({
        id: z.string(),
        txHash: z.string().nullable(),
        txStatus: z.string(),
        fromAddress: z.string(),
        toAddress: z.string(),
        value: z.string(),
        chainId: z.number(),
        txType: z.string(),
        createdAt: z.coerce.date(),
    })),
    total: z.number(),
    page: z.number(),
    perPage: z.number(),
    totalPages: z.number(),
});
export class TransactionsApi {
    http;
    agentId;
    constructor(http, agentId) {
        this.http = http;
        this.agentId = agentId;
    }
    /**
     * Transfer tokens (EVM or Solana)
     * Uses the /api/transactions/transfer endpoint
     */
    async transfer(options) {
        const validated = TransferOptionsSchema.parse(options);
        const chainId = CHAIN_IDS[validated.chain];
        if (chainId === undefined) {
            throw new Error(`Unknown chain: ${validated.chain}`);
        }
        // Solana transfers
        if (validated.chain === "solana" || validated.chain === "solana-devnet") {
            if (validated.currency !== "SOL" && validated.currency !== "USDC") {
                throw new Error(`Currency ${validated.currency} not supported on ${validated.chain}`);
            }
            const response = await postApiTransfersSolana({
                client: getHeyApiClient(this.http),
                body: {
                    chain: validated.chain,
                    to: validated.to,
                    amount: validated.amount,
                    currency: validated.currency,
                },
            });
            const parsed = SubmitTransactionSchema.parse(response);
            const status = parsed.status === "pending" || parsed.status === "submitted" ? "pending" : "confirmed";
            return TransactionResultSchema.parse({
                txHash: parsed.transactionHash,
                status,
                explorerUrl: parsed.explorerUrl,
                chainId,
            });
        }
        // Tempo pathUSD transfers
        if (validated.chain === "tempo" || validated.chain === "tempo-mainnet" || validated.currency === "pathUSD") {
            if ((validated.chain !== "tempo" && validated.chain !== "tempo-mainnet") || validated.currency !== "pathUSD") {
                throw new Error("pathUSD transfers are only supported on Tempo chains");
            }
            const response = await postApiTransfersTempo({
                client: getHeyApiClient(this.http),
                body: {
                    chain: validated.chain,
                    to: validated.to,
                    amount: validated.amount,
                    use_gas_sponsorship: true,
                },
            });
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
        if (validated.currency !== "ETH" && validated.currency !== "USDC") {
            throw new Error(`Currency ${validated.currency} not supported on ${validated.chain}`);
        }
        const response = await postApiTransfersEvm({
            client: getHeyApiClient(this.http),
            body: {
                chain: validated.chain,
                to: validated.to,
                amount: validated.amount,
                currency: validated.currency,
            },
        });
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
    async swap(options) {
        const validated = SwapOptionsSchema.parse(options);
        const response = await postApiTransactionsSwap({
            client: getHeyApiClient(this.http),
            body: {
                chain: validated.chain,
                inputToken: validated.from,
                outputToken: validated.to,
                amount: validated.amount,
                slippageBps: validated.slippageBps,
            },
        });
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
    async getStatus(txHash, chain) {
        const params = {
            chain,
        };
        const response = await getApiTransactionsStatusByTxHash({
            client: getHeyApiClient(this.http),
            path: { txHash },
            query: params,
        });
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
    async getHistory(options) {
        const params = {
            agentId: this.agentId,
        };
        if (options?.limit !== undefined) {
            params.limit = options.limit.toString();
        }
        if (options?.offset !== undefined) {
            params.offset = options.offset.toString();
        }
        const response = await getApiTransactions({
            client: getHeyApiClient(this.http),
            query: params,
        });
        const parsed = TransactionHistoryResponseSchema.parse(response);
        return parsed.items.map((tx) => ({
            txHash: tx.txHash ?? "",
            status: tx.txStatus,
            blockNumber: null,
            confirmations: null,
            errorMessage: null,
        }));
    }
}
//# sourceMappingURL=transactions.js.map