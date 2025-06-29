// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPool {
    struct PoolData {
        bool isPaused;
        address asset;
        address rateModel;
        uint256 borrowCap;
        uint256 depositCap;
        uint256 lastUpdated;
        uint256 interestFee;
        uint256 originationFee;
        uint256 totalBorrowAssets;
        uint256 totalBorrowShares;
        uint256 totalDepositAssets;
        uint256 totalDepositShares;
    }

    function poolDataFor(uint256 poolId) external view returns (PoolData memory);
}
