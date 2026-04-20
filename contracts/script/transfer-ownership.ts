/**
 * Transfer ownership of all Clawclick ecosystem contracts to multisig SAFE
 * Base Mainnet: 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
 */

import { ethers } from "ethers";
import * as readline from "readline";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const NEW_OWNER = "0xFf7549B06E68186C91a6737bc0f0CDE1245e349b"; // Multisig SAFE

const CONTRACTS = {
  Config: "0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7",
  Hook: "0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8",
  Factory: "0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a",
  BootstrapETH: "0xE2649737D3005c511a27DF6388871a12bE0a2d30",
  BirthCert: "0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B",
  MemoryStorage: "0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D",
  LaunchBundler: "0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268",
  ProductionClaw: "0xBbB04538530970f3409e3844bF99475b5324912e", // 🔷 BASE Production
};

const RPC_URL = "https://mainnet.base.org";

// ═══════════════════════════════════════════════════════════════════════════
// OWNABLE ABI
// ═══════════════════════════════════════════════════════════════════════════

const OWNABLE_ABI = [
  "function owner() external view returns (address)",
  "function transferOwnership(address newOwner) external",
  "function renounceOwnership() external",
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function checkCurrentOwner(
  contract: ethers.Contract,
  name: string
): Promise<string> {
  try {
    const owner = await contract.owner();
    console.log(`  ✅ Current owner: ${owner}`);
    return owner;
  } catch (error) {
    console.log(`  ❌ Failed to read owner (not Ownable or error)`);
    return "";
  }
}

async function transferOwnership(
  contract: ethers.Contract,
  name: string,
  newOwner: string
) {
  try {
    console.log(`\n🔄 Transferring ${name}...`);
    const tx = await contract.transferOwnership(newOwner);
    console.log(`  📝 TX hash: ${tx.hash}`);
    console.log(`  ⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`  ✅ Confirmed in block ${receipt.blockNumber}`);
    return true;
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  🔐 CLAWCLICK OWNERSHIP TRANSFER                              ║");
  console.log("║  Base Mainnet → Multisig SAFE                                 ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log(`🎯 New Owner (SAFE): ${NEW_OWNER}\n`);

  // ═══════ STEP 1: Verify checksummed address ═══════
  const checksummed = ethers.getAddress(NEW_OWNER);
  if (checksummed !== NEW_OWNER) {
    console.log(`⚠️  Address checksum mismatch!`);
    console.log(`   Input:  ${NEW_OWNER}`);
    console.log(`   Correct: ${checksummed}`);
    console.log(`\n❌ Please update NEW_OWNER to use checksummed address.\n`);
    return;
  }

  console.log(`✅ Address checksum valid\n`);

  // ═══════ STEP 2: Connect provider ═══════
  console.log(`🔌 Connecting to Base Mainnet...`);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  console.log(`✅ Connected to chain ID: ${network.chainId}\n`);

  if (network.chainId !== 8453n) {
    console.log(`❌ Wrong network! Expected Base (8453), got ${network.chainId}\n`);
    return;
  }

  // ═══════ STEP 3: Get private key ═══════
  const privateKey = await prompt("🔑 Enter your private key (deployer wallet): ");
  if (!privateKey || privateKey.length < 64) {
    console.log(`\n❌ Invalid private key\n`);
    return;
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`\n👤 Deployer wallet: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    console.log(`❌ No ETH for gas fees!\n`);
    return;
  }

  // ═══════ STEP 4: Check current ownership ═══════
  console.log(`\n📋 Checking current ownership...\n`);

  const ownableContracts: Array<{
    name: string;
    address: string;
    currentOwner: string;
    contract: ethers.Contract;
  }> = [];

  for (const [name, address] of Object.entries(CONTRACTS)) {
    console.log(`🔍 ${name}: ${address}`);
    const contract = new ethers.Contract(address, OWNABLE_ABI, wallet);
    const currentOwner = await checkCurrentOwner(contract, name);

    if (currentOwner) {
      if (currentOwner.toLowerCase() === wallet.address.toLowerCase()) {
        ownableContracts.push({ name, address, currentOwner, contract });
      } else if (currentOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
        console.log(`  ℹ️  Already owned by SAFE (skipping)`);
      } else {
        console.log(
          `  ⚠️  Owned by different address: ${currentOwner} (you are not owner!)`
        );
      }
    }
  }

  if (ownableContracts.length === 0) {
    console.log(`\n❌ No contracts found where you are the owner.\n`);
    return;
  }

  console.log(`\n✅ Found ${ownableContracts.length} contracts to transfer:\n`);
  ownableContracts.forEach((c) => console.log(`   • ${c.name}`));

  // ═══════ STEP 5: Confirm transfer ═══════
  const confirm = await prompt(
    `\n⚠️  Transfer ownership of ${ownableContracts.length} contract(s) to SAFE? (yes/no): `
  );

  if (confirm.toLowerCase() !== "yes") {
    console.log(`\n❌ Aborted by user\n`);
    return;
  }

  // ═══════ STEP 6: Execute transfers ═══════
  console.log(`\n🚀 Executing transfers...\n`);

  const results: Array<{ name: string; success: boolean }> = [];

  for (const { name, contract } of ownableContracts) {
    const success = await transferOwnership(contract, name, NEW_OWNER);
    results.push({ name, success });

    // Wait 2s between transactions to avoid nonce issues
    if (ownableContracts.indexOf({ name, contract } as any) < ownableContracts.length - 1) {
      console.log(`  ⏳ Waiting 2s before next transfer...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // ═══════ STEP 7: Summary ═══════
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  📊 TRANSFER SUMMARY                                           ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);

  results.forEach((r) => {
    console.log(`   ${r.success ? "✅" : "❌"} ${r.name}`);
  });

  if (failed > 0) {
    console.log(
      `\n⚠️  Some transfers failed. Check errors above and retry manually.\n`
    );
  } else {
    console.log(`\n🎉 All contracts successfully transferred to SAFE!\n`);
    console.log(`🔐 New owner: ${NEW_OWNER}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
