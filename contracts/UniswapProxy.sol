// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// UniswapProxy is an upgradeable contract that interacts with Uniswap V3
contract UniswapProxy is Initializable, OwnableUpgradeable {
    // Uniswap V3 SwapRouter interface
    ISwapRouter public swapRouter;
    // Addresses of the two tokens we're swapping between
    address public token1;
    address public token2;
    // Fee tier for the Uniswap V3 pool
    uint24 public poolFee;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Prevents the implementation contract from being initialized
        _disableInitializers();
    }

    // Initialize function replaces the constructor for upgradeable contracts
    function initialize(address _swapRouter, address _token1, address _token2, uint24 _poolFee) public initializer {
        // Initialize the OwnableUpgradeable contract
        __Ownable_init(msg.sender);
        // Set the contract's state variables
        swapRouter = ISwapRouter(_swapRouter);
        token1 = _token1;
        token2 = _token2;
        poolFee = _poolFee;
    }

    // Function to swap an exact amount of token1 for token2
    function swapExactInputSingle(uint256 amountIn) external returns (uint256 amountOut) {
        // Transfer token1 from the user to this contract
        IERC20(token1).transferFrom(msg.sender, address(this), amountIn);
        // Approve the SwapRouter to spend token1
        IERC20(token1).approve(address(swapRouter), amountIn);

        // Set up the parameters for the swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: token1,
            tokenOut: token2,
            fee: poolFee,
            recipient: msg.sender,
            deadline: block.timestamp + 15,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        // Execute the swap and return the amount of token2 received
        amountOut = swapRouter.exactInputSingle(params);
    }
}