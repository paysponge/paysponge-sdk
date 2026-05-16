import { describe, expect, it, vi } from "vitest";
import { SpongePlatform } from "../src/platform.js";

describe("SpongePlatform banking", () => {
  it("returns null when no bank customer exists yet", async () => {
    const platform = await SpongePlatform.connect({
      apiKey: "sponge_master_123",
    });

    (platform as any).http.get = vi.fn().mockResolvedValue({ onboarded: false });

    const customer = await platform.getBankCustomer();

    expect(customer).toBeNull();
    expect((platform as any).http.get).toHaveBeenCalledWith("/api/bank/status", {
      agentId: undefined,
    });
  });

  it("creates KYC links and links external accounts", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        kyc_url: "https://bank.example/kyc",
        customer: {
          id: "customer_local",
          bridgeCustomerId: "bridge_customer_123",
          kycLinkId: "kyc_123",
          status: "active",
          kycStatus: "approved",
          tosStatus: "approved",
          hasAcceptedTermsOfService: true,
          capabilities: { fiat: "active" },
          endorsements: [],
          requestedWalletId: null,
          requestedAt: null,
          livemode: false,
          hostedLinkUrl: "https://bank.example/hosted",
          tosLinkUrl: null,
          customerType: "individual",
          updatedAt: "2026-03-25T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        account: {
          id: "external_local",
          bridgeExternalAccountId: "bank_123",
          bridgeCustomerId: "bridge_customer_123",
          currency: "usd",
          last4: "6789",
          active: true,
          livemode: false,
          bankName: "Chase",
          accountType: "checking",
          accountOwnerType: null,
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z",
        },
      });

    const platform = await SpongePlatform.connect({
      apiKey: "sponge_master_123",
    });

    (platform as any).http.post = post;

    const link = await platform.createBankKycLink({
      walletId: "wallet_123",
      redirectUri: "https://app.example/callback",
      customerType: "individual",
    });

    const account = await platform.createBankExternalAccount({
      customerId: "bridge_customer_123",
      bankName: "Chase",
      accountOwnerName: "Jane Smith",
      routingNumber: "021000021",
      accountNumber: "123456789",
      checkingOrSavings: "checking",
      streetLine1: "123 Main St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
    });

    expect(link.url).toBe("https://bank.example/kyc");
    expect(account.bridgeExternalAccountId).toBe("bank_123");
    expect(post).toHaveBeenNthCalledWith(1, "/api/bank/onboard", {
      wallet_id: "wallet_123",
      redirect_uri: "https://app.example/callback",
      customer_type: "individual",
      signed_agreement_id: undefined,
      agentId: undefined,
    });
    expect(post).toHaveBeenNthCalledWith(2, "/api/bank/external-accounts", {
      bank_name: "Chase",
      account_owner_name: "Jane Smith",
      routing_number: "021000021",
      account_number: "123456789",
      checking_or_savings: "checking",
      street_line_1: "123 Main St",
      street_line_2: undefined,
      city: "San Francisco",
      state: "CA",
      postal_code: "94105",
      agentId: undefined,
    });
  });

  it("creates virtual accounts and transfers, and treats missing virtual accounts as null", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ found: false, message: "No virtual account" })
      .mockResolvedValueOnce({
        count: 1,
        transfers: [
          {
            id: "transfer_local",
            bridgeTransferId: "transfer_123",
            bridgeCustomerId: "bridge_customer_123",
            bridgeExternalAccountId: "bank_123",
            walletId: "wallet_123",
            status: "funding_submitted",
            amount: "100.00",
            sourceCurrency: "usdc",
            sourcePaymentRail: "base",
            destinationCurrency: "usd",
            destinationPaymentRail: "ach",
            fundingTxHash: null,
            fundingExplorerUrl: null,
            failureReason: null,
            receiptUrl: null,
            depositInstructions: null,
            isStaticTemplate: false,
            livemode: false,
            createdAt: "2026-03-25T00:00:00.000Z",
            updatedAt: "2026-03-25T00:00:00.000Z",
          },
        ],
      });
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        virtual_account: {
          id: "virtual_local",
          bridgeVirtualAccountId: "va_123",
          bridgeCustomerId: "bridge_customer_123",
          walletId: "wallet_123",
          status: "active",
          sourceCurrency: "usd",
          destinationCurrency: "usdc",
          destinationPaymentRail: "base",
          destinationAddress: "0xabc",
          depositInstructions: { accountNumber: "123456789" },
          activities: [],
          accountReadyNotifiedAt: null,
          livemode: false,
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        transfer: {
          id: "transfer_local",
          bridgeTransferId: "transfer_123",
          bridgeCustomerId: "bridge_customer_123",
          bridgeExternalAccountId: "bank_123",
          walletId: "wallet_123",
          status: "funding_submitted",
          amount: "100.00",
          sourceCurrency: "usdc",
          sourcePaymentRail: "base",
          destinationCurrency: "usd",
          destinationPaymentRail: "ach",
          fundingTxHash: null,
          fundingExplorerUrl: null,
          failureReason: null,
          receiptUrl: null,
          depositInstructions: null,
          isStaticTemplate: false,
          livemode: false,
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z",
        },
      });

    const platform = await SpongePlatform.connect({
      apiKey: "sponge_master_123",
    });

    (platform as any).http.get = get;
    (platform as any).http.post = post;

    const missingAccount = await platform.getBankVirtualAccount("wallet_123");
    const virtualAccount = await platform.createBankVirtualAccount("wallet_123");
    const transfer = await platform.createBankTransfer({
      walletId: "wallet_123",
      externalAccountId: "external_local",
      amount: "100.00",
    });
    const transfers = await platform.listBankTransfers();

    expect(missingAccount).toBeNull();
    expect(virtualAccount.bridgeVirtualAccountId).toBe("va_123");
    expect(transfer.bridgeTransferId).toBe("transfer_123");
    expect(transfers).toHaveLength(1);
    expect(post).toHaveBeenNthCalledWith(
      1,
      "/api/bank/virtual-account",
      { wallet_id: "wallet_123", agentId: undefined }
    );
    expect(post).toHaveBeenNthCalledWith(2, "/api/bank/send", {
      wallet_id: "wallet_123",
      external_account_id: "external_local",
      amount: "100.00",
      payment_rail: undefined,
      agentId: undefined,
    });
    expect(get).toHaveBeenNthCalledWith(2, "/api/bank/transfers", {
      transfer_id: undefined,
      agentId: undefined,
    });
  });
});
