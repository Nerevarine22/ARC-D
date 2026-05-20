import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function main() {
    console.log("=================================================");
    console.log("   🚀 Ethers.js Wallet Generator (Native Agent)");
    console.log("=================================================");

    const wallet = ethers.Wallet.createRandom();
    
    console.log("\n✅ Wallet created successfully!");
    console.log("-------------------------------------------------");
    console.log(`Public Address (WATCHDOG_AGENT_ADDRESS): ${wallet.address}`);
    console.log(`Private Key    (AGENT_PRIVATE_KEY):      ${wallet.privateKey}`);
    console.log(`Mnemonic:                                ${wallet.mnemonic?.phrase}`);
    console.log("-------------------------------------------------\n");

    const envPath = path.resolve(__dirname, '../../.env');
    let envContent = "";
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Append wallet info to .env
    const newEnvLines = [
        "",
        "# Watchdog AI Wallet (Native Ethers.js EOA)",
        `AGENT_WALLET_ADDRESS="${wallet.address}"`,
        `AGENT_WALLET_PRIVATE_KEY="${wallet.privateKey}"`,
        `AGENT_WALLET_MNEMONIC="${wallet.mnemonic?.phrase}"`
    ].join('\n');

    fs.appendFileSync(envPath, newEnvLines);
    console.log(`💾 Saved to ${envPath}`);
    console.log("\n⚠️ IMPORTANT: Keep your private key safe and NEVER share it!");
}

main();
