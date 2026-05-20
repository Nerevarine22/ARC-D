import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const RPC_URL = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";
// Хеш нашої успішної транзакції реєстрації
const TX_HASH = "0x8f70e1d484128ce7a9a43e1de031791436f24dc6e3234e8372d943317cdc681a";

async function main() {
    console.log("=================================================");
    console.log("   🔍 Пошук Agent ID у логах транзакції");
    console.log("=================================================");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log(`📡 Завантажую чек (receipt) для транзакції: ${TX_HASH}...`);

    try {
        const receipt = await provider.getTransactionReceipt(TX_HASH);
        if (!receipt) {
            console.error("❌ Транзакцію не знайдено. Можливо RPC трохи відстає.");
            process.exit(1);
        }

        console.log(`✅ Транзакція знайдена у блоці ${receipt.blockNumber}`);
        console.log(`📋 Знайдено логів (подій): ${receipt.logs.length}\n`);

        receipt.logs.forEach((log, index) => {
            console.log(`--- Event Log #${index} ---`);
            console.log(`Address: ${log.address}`);
            console.log(`Topics (Indexed args):`);
            log.topics.forEach((topic, tIdx) => {
                // Спробуємо конвертувати у число, якщо це схоже на ID (наприклад, topic[1] або topic[2])
                let decimalHint = "";
                if (tIdx > 0 && topic !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                    try {
                        const asNum = BigInt(topic).toString();
                        if (asNum.length < 20) { // Якщо це не адреса, а число
                            decimalHint = ` -> (Decimal: ${asNum})`;
                        }
                    } catch (e) {}
                }
                console.log(`  [${tIdx}]: ${topic}${decimalHint}`);
            });
            console.log(`Data (Non-indexed): ${log.data}\n`);
        });

    } catch (err) {
        console.error("❌ Помилка при завантаженні:", err.message);
    }
}

main();
