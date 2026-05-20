import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const RPC_URL = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";
const AGENT_ADDRESS = process.env.AGENT_WALLET_ADDRESS;
const AGENT_PRIVATE_KEY = process.env.AGENT_WALLET_PRIVATE_KEY;
const JOB_REGISTRY_ADDRESS = process.env.JOB_REGISTRY_ADDRESS || "0x0747EEf0706327138c69792bF28Cd525089e4583";

// Load ABI
const ABI_PATH = path.resolve(__dirname, '../../AgenticCommerceABI.json');
const AGENTIC_COMMERCE_ABI = JSON.parse(fs.readFileSync(ABI_PATH, 'utf-8'));

async function main() {
    console.log("=================================================");
    console.log("   🧪 Створення Тестового Таска (Inbound Job)");
    console.log("=================================================");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    // Використаємо гаманець агента як КЛІЄНТА, щоб він сам для себе створив таск (для тесту)
    const clientWallet = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(JOB_REGISTRY_ADDRESS, AGENTIC_COMMERCE_ABI, clientWallet);

    console.log(`📡 Client Address: ${clientWallet.address}`);
    console.log(`🎯 Assigned Agent: ${AGENT_ADDRESS}`);
    
    const expiredAt = Math.floor(Date.now() / 1000) + 3600; // +1 hour
    const description = "Test Market-Intelligence Report required.";
    const dummyAddress = "0x1111111111111111111111111111111111111111"; // Evaluator
    const zeroAddress = "0x0000000000000000000000000000000000000000"; // Hook

    try {
        // 1. Створюємо таск
        console.log("\n⏳ Створюю новий таск (createJob)...");
        const createTx = await contract.createJob(
            AGENT_ADDRESS, // provider
            dummyAddress,  // evaluator (avoid ZeroAddress error)
            expiredAt,
            description,
            zeroAddress    // hook
        );
        console.log(`🔄 Транзакція відправлена! Hash: ${createTx.hash}`);
        const receipt = await createTx.wait(1);
        
        let jobId;
        const eventSig = ethers.id("JobCreated(uint256,address,address,address,uint256,address)");
        const log = receipt.logs.find(l => l.topics[0] === eventSig);
        if (log) {
            jobId = BigInt(log.topics[1]).toString();
            console.log(`✅ ТАСК СТВОРЕНО! Job ID: #${jobId}`);
        } else {
            console.error("❌ Не змогли знайти Job ID в подіях транзакції.");
            return;
        }

        // 2. Встановлюємо бюджет та оплачуємо
        console.log(`\n⏳ Отримую адресу платіжного токена (Payment Token)...`);
        const tokenAddress = await contract.paymentToken();
        const erc20Abi = [
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function balanceOf(address account) external view returns (uint256)",
            "function decimals() external view returns (uint8)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, clientWallet);
        const decimals = await tokenContract.decimals();
        const amount = ethers.parseUnits("1.0", decimals); // 1.0 token (наприклад, 1 USDC)

        const balance = await tokenContract.balanceOf(clientWallet.address);
        if (balance < amount) {
            console.log(`⚠️ Недостатньо тестових токенів (USDC або еквівалент) на гаманці клієнта.`);
            console.log(`Поточний баланс: ${ethers.formatUnits(balance, decimals)}`);
            console.log(`Таск створено (Job ID #${jobId}), але він не оплачений. Бекенд зловить WrongStatus.`);
            return;
        }

        console.log(`💸 Даю дозвіл контракту списати ${ethers.formatUnits(amount, decimals)} токенів (Approve)...`);
        const approveTx = await tokenContract.approve(JOB_REGISTRY_ADDRESS, amount);
        await approveTx.wait(1);

        console.log(`💰 Встановлюю бюджет таска (setBudget)...`);
        const budgetTx = await contract.setBudget(jobId, amount, "0x");
        await budgetTx.wait(1);

        console.log(`💳 Оплачую таск (fund)...`);
        const fundTx = await contract.fund(jobId, "0x");
        await fundTx.wait(1);

        console.log(`\n🎉 СУПЕР! Таск #${jobId} успішно створено, встановлено бюджет і оплачено!`);
        console.log("👀 Перевіряй консоль бекенду — наш агент має зловити його і виконати без помилки WrongStatus!");

    } catch (err) {
        console.error("\n❌ Помилка при виконанні скрипта:", err.message);
    }
}

main();
