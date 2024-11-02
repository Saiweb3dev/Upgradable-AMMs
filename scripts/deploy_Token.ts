import hre, { ethers } from "hardhat";

async function deployToken(name: string, symbol: string, decimals: number, totalSupply: string) {
  const Token_Factory = await hre.ethers.getContractFactory("Token");
  const Token = await Token_Factory.deploy(name, symbol, decimals, ethers.parseEther(totalSupply));

  const contractAddress: string = typeof Token.target === 'string' ? Token.target : Token.target.toString();

  console.log(`The ${name} Contract deployed at ${contractAddress}`);

  const abi = Token_Factory.interface.formatJson();
  const abiFormated = JSON.parse(abi);

  await hre.deployments.save(name, {
    abi: abiFormated,
    address: contractAddress,
  });

  return { address: contractAddress, abi: abiFormated };
}

async function main() {
  try {
    // Deploy Token1
    const token1 = await deployToken(
      "Token1",
      "TK1",
      18,
      "10000"
    );
    
    // Deploy Token2
    const token2 = await deployToken(
      "Token2",
      "TK2",
      18,
      "20000"  // Different total supply for Token2
    );

    console.log("\nDeployment Summary:");
    console.log("Token1 deployed at:", token1.address);
    console.log("Token2 deployed at:", token2.address);

  } catch (error) {
    console.error("Error during deployment:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });