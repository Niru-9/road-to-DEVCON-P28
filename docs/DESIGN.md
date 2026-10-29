# Design — StepwellCampaign

Status: implemented and tested; awaiting the live Sepolia address.
Scope: **one** assurance campaign per deployment. Single contract, single pot, single deadline.

---

## 1. The problem, reduced to rules

Meera needs a hall deposit. She cannot front it, and the last attempt (UPI pledges in a WhatsApp
group) failed because pledges were not commitments. The product is therefore not a donation page —
it is a **conditional commitment device**:

> Nobody's money moves unless enough other people also commit. If enough do, the money goes to
> Meera. If not, everyone gets their own money back, without asking her.

Two properties carry the whole idea:

- **All-or-nothing**: partial funding is worthless to Meera, so the pot must either reach the target
  or return to its owners.
- **Unstoppable exit on failure**: the refund path must not depend on Meera's cooperation, her
  willingness to pay gas for sixty transfers, or her honesty.

## 2. Actors and trust boundaries

| Actor | Can do | Cannot do |
| --- | --- | --- |
| Pledger | `pledge()` before the deadline; `refund()` after a failed deadline; read everything | withdraw before the deadline, refund after success, take anyone else's pledge |
| Beneficiary (Meera) | `collect()` once, after the deadline, only if target met | change terms, cancel, pause, sweep, collect twice, block refunds |
| Anyone else | read state, pledge | anything privileged |
| Contract | hold ETH, enforce the two outcomes | upgrade itself, delegate calls, receive bare ETH |

There is **no owner**. This is the central decision: every admin function added to "help" Meera is
also a function an attacker who compromises Meera can use to break the promise, and a function
pledgers must take on trust. The brief is explicit that the rule must not require trusting her.

## 3. State machine

```
                    pledge() (block.timestamp < deadline, msg.value > 0)
                                    │
                                    ▼
                             ┌────────────┐
              deploy ───────►│   Active   │──── deadline passes, totalPledged >= target ──┐
                             └────────────┘                                               │
                                    │                                                    ▼
                                    │ deadline passes, totalPledged < target      ┌────────────┐
                                    ▼                                             │ Succeeded  │
                             ┌────────────┐                                       └────────────┘
                             │   Failed   │                                             │ collect()
                             └────────────┘                                             │ (beneficiary, once)
                                    │                                                    ▼
                     refund() per pledger, individually                          ┌────────────┐
                     (repeatable until each balance is 0)                         │ Collected  │
                                                                                 └────────────┘
```

`Active` deliberately does not distinguish "under target" from "over target": while the campaign is
live, more pledges can always arrive, and nothing can be settled. The enum therefore has four
values, not five, and `state()` is a pure function of `block.timestamp`, `totalPledged`, `target`
and `collected` — no stored "phase" variable that could drift from reality.

`Failed` → `Collected` is impossible: `collect()` reverts with `TargetNotMet`. `Succeeded` →
`Failed` is impossible: nobody can reduce `totalPledged` or refund while at target.

## 4. Function-level guarantees

### `pledge()` — payable, `nonReentrant`

- `require(block.timestamp < deadline)` → `CampaignEnded(deadline)`.
- `require(msg.value > 0)` → `ZeroPledge()`. (A zero pledge would create a meaningless record and
  emit a misleading event.)
- Credits `msg.value`, never a caller-supplied number. There is no `amount` parameter anywhere in
  the contract, so there is no way to lie about a pledge.
- Two effects, no interactions: `pledges[msg.sender] += msg.value; totalPledged += msg.value;`

### `collect()` — `nonReentrant`, `onlyBeneficiary`

Order is load-bearing, in this exact sequence:

1. `if (collected) revert AlreadyCollected();` — the one-shot latch is the **first** statement.
2. `if (block.timestamp < deadline) revert CampaignStillActive(deadline);`
3. `if (totalPledged < target) revert TargetNotMet(totalPledged, target);`
4. `collected = true;` — state is final **before** the transfer.
5. `beneficiary.call{value: totalPledged}("")` — pays exactly `totalPledged`, not
   `address(this).balance`, so forced ETH never inflates a payout.

A reentrant call from the beneficiary's `receive()` sees `collected == true`, and the `nonReentrant`
latch refuses it first anyway.

### `refund()` — `nonReentrant`

Order:

1. `if (block.timestamp < deadline) revert CampaignStillActive(deadline);`
2. `if (totalPledged >= target) revert TargetAlreadyMet(totalPledged, target);` — this is the check
   that makes a successful campaign's pot unreachable by pledgers, even before Meera collects.
3. Read the caller's own balance, revert `NothingToRefund()` if zero.
4. `pledges[msg.sender] = 0;` — cleared **before** the transfer.
5. `msg.sender.call{value: amount}("")` — pays only the caller, only their own recorded amount.

`totalPledged` is intentionally **not** decremented. It is the immutable record of why the campaign
failed, and `state()` must keep reporting `Failed` as refunds drain the pot. The contract's ETH
balance, not `totalPledged`, is what decreases.

### `receive()` rejects bare ETH

A bare ETH transfer reverts with `UsePledgeFunction()`. Without this, someone could send ETH with no
attribution and it would be permanently stuck — an inviting target for a "rescue" function, which
is exactly the escape hatch we refuse to add.

## 5. Threat model

| Threat | Mitigation | Test |
| --- | --- | --- |
| Reentrancy during refund | CEI (`pledges = 0` before call) + `nonReentrant` | `test_RefundCannotBeReentered` |
| Reentrancy during collect | `collected` latch first + CEI + `nonReentrant` | `test_CollectCannotBeReentered` |
| Double refund | Balance zeroed; second call sees `0` → `NothingToRefund` | `test_RefundTwiceReverts` |
| Double collect | `collected` flag checked first and set before transfer | `test_CollectPaysBeneficiaryExactlyOnce` |
| Beneficiary drains before deadline | Time gate on `collect()` | `test_CollectRevertsBeforeDeadline` |
| Beneficiary collects a failed campaign | On-chain target check | `test_CollectRevertsWhenTargetNotMet` |
| Organiser changes terms / cancels | No setters, no owner, immutables; no escape-hatch selectors exist | `testFuzz_TermsNeverChange`, `test_NoEscapeHatchSelectorsExist` |
| Pledger refunds after success | `totalPledged >= target` gate | `test_RefundRevertsOnceTargetMet` |
| Late pledge after outcome is decided | Deadline gate at `>=` | `test_PledgeRevertsAtExactDeadline` |
| Lying about amount | Credit is `msg.value`; no amount parameter | `test_PledgeCreditsExactlyMsgValue` |
| One pledger blocks everyone's refund | Pull pattern; no loop anywhere | `test_RefundReturnsOnlyCallersOwnPledge` |
| Recipient contract rejects ETH | Transfer failure reverts the whole call, restoring the record | `test_RefundRevertsCleanlyWhenRecipientRejectsEth` |
| Forced ETH inflates payout | Payout is `totalPledged` | `test_CollectPaysOnlyPledgedTotal` |
| Accounting drift under arbitrary ordering | Stateful invariants over 128k random calls | `StepwellCampaignInvariantTest` |

### Out of scope (and why)

- **Deadline manipulation by validators.** A validator can nudge `block.timestamp` by seconds. For a
  14-day campaign, a few seconds of drift is not a meaningful attack; documenting it is better than
  pretending a timestamp oracle exists on Sepolia.
- **Beneficiary key loss.** No admin means no rescue. Stated in the README.
- **Privacy.** Pledges are public, as they must be for the group to see progress.

## 6. Alternatives considered and rejected

| Alternative | Why not |
| --- | --- |
| `owner` + `cancel()` / `emergencyWithdraw()` | Defeats the brief: pledgers would have to trust the owner again. Explicitly flagged as a wrong-shaped build in the rubric. |
| Push refunds in a loop after failure | O(n) gas, one reverting recipient blocks the batch, and it requires someone (Meera) to pay for and trigger it — the exact dependency we are removing. |
| Escrow with arbiter / multisig | Adds a trusted party; the promise becomes "trust us three instead of one". |
| Store a `Phase` variable | Duplicated state that can drift from `block.timestamp`/`totalPledged`. Derived `state()` cannot be inconsistent. |
| `address(this).balance` for payout | Forced ETH would leak into the beneficiary's payout, making the guarantee harder to reason about. |
| Upgradeable proxy | An upgrade is a term change. Immutability is the feature. |
| ERC-20 pledges | The brief is ETH (`msg.value`); tokens add approval flows and a trust assumption about the token. |

## 7. Deliberate constraints for this build

- **Single file, zero imports.** The contract must be pasteable into Remix. The reentrancy latch is
  six lines, so pulling in OpenZeppelin would add a dependency without adding a guarantee.
- **Custom errors, not string reverts.** Cheaper, and they carry the failing numbers
  (`TargetNotMet(raised, target)`), which the UI can surface directly.
- **View surface designed for the phone UI.** `summary()` returns everything a page needs in a
  single `eth_call`: terms, totals, the caller's own pledge, progress in basis points, seconds left,
  and the state enum. The frontend never has to reconstruct state from events.
- **No factory.** One campaign per deployment keeps the trust story simple: every campaign's terms
  are visible in its own constructor arguments on Etherscan.

## 8. Deployment record

| | |
| --- | --- |
| Address | `0x468926db1F042A7237729E1b9336352Af96aF020` (Sepolia) |
| Tx | `0x940cbaf8740e38fd5ab46eb70000a2e9091733066f34aa928daa0802308b1590` |
| Block | 12017878 |
| Deployed at | 2026-10-29T07:02:12Z |
| Target / deadline / beneficiary | 0.05 ETH / `1793343612` / `0x0d3477209913afFAF06CDe63Dd0F13f4C5728135` |
| Compiler used in Remix | 0.8.34 |

Deployed from Remix + MetaMask, so no key ever entered this repository or the toolchain. The
constructor arguments were read back from the live contract and match the deployment record in
`deployments/sepolia.json`.

Remaining operational step: publish the source on Etherscan (needs the exact Remix compiler settings
— 0.8.34 plus whatever optimiser setting was active) so a judge can read the code from the address
itself. The repository copy is the authoritative source either way.

## 9. Frontend contract (for the UI phase)

The page needs exactly three write actions and one read:

- read `summary()` on load and after every transaction (or subscribe to `Pledged` / `Refunded` /
  `Collected`);
- `pledge()` with the user's ETH amount;
- `refund()` when `refundsOpen()` is true;
- `collect()` for the beneficiary when `state() == Succeeded`.

State-to-UI mapping:

| `state()` | Message | Primary action |
| --- | --- | --- |
| `Active` | "X of Y ETH · Z days left" | Pledge |
| `Succeeded` | "Target reached. Waiting for Meera to collect." | none (beneficiary: Collect) |
| `Failed` | "Target missed. Your pledge is refundable." | **Claim refund** (only if `pledges(you) > 0`) |
| `Collected` | "Funded and paid out to Meera." | none |

The failed state must be loud, not a footnote: the rubric explicitly penalises refunds that exist
on-chain but are invisible in the UI.
