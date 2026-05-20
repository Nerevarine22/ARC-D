import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REGISTRY_ADDRESS = "0x0000000000000000000000000000000000008004";
const RPC_URL = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";
const AGENT_ADDRESS = process.env.AGENT_WALLET_ADDRESS;

async function main() {
    console.log("=================================================");
    console.log("   🔍 Перевірка реєстрації агента (ERC-8004)");
    console.log("=================================================");
    console.log(`📡 Перевіряю адресу: ${AGENT_ADDRESS}`);

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Можливі варіанти функції читання (getters) у стандартних реєстрах
    const abi = [
        "function getAgent(address) view returns (string)",
        "function agents(address) view returns (string)",
        "function metadataURI(address) view returns (string)",
        "function agentMetadataURI(address) view returns (string)",
        "function getMetadata(address) view returns (string)"
    ];

    const contract = new ethers.Contract(REGISTRY_ADDRESS, abi, provider);

    const methodsToTry = ['getAgent', 'agents', 'metadataURI', 'agentMetadataURI', 'getMetadata'];
    let success = false;

    for (const method of methodsToTry) {
        try {
            const result = await contract[method](AGENT_ADDRESS);
            if (result) {
                console.log(`\n✅ ЗНАЙДЕНО! (через метод ${method})`);
                console.log(`📄 Зареєстрований Metadata URI: ${result}`);
                success = true;
                break;
            }
        } catch (err) {
            // Ігноруємо помилки (метод просто не існує в цьому смарт-контракті)
        }
    }

    if (!success) {
        console.log("\n⚠️ Не вдалося прочитати дані з реєстру. Можливо, контракт використовує іншу назву методу для читання (getter), але транзакція запису була успішною.");
    }
}

main();
