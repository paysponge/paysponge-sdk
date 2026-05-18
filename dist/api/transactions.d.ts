import { type TransactionResult, type TransactionStatus, type TransferOptions, type SendTransactionOptions, type SwapOptions, type TempoSwapOptions, type Chain } from "../types/schemas.js";
import type { HttpClient } from "./http.js";
export declare class TransactionsApi {
    private readonly http;
    private readonly agentId;
    constructor(http: HttpClient, agentId: string);
    private normalizeCurrencySymbol;
    /**
     * Transfer tokens (EVM or Solana)
     * Uses the /api/transactions/transfer endpoint
     */
    transfer(options: TransferOptions): Promise<TransactionResult>;
    /**
     * Send a native EVM transaction, including arbitrary calldata for contract calls.
     */
    sendTransaction(options: SendTransactionOptions): Promise<TransactionResult>;
    /**
     * Swap tokens (Solana via Jupiter)
     * Uses the /api/transactions/swap endpoint
     */
    swap(options: SwapOptions): Promise<TransactionResult>;
    /**
     * Swap stablecoins on Tempo via the native StablecoinExchange DEX
     * Uses the /api/transactions/tempo-swap endpoint
     */
    tempoSwap(options: TempoSwapOptions): Promise<TransactionResult>;
    /**
     * Get transaction status
     * Uses the /api/transactions/status/:txHash endpoint
     */
    getStatus(txHash: string, chain: Chain): Promise<TransactionStatus>;
    /**
     * Get transaction history
     */
    getHistory(options?: {
        limit?: number;
        offset?: number;
    }): Promise<TransactionStatus[]>;
}
//# sourceMappingURL=transactions.d.ts.map