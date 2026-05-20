import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REGISTRY_ADDRESS = "0x0000000000000000000000000000000000008004";
const METADATA_CID = "bafkreieb67w36hkdguqbhqlgw4oonefvc43yxw2l3ztfreccd6cwvkowou";
const RPC_URL = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";

async function main() {
    console.log("=================================================");
    console.log("   🚀 ERC-8004 Agent Registration");
    console.log("=================================================");

    const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY;
    if (!privateKey) {
        console.error("❌ AGENT_WALLET_PRIVATE_KEY not found in .env");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`📡 Connected Agent Wallet: ${wallet.address}`);
    console.log(`🏦 Identity Registry (ERC-8004): ${REGISTRY_ADDRESS}`);
    console.log(`📄 Metadata URI: ipfs://${METADATA_CID}`);

    // Ми не маємо точного ABI, тому спробуємо два найпопулярніших варіанти
    const abi = [
        "function register(string metadataURI) external",
        "function registerAgent(string metadataURI) external"
    ];

    const contract = new ethers.Contract(REGISTRY_ADDRESS, abi, wallet);

    try {
        console.log("\n⏳ Викликаю register(string) на блокчейні...");
        const tx = await contract.register(`ipfs://${METADATA_CID}`);
        console.log(`🔄 Транзакція відправлена! Hash: ${tx.hash}`);
        console.log("⏳ Чекаю підтвердження майнерами...");
        const receipt = await tx.wait(1);
        console.log(`✅ УСПІХ! Агент зареєстрований у блоці ${receipt.blockNumber}!`);
    } catch (err) {
        console.warn(`⚠️ Метод register() не підійшов або сталася помилка: ${err.message || err.shortMessage}`);
        console.log("\n⏳ Пробую альтернативний метод registerAgent(string)...");
        try {
            const tx2 = await contract.registerAgent(`ipfs://${METADATA_CID}`);
            console.log(`🔄 Транзакція відправлена! Hash: ${tx2.hash}`);
            const receipt2 = await tx2.wait(1);
            console.log(`✅ УСПІХ! Агент зареєстрований у блоці ${receipt2.blockNumber}!`);
        } catch (err2) {
             console.error("❌ Не вдалося зареєструвати агента. Перевір баланс гаманця (Testnet ARC), або ABI контракту.");
             console.error(err2.shortMessage || err2.message);
        }
    }
}

main();
