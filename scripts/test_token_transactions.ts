import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';

// Function to load contract data from deployment files
async function loadDeployedContract(tokenName: string) {
    const filePath = path.join(__dirname, '..', 'deployments', 'hardhat', `${tokenName}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const contractData = JSON.parse(fileContent);
    return {
        address: contractData.address,
        contract: await ethers.getContractAt("Token", contractData.address)
    };
}

// Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    try {
        const [owner, user1] = await ethers.getSigners();
        console.log("\nTest Accounts:");
        console.log("Owner:", owner.address);
        console.log("User1:", user1.address);

        // Load deployed contracts
        console.log("\nLoading deployed contracts...");
        const token1 = await loadDeployedContract("Token1");
        const token2 = await loadDeployedContract("Token2");
        console.log("Token1 address:", token1.address);
        console.log("Token2 address:", token2.address);

        // Series of transactions with delays
        console.log("\nStarting transactions with 10-second intervals...");

        // Token1 Operations
        console.log("\n=== Token1 Operations ===");
        
        console.log("\nMinting 100 Token1 to User1...");
        await token1.contract.mint(user1.address, ethers.parseEther("100"));
        console.log("Mint transaction completed");
        await sleep(10000); // 10 second delay

        console.log("\nBurning 50 Token1 from User1...");
        await token1.contract.connect(user1).burn(ethers.parseEther("50"));
        console.log("Burn transaction completed");
        await sleep(10000);

        // Token2 Operations
        console.log("\n=== Token2 Operations ===");
        
        console.log("\nMinting 200 Token2 to User1...");
        await token2.contract.mint(user1.address, ethers.parseEther("200"));
        console.log("Mint transaction completed");
        await sleep(10000);

        console.log("\nBurning 100 Token2 from User1...");
        await token2.contract.connect(user1).burn(ethers.parseEther("100"));
        console.log("Burn transaction completed");

        console.log("\nAll transactions completed successfully!");

    } catch (error) {
        console.error("Error during testing:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });