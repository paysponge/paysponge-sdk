# Authentication

## Auth Methods

The SDK supports three ways to authenticate:

### 1. Device Flow (interactive)

On first use, `SpongeWallet.connect()` starts the OAuth Device Flow:

1. SDK requests a device code from the backend
2. A code like `ABCD-1234` is displayed in your terminal (and copied to clipboard)
3. Your browser opens to the approval page
4. You log in and approve the connection
5. The SDK receives an API key and caches it locally

```typescript
// Triggers device flow if no key is found
const wallet = await SpongeWallet.connect();
```

### 2. API Key (non-interactive)

Pass an API key directly to skip the device flow:

```typescript
const wallet = await SpongeWallet.connect({
  apiKey: "sponge_test_...",
});
```

Or use the environment variable:

```bash
export SPONGE_API_KEY=sponge_test_...
```

### 3. Master Key (for REST automation)

```typescript
const masterKey = process.env.SPONGE_MASTER_KEY;
```

Or use the environment variable:

```bash
export SPONGE_MASTER_KEY=sponge_master_...
```

## Key Types

| Key Prefix | Type | Scope | Created By |
|------------|------|-------|------------|
| `sponge_test_` | Agent key (test) | Single agent, test mode | Agent creation or device flow |
| `sponge_live_` | Agent key (live) | Single agent, live mode | Agent creation or device flow |
| `sponge_master_` | Master key | User-level, can create agents | API |

## Credential Storage

After device flow auth, credentials are saved to `~/.spongewallet/credentials.json` with `0600` permissions (owner read/write only).

```json
{
  "apiKey": "sponge_test_...",
  "agentId": "uuid-...",
  "agentName": "My Bot",
  "testnet": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### Managing Credentials

```typescript
import {
  hasCredentials,
  loadCredentials,
  deleteCredentials,
  getCredentialsPath,
} from "@spongewallet/sdk";

// Check
if (hasCredentials()) {
  const creds = loadCredentials();
  console.log(creds?.agentId);
}

// Clear
deleteCredentials();

// Path
console.log(getCredentialsPath()); // ~/.spongewallet/credentials.json
```

## CLI

The SDK ships a CLI for auth management:

```bash
# Login (starts device flow)
npx spongewallet login

# Login for testnet
npx spongewallet login --testnet

# Check status
npx spongewallet whoami

# Logout
npx spongewallet logout
```
