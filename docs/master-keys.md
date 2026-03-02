# Master Keys

Master API keys are user-scoped keys for programmatic agent management.

`@paysponge/sdk` does not expose a dedicated `SpongeAdmin` client.
Use master keys with backend REST endpoints directly.

## Create Agent with a Master Key

```typescript
const response = await fetch("https://api.wallet.paysponge.com/api/agents/", {
  method: "POST",
  headers: {
    Authorization: "Bearer sponge_master_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "trading-bot",
    description: "Automated strategy",
  }),
});

const { agent, apiKey } = await response.json();
```

The returned `apiKey` is agent-scoped (`sponge_test_...` or `sponge_live_...`) and can be used with `SpongeWallet.connect({ apiKey })`.

## Key Prefixes

| Prefix | Scope | Description |
|--------|-------|-------------|
| `sponge_master_` | User | Can create/list/delete agents |
| `sponge_test_` | Agent | Full access to one agent (test mode) |
| `sponge_live_` | Agent | Full access to one agent (live mode) |
