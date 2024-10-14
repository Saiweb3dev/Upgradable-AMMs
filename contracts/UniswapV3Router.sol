// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./UniswapV3Factory.sol";
import "./UniswapV3Pool.sol";

/**
 * @title UniswapV3Router
 * @dev Router contract for executing swaps and managing liquidity across Uniswap V3 pools
 */
contract UniswapV3Router {
    UniswapV3Factory public immutable factory;

    constructor(address _factory) {
        factory = UniswapV3Factory(_factory);
    }

    /**
     * @dev Adds liquidity to a pool
     * @param tokenA The first token of the pair
     * @param tokenB The second token of the pair
     * @param fee The fee tier of the pool
     * @param amount0Desired The desired amount of tokenA to add as liquidity
     * @param amount1Desired The desired amount of tokenB to add as liquidity
     * @param amount0Min The minimum amount of tokenA to add as liquidity
     * @param amount1Min The minimum amount of tokenB to add as liquidity
     * @param recipient The address that will receive the liquidity tokens
     * @param deadline The time by which the transaction must be included to effect the change
     * @return liquidity The amount of liquidity tokens received
     * @return amount0 The amount of tokenA added as liquidity
     * @return amount1 The amount of tokenB added as liquidity
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint24 fee,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient,
        uint256 deadline
    ) external returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
        require(deadline >= block.timestamp, "UniswapV3Router: EXPIRED");
        address pool = factory.getPool(tokenA, tokenB, fee);
        require(pool != address(0), "UniswapV3Router: POOL_NOT_FOUND");

        // Transfer tokens to the pool
        IERC20(tokenA).transferFrom(msg.sender, pool, amount0Desired);
        IERC20(tokenB).transferFrom(msg.sender, pool, amount1Desired);

        // Add liquidity to the pool
         (liquidity, amount0, amount1) = UniswapV3Pool(pool).mint(
        recipient,
        tickLower,
        tickUpper,
        uint128(amount0Desired),
        uint128(amount1Desired),
        abi.encode(amount0Min, amount1Min)
    );

        // Refund excess tokens
        if (amount0 < amount0Desired) {
            IERC20(tokenA).transfer(msg.sender, amount0Desired - amount0);
        }
        if (amount1 < amount1Desired) {
            IERC20(tokenB).transfer(msg.sender, amount1Desired - amount1);
        }
    }

    /**
     * @dev Swaps tokens
     * @param tokenIn The token to swap from
     * @param tokenOut The token to swap to
     * @param fee The fee tier of the pool to use for the swap
     * @param recipient The address that will receive the output tokens
     * @param amountIn The amount of input tokens to send
     * @param amountOutMinimum The minimum amount of output tokens that must be received for the transaction not to revert
     * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit
     * @return amountOut The amount of tokens received
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut) {
        address pool = factory.getPool(tokenIn, tokenOut, fee);
        require(pool != address(0), "UniswapV3Router: POOL_NOT_FOUND");

        bool zeroForOne = tokenIn < tokenOut;

        // Transfer input tokens to the pool
        IERC20(tokenIn).transferFrom(msg.sender, pool, amountIn);

        // Execute the swap
        (int256 amount0, int256 amount1) = UniswapV3Pool(pool).swap(
            recipient,
            zeroForOne,
            int256(amountIn),
            sqrtPriceLimitX96,
            abi.encode(tokenIn, tokenOut, recipient)
        );

        amountOut = uint256(-(zeroForOne ? amount1 : amount0));
        require(amountOut >= amountOutMinimum, "UniswapV3Router: INSUFFICIENT_OUTPUT_AMOUNT");
    }
    // Add a function for multi-hop swaps
function swapExactInputMultiHop(
    address[] calldata path,
    uint24[] calldata fees,
    uint256 amountIn,
    uint256 amountOutMinimum,
    address recipient
) external returns (uint256 amountOut) {
    require(path.length >= 2 && path.length == fees.length + 1, "Invalid path");
    
    IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
    
    for (uint i = 0; i < fees.length; i++) {
        IERC20(path[i]).approve(address(this), amountIn);
        
        amountIn = swap(
            path[i],
            path[i+1],
            fees[i],
            i == fees.length - 1 ? recipient : address(this),
            amountIn,
            0,
            0
        );
    }
    
    amountOut = amountIn;
    require(amountOut >= amountOutMinimum, "Insufficient output amount");
}
}