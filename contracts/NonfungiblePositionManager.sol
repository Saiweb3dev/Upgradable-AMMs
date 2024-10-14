// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./UniswapV3Factory.sol";
import "./UniswapV3Pool.sol";

/**
 * @title NonfungiblePositionManager
 * @dev Manages liquidity positions as NFTs for Uniswap V3 pools
 */
contract NonfungiblePositionManager is ERC721 {
    using Counters for Counters.Counter;

    UniswapV3Factory public immutable factory;
    Counters.Counter private _tokenIds;

    struct Position {
        address pool;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }

    mapping(uint256 => Position) public positions;

    constructor(address _factory) ERC721("Uniswap V3 Positions NFT-V1", "UNI-V3-POS") {
        factory = UniswapV3Factory(_factory);
    }

    /**
     * @dev Mints a new position
     * @param tokenA The first token of the pair
     * @param tokenB The second token of the pair
     * @param fee The fee tier of the pool
     * @param tickLower The lower tick of the position
     * @param tickUpper The upper tick of the position
     * @param amount0Desired The desired amount of tokenA to add as liquidity
     * @param amount1Desired The desired amount of tokenB to add as liquidity
     * @param amount0Min The minimum amount of tokenA to add as liquidity
     * @param amount1Min The minimum amount of tokenB to add as liquidity
     * @param recipient The address that will receive the NFT
     * @return tokenId The ID of the newly minted NFT
     * @return liquidity The amount of liquidity added to the position
     * @return amount0 The amount of tokenA added as liquidity
     * @return amount1 The amount of tokenB added as liquidity
     */
    function mint(
        address tokenA,
        address tokenB,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient
    ) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) {
        address pool = factory.getPool(tokenA, tokenB, fee);
        require(pool != address(0), "NonfungiblePositionManager: POOL_NOT_FOUND");

        // Transfer tokens to the pool
        IERC20(tokenA).transferFrom(msg.sender, pool, amount0Desired);
        IERC20(tokenB).transferFrom(msg.sender, pool, amount1Desired);

        // Add liquidity to the pool
       (liquidity, amount0, amount1) = UniswapV3Pool(pool).mint(
        address(this),
        tickLower,
        tickUpper,
        uint128(amount0Desired),
        uint128(amount1Desired),
        abi.encode(amount0Min, amount1Min)
    );

        // Mint NFT
        _tokenIds.increment();
        tokenId = _tokenIds.current();
        _safeMint(recipient, tokenId);

        // Store position information
        positions[tokenId] = Position({
            pool: pool,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: liquidity
        });

        // Refund excess tokens
        if (amount0 < amount0Desired) {
            IERC20(tokenA).transfer(msg.sender, amount0Desired - amount0);
        }
        if (amount1 < amount1Desired) {
            IERC20(tokenB).transfer(msg.sender, amount1Desired - amount1);
        }
    }

    /**
     * @dev Burns a position
     * @param tokenId The ID of the token to burn
     * @param recipient The address that will receive the underlying assets
     * @return amount0 The amount of token0 sent to recipient
     * @return amount1 The amount of token1 sent to recipient
     */
    function burn(uint256 tokenId, address recipient) external returns (uint256 amount0, uint256 amount1) {
        require(_isApprovedOrOwner(msg.sender, tokenId), "NonfungiblePositionManager: NOT_AUTHORIZED");
        Position memory position = positions[tokenId];
        require(position.liquidity > 0, "NonfungiblePositionManager: ZERO_LIQUIDITY");

        // Remove liquidity from the pool
        (amount0, amount1) = UniswapV3Pool(position.pool).burn(
            position.tickLower,
            position.tickUpper,
            position.liquidity
        );

        // Transfer tokens to recipient
        IERC20(UniswapV3Pool(position.pool).token0()).transfer(recipient, amount0);
        IERC20(UniswapV3Pool(position.pool).token1()).transfer(recipient, amount1);

        // Burn the NFT
        _burn(tokenId);
        delete positions[tokenId];
    }

    // Add a collect function to collect fees
function collect(
    uint256 tokenId,
    uint128 amount0Max,
    uint128 amount1Max
) external returns (uint256 amount0, uint256 amount1) {
    require(_isApprovedOrOwner(msg.sender, tokenId), "Not approved");
    Position storage position = positions[tokenId];
    
    (amount0, amount1) = UniswapV3Pool(position.pool).collect(
        msg.sender,
        position.tickLower,
        position.tickUpper,
        amount0Max,
        amount1Max
    );
}
}