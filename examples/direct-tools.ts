/**
 * Direct Tools Test
 *
 * Tests the direct tool integration for use with raw Anthropic SDK:
 * 1. Connect to SpongeWallet
 * 2. Get tool definitions
 * 3. Execute tools directly
 *
 * This is useful when you want more control or are using the raw
 * Anthropic SDK instead of the Claude Agent SDK.
 *
 * Run with:
 *   cd packages/spongewallet-sdk
 *   bun run examples/direct-tools.ts
 *
 * Environment variables:
 *   SPONGE_API_KEY - Your API key (optional, will use the browser auth flow if not set)
 *   SPONGE_API_URL - Backend URL (optional, defaults to production)
 */

import { SpongeWallet } from "../src/index.js";

async function main() {
  console.log("=".repeat(60));
  console.log("SpongeWallet SDK - Direct Tools Test");
  console.log("=".repeat(60));
  console.log();

  // Connect to SpongeWallet
  console.log("1. Connecting to SpongeWallet...");
  const wallet = await SpongeWallet.connect({
    name: "Direct Tools Test Agent",
    baseUrl: process.env.SPONGE_API_URL || undefined,
  });
  console.log("   Connected!");
  console.log(`   Agent ID: ${wallet.getAgentId()}`);
  console.log();

  // Get tools
  console.log("2. Getting tool definitions...");
  const tools = await wallet.tools();
  console.log(`   Found ${tools.definitions.length} tools:`);
  console.log();

  for (const tool of tools.definitions) {
    console.log(`   ${tool.name}`);
    console.log(`     Description: ${tool.description}`);
    console.log(`     Parameters: ${JSON.stringify(tool.input_schema.properties, null, 2).split("\n").join("\n     ")}`);
    console.log();
  }

  // Execute each tool
  console.log("3. Testing tool execution...");
  console.log();

  // Test get_balance
  console.log("   Testing: get_balance");
  try {
    const balanceResult = await tools.execute("get_balance", { chain: "ethereum" });
    console.log(`   Result: ${JSON.stringify(balanceResult)}`);
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  console.log();

  // Test get_transaction_history
  console.log("   Testing: get_transaction_history");
  try {
    const historyResult = await tools.execute("get_transaction_history", { limit: 5 });
    console.log(`   Result: ${JSON.stringify(historyResult)}`);
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
  }
  console.log();

  // Show Anthropic SDK integration example
  console.log("4. Example: Using with Anthropic SDK");
  console.log();
  console.log("   ```typescript");
  console.log("   import Anthropic from '@anthropic-ai/sdk';");
  console.log("   import { SpongeWallet } from '@paysponge/sdk';");
  console.log("");
  console.log("   const anthropic = new Anthropic();");
  console.log("   const wallet = await SpongeWallet.connect();");
  console.log("   const tools = await wallet.tools();");
  console.log("");
  console.log("   const messages = [{ role: 'user', content: 'Check my balance' }];");
  console.log("");
  console.log("   // Initial request");
  console.log("   let response = await anthropic.messages.create({");
  console.log("     model: 'claude-sonnet-4-20250514',");
  console.log("     max_tokens: 1024,");
  console.log("     tools: tools.definitions,");
  console.log("     messages,");
  console.log("   });");
  console.log("");
  console.log("   // Handle tool calls");
  console.log("   while (response.stop_reason === 'tool_use') {");
  console.log("     const toolUseBlock = response.content.find(b => b.type === 'tool_use');");
  console.log("     const result = await tools.execute(toolUseBlock.name, toolUseBlock.input);");
  console.log("");
  console.log("     messages.push({ role: 'assistant', content: response.content });");
  console.log("     messages.push({");
  console.log("       role: 'user',");
  console.log("       content: [{");
  console.log("         type: 'tool_result',");
  console.log("         tool_use_id: toolUseBlock.id,");
  console.log("         content: JSON.stringify(result),");
  console.log("       }],");
  console.log("     });");
  console.log("");
  console.log("     response = await anthropic.messages.create({");
  console.log("       model: 'claude-sonnet-4-20250514',");
  console.log("       max_tokens: 1024,");
  console.log("       tools: tools.definitions,");
  console.log("       messages,");
  console.log("     });");
  console.log("   }");
  console.log("");
  console.log("   console.log(response.content[0].text);");
  console.log("   ```");
  console.log();

  console.log("=".repeat(60));
  console.log("Direct tools test completed!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
