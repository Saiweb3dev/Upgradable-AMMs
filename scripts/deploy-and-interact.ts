import { ethers } from "hardhat";
import { Contract } from "ethers";
import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json';
import SwapRouter from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';
import NonfungiblePositionManager from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json';
import IUniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Token1
  const Token = await ethers.getContractFactory("Token");
  const token1 = await Token.deploy(
    "Token1",
    "TK1",
    18,
    ethers.parseEther("1000000") // 1 million tokens
  );
  await token1.waitForDeployment();
  console.log("Token1 deployed to:", await token1.getAddress());

  // Deploy Token2
  const token2 = await Token.deploy(
    "Token2",
    "TK2",
    18,
    ethers.parseEther("1000000") // 1 million tokens
  );
  await token2.waitForDeployment();
  console.log("Token2 deployed to:", await token2.getAddress());

  // Deploy Factory
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
  const NonfungiblePositionManagerFactory = new ethers.ContractFactory(NonfungiblePositionManager.abi, NonfungiblePositionManager.bytecode, deployer);
  const nonfungiblePositionManager = await NonfungiblePositionManagerFactory.deploy(
    await factory.getAddress(),
    await token1.getAddress(),
    await token1.getAddress() // We're using token1 address as a placeholder for WETH9
  );
  await nonfungiblePositionManager.waitForDeployment();
  console.log("NonfungiblePositionManager deployed to:", await nonfungiblePositionManager.getAddress());

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

  // Add liquidity to the pool
  const liquidityAmount = ethers.parseEther("1000"); // 1000 tokens of each
  await addLiquidity(
    nonfungiblePositionManager,
    await token1.getAddress(),
    await token2.getAddress(),
    fee,
    liquidityAmount,
    liquidityAmount,
    deployer
  );
  console.log("Liquidity added to the pool");

  // Approve tokens for the SwapRouter
  await token1.approve(await swapRouter.getAddress(), approveAmount);
  await token2.approve(await swapRouter.getAddress(), approveAmount);

  // Perform a swap
  const amountIn = ethers.parseEther("10"); // Swap 10 Token1 for Token2
  await swapExactInputSingle(
    swapRouter,
    await token1.getAddress(),
    await token2.getAddress(),
    fee,
    amountIn,
    deployer
  );
  console.log("Swap completed");

  // Check balances
  const balance1 = await token1.balanceOf(deployer.address);
  const balance2 = await token2.balanceOf(deployer.address);
  console.log("Token1 balance:", ethers.formatEther(balance1));
  console.log("Token2 balance:", ethers.formatEther(balance2));
}

async function addLiquidity(
  nonfungiblePositionManager: Contract,
  token0: string,
  token1: string,
  fee: number,
  amount0Desired: bigint,
  amount1Desired: bigint,
  deployer: any
) {
  const liquidityParams = {
    token0: token0,
    token1: token1,
    fee: fee,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from now
    amount0Desired: amount0Desired,
    amount1Desired: amount1Desired,
    amount0Min: 0,
    amount1Min: 0,
    tickLower: -887220,
    tickUpper: 887220,
  };

  return nonfungiblePositionManager.mint(liquidityParams);
}

async function swapExactInputSingle(
  swapRouter: Contract,
  tokenIn: string,
  tokenOut: string,
  fee: number,
  amountIn: bigint,
  deployer: any
) {
  const params = {
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    fee: fee,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from now
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };

  return swapRouter.exactInputSingle(params);
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });