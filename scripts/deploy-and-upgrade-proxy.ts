import { ethers, upgrades } from "hardhat";
import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json';
import SwapRouter from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';
import IUniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import NonfungiblePositionManager from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json';

// Function to calculate the amount of Token1 needed for a given amount of Token2 based on the current price
function calculateAmountIn(amountOut: bigint, price: number): bigint {
  return BigInt(Math.ceil(Number(amountOut) / price));
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying and upgrading contracts with the account:", deployer.address);

  // Deploy Token1
  const Token = await ethers.getContractFactory("Token");
  const token1 = await Token.deploy("Token1", "TK1", 18, ethers.parseEther("1000000"));
  await token1.waitForDeployment();
  console.log("Token1 deployed to:", await token1.getAddress());

  // Deploy Token2
  const token2 = await Token.deploy("Token2", "TK2", 18, ethers.parseEther("1000000"));
  await token2.waitForDeployment();
  console.log("Token2 deployed to:", await token2.getAddress());

  // Deploy UniswapV3Factory
  const UniswapV3FactoryFactory = new ethers.ContractFactory(UniswapV3Factory.abi, UniswapV3Factory.bytecode, deployer);
  const factory = await UniswapV3FactoryFactory.deploy();
  await factory.waitForDeployment();
  console.log("UniswapV3Factory deployed to:", await factory.getAddress());

  // Deploy SwapRouter
  const SwapRouterFactory = new ethers.ContractFactory(SwapRouter.abi, SwapRouter.bytecode, deployer);
  const swapRouter = await SwapRouterFactory.deploy(await factory.getAddress(), await token1.getAddress());
  await swapRouter.waitForDeployment();
  console.log("SwapRouter deployed to:", await swapRouter.getAddress());

  // Deploy NonfungiblePositionManager
  const NonfungiblePositionManagerFactory = new ethers.ContractFactory(
    NonfungiblePositionManager.abi,
    NonfungiblePositionManager.bytecode,
    deployer
  );
  const nonfungiblePositionManager = await NonfungiblePositionManagerFactory.deploy(
    await factory.getAddress(),
    await token1.getAddress(),
    await swapRouter.getAddress()
  );
  await nonfungiblePositionManager.waitForDeployment();
  console.log("NonfungiblePositionManager deployed to:", await nonfungiblePositionManager.getAddress());

  // Deploy UniswapProxy (V1)
  console.log("Deploying UniswapProxy (V1)...");
  const UniswapProxy = await ethers.getContractFactory("UniswapProxy");
  const uniswapProxy = await upgrades.deployProxy(UniswapProxy, [
    await swapRouter.getAddress(),
    await token1.getAddress(),
    await token2.getAddress(),
    3000 // 0.3% fee
  ]);
  await uniswapProxy.waitForDeployment();
  console.log("UniswapProxy (V1) deployed to:", await uniswapProxy.getAddress());

  // Create a pool for Token1/Token2
  const fee = 3000; // 0.3%
  await factory.createPool(await token1.getAddress(), await token2.getAddress(), fee);
  const poolAddress = await factory.getPool(await token1.getAddress(), await token2.getAddress(), fee);
  console.log("Token1/Token2 pool created at:", poolAddress);

  // Initialize the pool
  const pool = new ethers.Contract(poolAddress, IUniswapV3Pool.abi, deployer);
  const initialPrice = ethers.parseUnits("1", 18); // 1 Token1 = 1 Token2
  await pool.initialize(initialPrice);
  console.log("Pool initialized with price:", initialPrice.toString());

  // Approve tokens for the NonfungiblePositionManager
  const approveAmount = ethers.parseEther("1000000");
  await token1.approve(await nonfungiblePositionManager.getAddress(), approveAmount);
  await token2.approve(await nonfungiblePositionManager.getAddress(), approveAmount);

  // Add liquidity
  const mintParams = {
    token0: await token1.getAddress(),
    token1: await token2.getAddress(),
    fee: 3000,
    tickLower: -887220,  // Represents price range, adjust as needed
    tickUpper: 887220,   // Represents price range, adjust as needed
    amount0Desired: ethers.parseEther("1000"),
    amount1Desired: ethers.parseEther("1000"),
    amount0Min: 0,
    amount1Min: 0,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10 // 10 minutes from now
  };

  console.log("Adding liquidity...");
  const tx = await nonfungiblePositionManager.mint(mintParams);
  await tx.wait();
  console.log("Liquidity added");

  // Approve tokens for the UniswapProxy
  await token1.approve(await uniswapProxy.getAddress(), approveAmount);
  await token2.approve(await uniswapProxy.getAddress(), approveAmount);

  // Perform a swap through the proxy
  const amountIn = ethers.parseEther("10"); // Swap 10 Token1 for Token2
  console.log("Performing swap...");
  await uniswapProxy.swapExactInputSingle(amountIn);
  console.log("Swap completed through proxy V1");

  // Check balances after the first swap
  let balance1 = await token1.balanceOf(deployer.address);
  let balance2 = await token2.balanceOf(deployer.address);
  console.log("Token1 balance:", ethers.formatEther(balance1));
  console.log("Token2 balance:", ethers.formatEther(balance2));

  // Upgrade UniswapProxy to V2
  console.log("Upgrading UniswapProxy to V2...");
  const UniswapProxyV2 = await ethers.getContractFactory("UniswapProxyV2");
  // Use the upgrades plugin to upgrade the proxy to V2
  const upgradedProxy = await upgrades.upgradeProxy(await uniswapProxy.getAddress(), UniswapProxyV2);
  console.log("UniswapProxy upgraded to V2");

  // Test the new version function added in V2
  const version = await upgradedProxy.version();
  console.log("New proxy version:", version);

  // Add more liquidity
  console.log("Adding more liquidity...");
  const addLiquidityTx = await nonfungiblePositionManager.mint({
    ...mintParams,
    amount0Desired: ethers.parseEther("10000"),
    amount1Desired: ethers.parseEther("10000"),
  });
  await addLiquidityTx.wait();
  console.log("Additional liquidity added");

  // Get current pool price
  const poolContract = new ethers.Contract(poolAddress, IUniswapV3Pool.abi, deployer);
  const slot0 = await poolContract.slot0();
  const currentSqrtPrice = slot0.sqrtPriceX96;
  const currentPrice = (BigInt(currentSqrtPrice) * BigInt(currentSqrtPrice) * BigInt(10**18)) / BigInt(2**192);
  console.log("Current pool price (Token2 per Token1):", ethers.formatUnits(currentPrice, 18));

  // Calculate and log the price in a different way
  const price = Math.pow(1.0001, Number(slot0.tick) / 2);
  console.log("Calculated price from tick:", price);

  // Test the new swap function added in V2
  const amountOut = ethers.parseEther("1"); // Want 1 Token2
const calculatedAmountIn = calculateAmountIn(amountOut, price);
const token1Balance = await token1.balanceOf(deployer.address);

console.log("Token1 balance:", ethers.formatEther(token1Balance));
console.log("Calculated amount needed:", ethers.formatEther(calculatedAmountIn));

let maxAmountIn: bigint;
let adjustedAmountOut: bigint;

if (token1Balance < calculatedAmountIn) {
  console.log("Not enough Token1 balance for the desired swap. Adjusting swap amount...");
  maxAmountIn = token1Balance;
  adjustedAmountOut = BigInt(Math.floor(Number(maxAmountIn) * price));
} else {
  maxAmountIn = calculatedAmountIn * BigInt(2); // Double the calculated amount to account for slippage
  adjustedAmountOut = amountOut;
}

try {
  console.log("Attempting swap with exact output...");
  console.log("Adjusted amount out:", ethers.formatEther(adjustedAmountOut), "Token2");
  console.log("Max amount in:", ethers.formatEther(maxAmountIn), "Token1");
  const tx = await upgradedProxy.swapExactOutputSingle(adjustedAmountOut, maxAmountIn);
  await tx.wait();
  console.log("Swap with exact output completed through upgraded proxy");
} catch (error) {
  console.error("Swap failed:", error.message);
  // Log token balances and pool state for debugging
  const balance1 = await token1.balanceOf(deployer.address);
  const balance2 = await token2.balanceOf(deployer.address);
  console.log("Token1 balance:", ethers.formatEther(balance1));
  console.log("Token2 balance:", ethers.formatEther(balance2));
  
  const slot0 = await poolContract.slot0();
  console.log("Pool current tick:", slot0.tick.toString());
  console.log("Pool current sqrt price:", slot0.sqrtPriceX96.toString());
}

// Check balances after the second swap attempt
balance1 = await token1.balanceOf(deployer.address);
balance2 = await token2.balanceOf(deployer.address);
console.log("Token1 balance after upgrade:", ethers.formatEther(balance1));
console.log("Token2 balance after upgrade:", ethers.formatEther(balance2));
}

// Execute the main function and handle any errors
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });