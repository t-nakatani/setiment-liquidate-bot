// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from "../interface/IERC20.sol";
import {IMorpho} from "../interface/IMorpho.sol";
import {IMorphoFlashLoanCallback} from "../interface/IMorphoCallback.sol";
import {IPositionManager, AssetData, DebtData} from "../interface/IPositionManager.sol";

contract LiquidateEngine is IMorphoFlashLoanCallback {
    IMorpho public immutable morpho;
    IPositionManager public immutable positionManager;

    constructor(address _morpho, address _positionManager) {
        morpho = IMorpho(_morpho);
        positionManager = IPositionManager(_positionManager);
    }

    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external {

        uint256 totalRepayValue = 0;  // TODO: 

        // uint256 maxSeizeValue = totalRepayValue.mulDiv(1e18, (1e18 - LIQUIDATION_DISCOUNT));
        uint256 maxSeizeValue = 0;  // TODO: 

        address token = address(0);  // TODO: 

        DebtData[] memory debtData = new DebtData[](1);
        debtData[0] = DebtData({poolId: 0, amount: assets});

        AssetData[] memory assetData = new AssetData[](1);
        assetData[0] = AssetData({asset: token, amount: assets});

        IERC20(token).approve(address(morpho), assets);
        positionManager.liquidate(msg.sender, debtData, assetData);



        _swap(token, address(0), maxSeizeValue);

        _onMorphoFlashLoanCleanup(token, assets);
    }

    function _swap(address tokenIn, address tokenOut, uint256 amountIn) internal {
        // TODO: 
    }

    function _onMorphoFlashLoanCleanup(address token, uint256 assets) internal {
        IERC20(token).approve(address(morpho), assets);
    }
}
