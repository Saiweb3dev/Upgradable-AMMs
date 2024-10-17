// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UniswapProxy.sol";

// UniswapProxyV2 inherits from UniswapProxy and adds new functionality
contract UniswapProxyV2 is UniswapProxy {
    // New function to return the version of the contract
    function version() public pure returns (string memory) {
        return "v2";
    }

    // New function to swap token1 for an exact amount of token2
    // ... existing code ...

function swapExactOutputSingle(uint256 amountOut, uint256 amountInMaximum) external returns (uint256 amountIn) {
    // Transfer the maximum amount of token1 from the user to this contract
    IERC20(token1).transferFrom(msg.sender, address(this), amountInMaximum);
    // Approve the SwapRouter to spend token1
    IERC20(token1).approve(address(swapRouter), amountInMaximum);

    // Set up the parameters for the swap
    ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams({
        tokenIn: token1,
        tokenOut: token2,
        fee: poolFee,
        recipient: msg.sender,
        deadline: block.timestamp + 15,
        amountOut: amountOut,
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0
    });

    // Execute the swap and store the amount of token1 actually spent
    try swapRouter.exactOutputSingle(params) returns (uint256 _amountIn) {
        amountIn = _amountIn;
    } catch Error(string memory reason) {
        // If the swap fails, revert with the reason
        revert(string(abi.encodePacked("Swap failed: ", reason)));
    }

    // If we didn't spend the maximum amount, refund the remaining token1 to the user
    if (amountIn < amountInMaximum) {
        IERC20(token1).approve(address(swapRouter), 0);
        IERC20(token1).transfer(msg.sender, amountInMaximum - amountIn);
    }
}


}