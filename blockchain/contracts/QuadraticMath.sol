// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title QuadraticMath
 * @notice Integer square root library using the Babylonian method.
 *         Used by Campaign.sol to compute quadratic voting power.
 *
 * QV Formula: votingPower = sqrt(contributionInWei)
 *
 * Precision note: since 1 MATIC = 1e18 wei, sqrt(1e18) = 1e9.
 * So a donor contributing 1 MATIC gets 1,000,000,000 units of voting power.
 * The contract stores and compares raw sqrt(wei) values — no additional
 * scaling is applied here; the frontend divides by 1e9 for display.
 */
library QuadraticMath {
    /**
     * @notice Compute the integer square root of a uint256 value using
     *         the Babylonian / Heron's method (gas-efficient, no loops > O(log n)).
     * @param x  Input value (in wei)
     * @return y  Floor of sqrt(x)
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        if (x == 1) return 1;

        // Initial estimate using bit-shift
        uint256 z = x;
        y = (x + 1) >> 1;

        // Newton-Raphson iterations — converges in < 128 steps for uint256
        while (y < z) {
            z = y;
            y = (x / y + y) >> 1;
        }
        // y is now floor(sqrt(x))
    }

    /**
     * @notice Compute quadratic voting power for a given contribution.
     *         Power = floor(sqrt(amountWei))
     *         Example: 100 MATIC (100e18 wei) → sqrt(100e18) = 10e9 = 10,000,000,000 units
     * @param amountWei  Contribution amount in wei
     * @return power     Quadratic voting power (integer, no decimals)
     */
    function computeQVPower(uint256 amountWei) internal pure returns (uint256 power) {
        return sqrt(amountWei);
    }
}
