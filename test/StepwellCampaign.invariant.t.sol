// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StepwellCampaign} from "../src/StepwellCampaign.sol";

/**
 * @notice Stateful fuzz test for the contract's core accounting promise:
 *         the ETH actually held by the contract always equals the sum of the pledges it still
 *         owes, and `totalPledged` only ever grows by pledges and shrinks (in balance terms) by
 *         refunds. Any ordering of pledge / refund / collect / time-warp must preserve that.
 */
contract StepwellCampaignInvariantTest is Test {
    StepwellCampaign internal campaign;
    CampaignHandler internal handler;

    address payable internal meera = payable(makeAddr("meera"));

    function setUp() public {
        vm.warp(1_800_000_000);
        campaign = new StepwellCampaign(1 ether, block.timestamp + 3 days, meera);
        handler = new CampaignHandler(campaign, meera);

        targetContract(address(handler));
    }

    /// @notice Contract balance is exactly the outstanding pledge total (or zero once collected).
    function invariant_BalanceMatchesOutstandingPledges() public view {
        uint256 outstanding = handler.sumOutstandingPledges();
        if (campaign.collected()) {
            assertEq(address(campaign).balance, 0);
        } else {
            assertEq(address(campaign).balance, outstanding);
        }
    }

    /// @notice Every wei that left the contract is accounted for as a refund or the single payout.
    function invariant_TotalPledgedIsConserved() public view {
        uint256 outstanding = handler.sumOutstandingPledges();
        if (campaign.collected()) {
            // Success and refunds are mutually exclusive: a collected campaign never refunded.
            assertEq(handler.totalRefunded(), 0);
            assertEq(meera.balance, campaign.totalPledged());
        } else {
            assertEq(campaign.totalPledged(), outstanding + handler.totalRefunded());
        }
    }

    /// @notice Collecting is impossible before the deadline and impossible when under target.
    function invariant_CollectedImpliesTargetAndDeadline() public view {
        if (campaign.collected()) {
            assertGe(campaign.totalPledged(), campaign.target());
            assertGe(block.timestamp, campaign.deadline());
        }
    }
}

contract CampaignHandler is Test {
    StepwellCampaign public immutable campaign;
    address payable public immutable beneficiary;

    address[3] public actors;
    uint256 public totalRefunded;

    constructor(StepwellCampaign campaign_, address payable beneficiary_) {
        campaign = campaign_;
        beneficiary = beneficiary_;

        actors[0] = makeAddr("actor0");
        actors[1] = makeAddr("actor1");
        actors[2] = makeAddr("actor2");

        vm.deal(actors[0], 100 ether);
        vm.deal(actors[1], 100 ether);
        vm.deal(actors[2], 100 ether);
    }

    function pledge(uint256 actorSeed, uint256 amount) external {
        address actor = actors[actorSeed % 3];
        amount = bound(amount, 1, 10 ether);

        vm.prank(actor);
        try campaign.pledge{value: amount}() {} catch {}
    }

    function refund(uint256 actorSeed) external {
        address actor = actors[actorSeed % 3];
        uint256 recorded = campaign.pledges(actor);

        vm.prank(actor);
        try campaign.refund() {
            totalRefunded += recorded;
        } catch {}
    }

    function collect() external {
        vm.prank(beneficiary);
        try campaign.collect() {} catch {}
    }

    function warp(uint256 secondsForward) external {
        vm.warp(block.timestamp + bound(secondsForward, 0, 2 days));
    }

    function sumOutstandingPledges() external view returns (uint256 sum) {
        for (uint256 i = 0; i < 3; i++) {
            sum += campaign.pledges(actors[i]);
        }
    }
}
