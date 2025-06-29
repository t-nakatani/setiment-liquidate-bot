// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

struct DebtData {
    uint256 poolId;
    uint256 amount;
}

struct AssetData {
    address asset;
    uint256 amount;
}

interface IPositionManager {
    function liquidate(address position, DebtData[] calldata debtData, AssetData[] calldata assetData) external;
}

