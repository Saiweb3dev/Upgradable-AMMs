// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./UniswapV3Pool.sol";

/**
 * @title UniswapV3Factory
 * @dev Factory contract for creating and managing Uniswap V3 pools
 */
contract UniswapV3Factory {
    mapping(address => mapping(address => mapping(uint24 => address))) public getPool;
    address[] public allPools;

    event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, address pool);

    /**
     * @dev Creates a new pool for a pair of tokens and a fee tier
     * @param tokenA The first token of the pair
     * @param tokenB The second token of the pair
     * @param fee The fee tier for the pool
     * @return pool The address of the newly created pool
     */
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool) {
        require(tokenA != tokenB, "UniswapV3Factory: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "UniswapV3Factory: ZERO_ADDRESS");
        require(getPool[token0][token1][fee] == address(0), "UniswapV3Factory: POOL_EXISTS");
        
        // Determine tick spacing based on fee
        int24 tickSpacing;
        if (fee == 500) {
            tickSpacing = 10;
        } else if (fee == 3000) {
            tickSpacing = 60;
        } else if (fee == 10000) {
            tickSpacing = 200;
        } else {
            revert("UniswapV3Factory: INVALID_FEE");
        }

            pool = address(new UniswapV3Pool(token0, token1, fee, tickSpacing, sqrtPriceX96));

        getPool[token0][token1][fee] = pool;
        getPool[token1][token0][fee] = pool;
        allPools.push(pool);

        emit PoolCreated(token0, token1, fee, pool);
    }

    /**
     * @dev Returns the number of pools created
     * @return The total number of pools
     */
    function allPoolsLength() external view returns (uint) {
        return allPools.length;
    }

    // Add a new function to set the initial price
function setInitialPrice(address pool, uint160 sqrtPriceX96) external {
    require(msg.sender == owner(), "Only owner can set initial price");
    UniswapV3Pool(pool).setInitialPrice(sqrtPriceX96);
}
}

