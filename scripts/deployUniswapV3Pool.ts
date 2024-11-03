import hre, { ethers } from "hardhat";
import { 
  abi as FACTORY_ABI,
  bytecode as FACTORY_BYTECODE,
} from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json';
import { 
  abi as POOL_ABI,
  bytecode as POOL_BYTECODE,
} from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json';
import { Contract } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

   // Define fee - 3000 represents 0.3%
   const fee = 3000;


  // Deploy Token A
  const TokenA = await ethers.getContractFactory("Token");
  const tokenA = await TokenA.deploy("Token A", "TKA", 18, ethers.parseEther("1000000"));
  const tokenAAddress = typeof tokenA.target === 'string' ? tokenA.target : tokenA.target.toString();
  console.log("Token A deployed to:", tokenAAddress);

  

  // Deploy Token B
  const TokenB = await ethers.getContractFactory("Token");
  const tokenB = await TokenB.deploy("Token B", "TKB", 18, ethers.parseEther("1000000"));
  const tokenBAddress = typeof tokenB.target === 'string' ? tokenB.target : tokenB.target.toString();
  console.log("Token B deployed to:", tokenBAddress);


  // Deploy Uniswap V3 Factory
  const UniswapV3Factory = new ethers.ContractFactory(
    FACTORY_ABI,
    FACTORY_BYTECODE,
    deployer
  );
  const factory = await UniswapV3Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("UniswapV3Factory deployed to:", factoryAddress);

  // Create factory interface for proper typing
  const factoryContract = new Contract(
    factoryAddress,
    FACTORY_ABI,
    deployer
  );

  // Create pool using the factory
  const createPoolTx = await factoryContract.createPool(
    tokenAAddress,
    tokenBAddress,
    fee
  );
  await createPoolTx.wait();

  // Get pool address
  const poolAddress = await factoryContract.getPool(
    tokenAAddress,
    tokenBAddress,
    fee
  );
  console.log("Pool created at:", poolAddress);

  // Get pool instance
  const pool = new ethers.Contract(poolAddress, POOL_ABI, deployer);

  // Initialize pool with starting price
  const initialSqrtPrice = "79228162514264337593543950336"; // 1:1 price
  await pool.initialize(initialSqrtPrice);
  console.log("Pool initialized");

  // Save pool deployment
  await hre.deployments.save("UniswapV3Pool", {
    abi: POOL_ABI,
    address: poolAddress,
  });
 
  // Approve tokens for the pool
  const approveAmount = ethers.parseEther("1000000");
  await tokenA.approve(poolAddress, approveAmount);
  await tokenB.approve(poolAddress, approveAmount);
  console.log("Tokens approved for the pool");

  console.log("Deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });