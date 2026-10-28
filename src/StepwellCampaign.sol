// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StepwellCampaign
 * @author Road to Devcon Indore chapter
 * @notice A single-campaign assurance contract: "the meetup only happens if we all chip in".
 *
 *         Pledgers send ETH towards a fixed `target` before a fixed `deadline`. Nothing is
 *         released while the campaign is live. Afterwards exactly one of two things can happen,
 *         and the contract — not the organiser — decides which:
 *
 *           - `totalPledged >= target`  -> the beneficiary collects the whole pot, once.
 *           - `totalPledged <  target`  -> every pledger pulls back their own ETH, individually.
 *
 *         There is no owner, no admin, no pause, no cancel and no sweep. The beneficiary has a
 *         single privilege: the one-shot `collect()`. Nobody — including the organiser — can move
 *         pledgers' ETH in any other direction. That is the whole promise.
 *
 * @dev Design rules that this file deliberately follows:
 *      1. Checks-Effects-Interactions everywhere: every stored balance is zeroed (or the payout
 *         flag is set) *before* ETH leaves the contract.
 *      2. Pull, never push: refunds are claimed by each pledger for themselves. No function
 *         iterates over pledgers to send ETH, so the result never depends on gas limits or on
 *         one bad recipient blocking everybody else.
 *      3. Reentrancy guard on every function that sends ETH, as a second line of defence behind
 *         rule 1.
 *      4. Campaign terms are immutable, fixed at construction. There is no setter to audit.
 *      5. No `receive()`: plain transfers revert instead of silently trapping ETH in a contract
 *         that has no way to return it.
 *
 *      The file is intentionally dependency-free so it can be pasted into Remix as-is.
 */
contract StepwellCampaign {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /// @notice The four externally visible situations a campaign can be in.
    /// @dev `Active` covers "before deadline, under target" and "before deadline, over target".
    enum State {
        Active, //      pledges accepted, outcome not yet decided
        Succeeded, //   deadline passed, target reached, waiting for the beneficiary
        Failed, //      deadline passed, target missed, refunds open
        Collected //   deadline passed, target reached, beneficiary has been paid
    }

    // ---------------------------------------------------------------------
    // Campaign terms — written once in the constructor, immutable forever
    // ---------------------------------------------------------------------

    /// @notice Amount of wei that must be pledged for the campaign to succeed.
    uint256 public immutable target;

    /// @notice Unix timestamp (seconds) after which pledging closes and settlement opens.
    /// @dev Pledging is closed at exactly this second: `block.timestamp >= deadline` reverts.
    uint256 public immutable deadline;

    /// @notice The only address that can ever receive the collected pot.
    address payable public immutable beneficiary;

    /// @notice Timestamp at which the campaign was deployed, for UI timelines.
    uint256 public immutable createdAt;

    // ---------------------------------------------------------------------
    // Campaign state
    // ---------------------------------------------------------------------

    /// @notice Sum of every pledge ever made. Never decreases; it is the record of the outcome.
    uint256 public totalPledged;

    /// @notice Amount of wei each address has pledged and not yet refunded.
    mapping(address pledger => uint256 amount) public pledges;

    /// @notice True once the beneficiary has been paid. Also the one-shot latch for `collect`.
    bool public collected;

    /// @dev Reentrancy latch. 1 = unlocked, 2 = locked.
    uint256 private _lock = 1;

    // ---------------------------------------------------------------------
    // Events — everything the frontend needs to render history
    // ---------------------------------------------------------------------

    /// @notice Emitted for every accepted pledge.
    /// @param pledger the account that paid
    /// @param amount  wei credited, always equal to `msg.value`
    /// @param total   `totalPledged` after this pledge
    event Pledged(address indexed pledger, uint256 amount, uint256 total);

    /// @notice Emitted when a pledger takes their money back after a failed campaign.
    event Refunded(address indexed pledger, uint256 amount);

    /// @notice Emitted once, when the beneficiary collects a successful campaign.
    event Collected(address indexed beneficiary, uint256 amount);

    // ---------------------------------------------------------------------
    // Errors — cheap, and they say exactly why an action was refused
    // ---------------------------------------------------------------------

    /// @notice A pledge arrived at or after the deadline.
    error CampaignEnded(uint256 deadline);

    /// @notice Settlement was attempted before the deadline.
    error CampaignStillActive(uint256 deadline);

    /// @notice A zero-value pledge was attempted.
    error ZeroPledge();

    /// @notice The beneficiary tried to collect before the target was reached.
    error TargetNotMet(uint256 raised, uint256 target);

    /// @notice A pledger tried to refund even though the target was reached.
    error TargetAlreadyMet(uint256 raised, uint256 target);

    /// @notice The caller has no refundable pledge.
    error NothingToRefund();

    /// @notice The pot has already been paid out.
    error AlreadyCollected();

    /// @notice `collect()` was called by someone other than the beneficiary.
    error NotBeneficiary(address caller);

    /// @notice The outgoing ETH transfer failed.
    error TransferFailed();

    /// @notice Constructor arguments were unusable (zero target/beneficiary, past deadline).
    error InvalidCampaignTerms();

    /// @notice Reentrant call detected.
    error Reentrancy();

    /// @notice Plain ETH transfers are not pledges. Use `pledge()`.
    error UsePledgeFunction();

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    modifier onlyBeneficiary() {
        if (msg.sender != beneficiary) revert NotBeneficiary(msg.sender);
        _;
    }

    // ---------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------

    /**
     * @param target_      wei that must be pledged for the campaign to succeed (must be > 0).
     * @param deadline_    unix timestamp at which pledging closes (must be in the future).
     * @param beneficiary_ the address paid on success (must not be the zero address).
     */
    constructor(uint256 target_, uint256 deadline_, address payable beneficiary_) {
        if (target_ == 0 || beneficiary_ == address(0) || deadline_ <= block.timestamp) {
            revert InvalidCampaignTerms();
        }

        target = target_;
        deadline = deadline_;
        beneficiary = beneficiary_;
        createdAt = block.timestamp;
    }

    // ---------------------------------------------------------------------
    // Pledging
    // ---------------------------------------------------------------------

    /**
     * @notice Pledge `msg.value` wei to this campaign.
     * @dev The credited amount is always `msg.value` — there is no amount parameter to lie about.
     *      Reverts once the deadline has passed; repeated pledges from the same address accumulate.
     */
    function pledge() external payable nonReentrant {
        if (block.timestamp >= deadline) revert CampaignEnded(deadline);
        if (msg.value == 0) revert ZeroPledge();

        // Effects: credit exactly what was sent, then touch no external code.
        pledges[msg.sender] += msg.value;
        totalPledged += msg.value;

        emit Pledged(msg.sender, msg.value, totalPledged);
    }

    // ---------------------------------------------------------------------
    // Settlement — success
    // ---------------------------------------------------------------------

    /**
     * @notice Pay the entire pot to the beneficiary, once, after a successful campaign.
     * @dev Order of operations matters:
     *        1. `collected` is checked first, so a second call can never reach the transfer;
     *        2. `collected` is written before the transfer, so a reentrant call sees `true`;
     *        3. `nonReentrant` guards the external call as well.
     */
    function collect() external nonReentrant onlyBeneficiary {
        if (collected) revert AlreadyCollected();
        if (block.timestamp < deadline) revert CampaignStillActive(deadline);
        if (totalPledged < target) revert TargetNotMet(totalPledged, target);

        uint256 amount = totalPledged;

        // Effects before interaction.
        collected = true;
        emit Collected(beneficiary, amount);

        // The recipient is a fixed address chosen at construction, the latch is already set and
        // `nonReentrant` is active, so this call cannot re-enter into a second payout.
        // forge-lint: disable-next-line(reentrancy-eth)
        (bool ok,) = beneficiary.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ---------------------------------------------------------------------
    // Settlement — failure
    // ---------------------------------------------------------------------

    /**
     * @notice Reclaim the caller's own pledge after a campaign that missed its target.
     * @dev Only ever pays `msg.sender`, only ever pays what `msg.sender` put in, and zeroes the
     *      recorded balance before the transfer. There is no loop over pledgers anywhere in this
     *      contract, so a refund can never be blocked by another pledger's address.
     */
    function refund() external nonReentrant {
        if (block.timestamp < deadline) revert CampaignStillActive(deadline);
        if (totalPledged >= target) revert TargetAlreadyMet(totalPledged, target);

        uint256 amount = pledges[msg.sender];
        if (amount == 0) revert NothingToRefund();

        // Effects before interaction: the balance is gone before any ETH moves.
        pledges[msg.sender] = 0;
        emit Refunded(msg.sender, amount);

        // Safe by construction: the balance is already zero, watched by `nonReentrant`, and a
        // failed transfer reverts the whole call so the pledger keeps their recorded amount.
        // forge-lint: disable-next-line(reentrancy-eth)
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ---------------------------------------------------------------------
    // Views — everything the page needs, in one place
    // ---------------------------------------------------------------------

    /// @notice Current phase of the campaign.
    function state() external view returns (State) {
        if (collected) return State.Collected;
        if (block.timestamp < deadline) return State.Active;
        return totalPledged >= target ? State.Succeeded : State.Failed;
    }

    /// @notice Seconds left to pledge. Returns 0 once the deadline has passed.
    function timeRemaining() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    /// @notice Progress towards the target in basis points (10_000 = 100%), capped at 100%.
    function progressBps() external view returns (uint256) {
        uint256 raised = totalPledged;
        if (raised >= target) return 10_000;
        return (raised * 10_000) / target;
    }

    /// @notice True when the target has been reached (regardless of whether it was collected).
    function targetReached() external view returns (bool) {
        return totalPledged >= target;
    }

    /// @notice True when pledgers may claim refunds right now.
    function refundsOpen() external view returns (bool) {
        return block.timestamp >= deadline && totalPledged < target;
    }

    /// @notice One call that returns everything a page needs to render the campaign.
    function summary()
        external
        view
        returns (
            uint256 target_,
            uint256 deadline_,
            address beneficiary_,
            uint256 totalPledged_,
            uint256 pledgedByCaller,
            uint256 progressBps_,
            uint256 timeRemaining_,
            State state_,
            bool collected_
        )
    {
        target_ = target;
        deadline_ = deadline;
        beneficiary_ = beneficiary;
        totalPledged_ = totalPledged;
        pledgedByCaller = pledges[msg.sender];
        state_ = this.state();
        progressBps_ = this.progressBps();
        timeRemaining_ = this.timeRemaining();
        collected_ = collected;
    }

    // ---------------------------------------------------------------------
    // Guards against accidental ETH
    // ---------------------------------------------------------------------

    /// @dev A bare transfer is not a pledge and would be unattributable, so refuse it.
    receive() external payable {
        revert UsePledgeFunction();
    }
}
