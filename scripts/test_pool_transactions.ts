import { ethers } from "hardhat";
import { 
    abi as POOL_ABI
} from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json';
import { Contract } from "ethers";

// Helper function to encode sqrt price
function encodePriceSqrt(reserve1: bigint, reserve0: bigint): bigint {
    return BigInt(Math.floor(Math.sqrt(Number(reserve1) / Number(reserve0)) * 2 ** 96));
}

// Helper function to get sqrt price from tick
function getSqrtRatioAtTick(tick: number): bigint {
    const absTick = Math.abs(tick);
    
    // Calculate the sqrt ratio with proper scaling
    let ratio = Math.sqrt(1.0001 ** absTick);
    // Scale up by 2^96 and round to nearest integer
    ratio = ratio * (2 ** 96);
    
    let result = BigInt(Math.floor(ratio));
    
    if (tick < 0) {
        result = (BigInt(2) ** BigInt(192)) / result;
    }
    
    return result;
}

function calculateLiquidityForAmount0(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount0: bigint
): bigint {
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }
    const numerator = amount0 * sqrtRatioAX96 * sqrtRatioBX96;
    const denominator = sqrtRatioBX96 - sqrtRatioAX96;
    return numerator / denominator;
}

function calculateLiquidityForAmount1(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount1: bigint
): bigint {
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }
    return (amount1 * BigInt(2) ** BigInt(96)) / (sqrtRatioBX96 - sqrtRatioAX96);
}

function calculateOptimalLiquidity(
    amount0: bigint,
    amount1: bigint,
    currentSqrtPriceX96: bigint,
    tickLower: number,
    tickUpper: number
): bigint {
    const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
    const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

    console.log("Debug - Price values:", {
        currentSqrtPrice: currentSqrtPriceX96.toString(),
        lowerSqrtPrice: sqrtRatioAX96.toString(),
        upperSqrtPrice: sqrtRatioBX96.toString()
    });

    // Calculate both possible liquidities
    const liquidity0 = calculateLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0);
    const liquidity1 = calculateLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1);

    console.log("Debug - Calculated liquidities:", {
        liquidity0: liquidity0.toString(),
        liquidity1: liquidity1.toString()
    });

    // Return the smaller value
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
}

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Setting up pool and tokens...");
    
    const poolData = require('../deployments/hardhat/UniswapV3Pool.json');
    const token0Data = require('../deployments/hardhat/Token1.json');
    const token1Data = require('../deployments/hardhat/Token2.json');

    const pool = new Contract(poolData.address, POOL_ABI, deployer);
    const token0 = await ethers.getContractAt("Token", token0Data.address);
    const token1 = await ethers.getContractAt("Token", token1Data.address);

    // Verify token order
    const poolToken0 = await pool.token0();
    const poolToken1 = await pool.token1();
    console.log("Pool tokens:", { token0: poolToken0, token1: poolToken1 });

    // Get tick spacing
    const tickSpacing = Number(await pool.tickSpacing());
    console.log("Tick spacing:", tickSpacing);

    // Calculate tick range (use smaller range)
    const tickLower = -tickSpacing * 5;  // 5 spacing units down
    const tickUpper = tickSpacing * 5;   // 5 spacing units up

    // Ensure ticks are properly spaced
    const validTickLower = Math.floor(tickLower / tickSpacing) * tickSpacing;
    const validTickUpper = Math.floor(tickUpper / tickSpacing) * tickSpacing;

    console.log("Calculated tick range:", { 
        tickLower: validTickLower, 
        tickUpper: validTickUpper 
    });

    // Use smaller amounts for initial test
    const amount0Desired = ethers.parseEther("0.01");
    const amount1Desired = ethers.parseEther("0.01");

    // Check initial balances
    console.log("Initial balances:", {
        token0: ethers.formatEther(await token0.balanceOf(deployer.address)),
        token1: ethers.formatEther(await token1.balanceOf(deployer.address))
    });

    // First approve the pool to spend tokens
    console.log("Approving tokens...");
    await token0.approve(pool.target, amount0Desired);
    await token1.approve(pool.target, amount1Desired);

    // Get current price
    const slot0 = await pool.slot0();
    const currentSqrtPriceX96 = slot0.sqrtPriceX96;

    console.log("Current pool state:", {
        sqrtPrice: currentSqrtPriceX96.toString(),
        tick: slot0.tick.toString()
    });

    // Calculate liquidity
    const liquidity = calculateOptimalLiquidity(
        amount0Desired,
        amount1Desired,
        currentSqrtPriceX96,
        validTickLower,
        validTickUpper
    );

    console.log("Calculated liquidity:", liquidity.toString());

    // Add liquidity
    try {
        console.log("Starting liquidity addition process...");

        // Step 1: Transfer tokens to the pool first
        console.log("Transferring tokens to pool...");
        await token0.transfer(pool.target, amount0Desired);
        await token1.transfer(pool.target, amount1Desired);

        // Get balances before mint
        const token0BalanceBefore = await token0.balanceOf(pool.target);
        const token1BalanceBefore = await token1.balanceOf(pool.target);

        console.log("Pool balances before mint:", {
            token0: ethers.formatEther(token0BalanceBefore),
            token1: ethers.formatEther(token1BalanceBefore)
        });

        // Step 2: Call mint
        console.log("Calling mint function with parameters:", {
            recipient: deployer.address,
            tickLower: validTickLower,
            tickUpper: validTickUpper,
            liquidity: liquidity.toString()
        });

        const mintTx = await pool.mint(
            deployer.address,
            validTickLower,
            validTickUpper,
            liquidity,
            "0x",
            { gasLimit: 1000000 }
        );

        console.log("Waiting for transaction confirmation...");
        const receipt = await mintTx.wait();
        
        // Get balances after mint
        const token0BalanceAfter = await token0.balanceOf(pool.target);
        const token1BalanceAfter = await token1.balanceOf(pool.target);

        console.log("Pool balances after mint:", {
            token0: ethers.formatEther(token0BalanceAfter),
            token1: ethers.formatEther(token1BalanceAfter)
        });

        console.log("Liquidity added successfully:", receipt.hash);
        
        // Verify the position
        const positionKey = ethers.solidityPackedKeccak256(
            ["address", "int24", "int24"],
            [deployer.address, validTickLower, validTickUpper]
        );
        
        const position = await pool.positions(positionKey);
        
        console.log("Position details:", {
            liquidity: position.liquidity.toString(),
            feeGrowthInside0LastX128: position.feeGrowthInside0LastX128.toString(),
            feeGrowthInside1LastX128: position.feeGrowthInside1LastX128.toString()
        });

    } catch (error) {
        console.error("Failed to add liquidity:", error);
        if (error.transaction) {
            console.log("Failed transaction details:", {
                from: error.transaction.from,
                to: error.transaction.to,
                data: error.transaction.data,
                value: error.transaction.value
            });
        }
        throw error;
    }

    // Set up event listeners for monitoring
    console.log("\nSetting up event monitors...");
    
    pool.on("Mint", (sender, owner, tickLower, tickUpper, amount, amount0, amount1) => {
        console.log("New Liquidity Added:", {
            owner,
            tickLower: tickLower.toString(),
            tickUpper: tickUpper.toString(),
            amount: amount.toString(),
            amount0: ethers.formatEther(amount0),
            amount1: ethers.formatEther(amount1)
        });
    });

    pool.on("Swap", (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick) => {
        console.log("Swap Executed:", {
            amount0: ethers.formatEther(amount0),
            amount1: ethers.formatEther(amount1),
            price: (Number(sqrtPriceX96) / (2 ** 96)) ** 2,
            tick: tick.toString()
        });
    });

    // Keep the script running to continue receiving events
    console.log("\nListening for events. Press Ctrl+C to exit.");
    await new Promise(() => {}); // Keep script running
}

main()
    .then(() => console.log("Setup completed successfully"))
    .catch(error => {
        console.error("Error in setup:", error);
        process.exit(1);
    });