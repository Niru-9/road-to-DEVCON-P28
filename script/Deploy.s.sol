// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StepwellCampaign} from "../src/StepwellCampaign.sol";

/**
 * @notice Deploys one StepwellCampaign and prints everything needed to fill in
 *         `deployments/sepolia.json` and the frontend config.
 *
 * @dev Configuration comes from the environment (see `.env.example`):
 *        CAMPAIGN_BENEFICIARY   address that receives the pot on success   (required)
 *        CAMPAIGN_TARGET_ETH    funding target in whole ETH                 (default 1)
 *        CAMPAIGN_DURATION_DAYS days between deployment and the deadline    (default 14)
 *        PRIVATE_KEY            only read by `--broadcast` / `--private-key`, never by this file
 *
 *      Simulate (no funds, no key needed):
 *        forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL
 *
 *      Broadcast:
 *        forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL \
 *          --private-key $PRIVATE_KEY --broadcast
 *
 *      Remix users do not need this script: open `src/StepwellCampaign.sol`, compile with
 *      Solidity 0.8.24+, and pass the same three constructor arguments in the deploy panel.
 */
contract DeployStepwell is Script {
    function run() external returns (StepwellCampaign campaign) {
        address payable beneficiary = payable(vm.envAddress("CAMPAIGN_BENEFICIARY"));
        uint256 targetEth = vm.envOr("CAMPAIGN_TARGET_ETH", uint256(1));
        uint256 durationDays = vm.envOr("CAMPAIGN_DURATION_DAYS", uint256(14));

        uint256 target = targetEth * 1 ether;
        uint256 deadline = block.timestamp + durationDays * 1 days;

        vm.startBroadcast();
        campaign = new StepwellCampaign(target, deadline, beneficiary);
        vm.stopBroadcast();

        console.log("");
        console.log("StepwellCampaign deployed");
        console.log("  address      :", address(campaign));
        console.log("  target (wei) :", target);
        console.log("  deadline     :", deadline);
        console.log("  beneficiary  :", beneficiary);
        console.log("");
        console.log("Record the address in deployments/sepolia.json and in README.md.");
    }
}
