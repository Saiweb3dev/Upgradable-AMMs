import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Token A
  const TokenA = await ethers.getContractFactory("Token");
  const tokenA = await TokenA.deploy("Token A", "TKA", 18, ethers.parseEther("1000000"));
  await tokenA.deployed();
  console.log("Token A deployed to:", tokenA.address);

  // Deploy Token B
  const TokenB = await ethers.getContractFactory("Token");
  const tokenB = await TokenB.deploy("Token B", "TKB", 18, ethers.parseEther("1000000"));
  await tokenB.deployed();
  console.log("Token B deployed to:", tokenB.address);

  // Deploy EnhancedUniswapV3Pool
  const EnhancedUniswapV3Pool = await ethers.getContractFactory("EnhancedUniswapV3Pool");
  const fee = 3000; // 0.3% fee tier
  const tickSpacing = 60; // Tick spacing for 0.3% fee tier
  const initialSqrtPrice = "79228162514264337593543950336"; // 1:1 price

  const pool = await EnhancedUniswapV3Pool.deploy(
    tokenA.address,
    tokenB.address,
    fee,
    tickSpacing,
    initialSqrtPrice
  );
  await pool.deployed();
  console.log("EnhancedUniswapV3Pool deployed to:", pool.address);

  // Approve tokens for the pool
  const approveAmount = ethers.parseEther("1000000");
  await tokenA.approve(pool.address, approveAmount);
  await tokenB.approve(pool.address, approveAmount);
  console.log("Tokens approved for the pool");

  console.log("Deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });