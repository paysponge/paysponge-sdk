/**
 * Claude Agent SDK Integration Test
 *
 * Tests the MCP integration with Claude Agent SDK:
 * 1. Connect to SpongeWallet
 * 2. Configure MCP for Claude
 * 3. Run a Claude agent with wallet tools
 *
 * Requirements:
 *   - ANTHROPIC_API_KEY environment variable
 *   - @anthropic-ai/sdk installed (npm install @anthropic-ai/sdk)
 *
 * Run with:
 *   cd packages/spongewallet-sdk
 *   ANTHROPIC_API_KEY=sk-ant-xxx bun run examples/claude-agent.ts
 *
 * Environment variables:
 *   SPONGE_API_KEY - Your API key (optional, will use the browser auth flow if not set)
 *   SPONGE_API_URL - Backend URL (optional, defaults to production)
 *   ANTHROPIC_API_KEY - Your Anthropic API key (required)
 */

import { SpongeWallet } from "../src/index.js";

// Check for Anthropic API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required");
  console.error("Get your API key from: https://console.anthropic.com/settings/keys");
  process.exit(1);
}

async function main() {
  console.log("=".repeat(60));
  console.log("SpongeWallet SDK - Claude Agent Integration Test");
  console.log("=".repeat(60));
  console.log();

  // Connect to SpongeWallet
  console.log("1. Connecting to SpongeWallet...");
  const wallet = await SpongeWallet.connect({
    name: "Claude Agent Test",
    baseUrl: process.env.SPONGE_API_URL || undefined,
  });
  console.log("   Connected!");
  console.log(`   Agent ID: ${wallet.getAgentId()}`);
  console.log();

  // Get MCP config
  console.log("2. Getting MCP configuration...");
  const mcpConfig = wallet.mcp();
  console.log(`   MCP URL: ${mcpConfig.url}`);
  console.log();

  // Example using direct tools (without Claude Agent SDK)
  console.log("3. Testing direct tools integration...");
  const tools = await wallet.tools();
  console.log(`   Available tools: ${tools.definitions.map((t: any) => t.name).join(", ")}`);
  console.log();

  // Execute a tool directly
  console.log("4. Executing get_balance tool directly...");
  try {
    const result = await tools.execute("get_balance", { chain: "ethereum" });
    console.log("   Result:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log(`   Tool execution error: ${error.message}`);
  }
  console.log();

  // Show example of how to use with Claude Agent SDK
  console.log("5. Claude Agent SDK Usage Example:");
  console.log();
  console.log("   // Using MCP (recommended)");
  console.log("   import { query } from '@anthropic-ai/claude-agent-sdk';");
  console.log("   ");
  console.log("   for await (const msg of query({");
  console.log("     prompt: 'Check my wallet balance',");
  console.log("     options: {");
  console.log("       mcpServers: {");
  console.log("         wallet: wallet.mcp(),");
  console.log("       },");
  console.log("     },");
  console.log("   })) {");
  console.log("     console.log(msg);");
  console.log("   }");
  console.log();

  // Show example of raw Anthropic SDK usage
  console.log("6. Raw Anthropic SDK Usage Example:");
  console.log();
  console.log("   // Using direct tools (fallback for raw SDK)");
  console.log("   import Anthropic from '@anthropic-ai/sdk';");
  console.log("   ");
  console.log("   const anthropic = new Anthropic();");
  console.log("   const tools = await wallet.tools();");
  console.log("   ");
  console.log("   const response = await anthropic.messages.create({");
  console.log("     model: 'claude-sonnet-4-20250514',");
  console.log("     max_tokens: 1024,");
  console.log("     tools: tools.definitions,");
  console.log("     messages: [{ role: 'user', content: 'Check balance' }],");
  console.log("   });");
  console.log("   ");
  console.log("   if (response.stop_reason === 'tool_use') {");
  console.log("     const toolCall = response.content.find(b => b.type === 'tool_use');");
  console.log("     const result = await tools.execute(toolCall.name, toolCall.input);");
  console.log("   }");
  console.log();

  // Actually run the raw Anthropic SDK example
  console.log("7. Running live Anthropic SDK test...");
  console.log();

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: tools.definitions,
      messages: [
        {
          role: "user",
          content: "Check my wallet balance on Ethereum. Just tell me the balances you find.",
        },
      ],
    });

    console.log("   Claude's response:");
    for (const block of response.content) {
      if (block.type === "text") {
        console.log(`   ${block.text}`);
      } else if (block.type === "tool_use") {
        console.log(`   [Tool call: ${block.name}]`);
        console.log(`   Input: ${JSON.stringify(block.input)}`);

        // Execute the tool
        const result = await tools.execute(block.name, block.input);
        console.log(`   Result: ${JSON.stringify(result)}`);
      }
    }
  } catch (error: any) {
    if (error.code === "ERR_MODULE_NOT_FOUND" || error.message?.includes("Cannot find")) {
      console.log("   Skipping live test: @anthropic-ai/sdk not installed");
      console.log("   Run: npm install @anthropic-ai/sdk");
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log("Claude Agent integration test completed!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
