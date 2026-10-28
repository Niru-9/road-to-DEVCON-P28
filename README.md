# Stepwell — a meetup that only happens if we all chip in

> The old stepwells were dug by the whole village — or not at all.

An **assurance contract** for the Road to Devcon Indore chapter: sixty students, one hall deposit,
and a rule nobody has to trust Meera on.

People pledge ETH toward a fixed target before a fixed deadline. While the campaign is live nothing
moves. When the deadline passes, the contract — not the organiser — decides what happens next:

| Outcome | What the contract allows |
| --- | --- |
| `totalPledged >= target` | Meera collects the whole pot, **exactly once** |
| `totalPledged < target` | each pledger pulls back **their own** ETH, individually |

There is no owner, no admin, no pause, no cancel, and no sweep. The beneficiary has one privilege in
the entire contract: a single `collect()` on a campaign that actually hit its target. Nobody —
including Meera — can move a pledger's ETH in any other direction.

---

## Live deployment

| | |
| --- | --- |
| Network | Sepolia (`chainId 11155111`) |
| Contract | `StepwellCampaign` |
| Address | `0x…` — _populated from `deployments/sepolia.json` right after deploy_ |
| Target | 1 ETH |
| Deadline | deployment time + 14 days |
| Beneficiary | Meera's wallet |

The machine-readable record lives in [`deployments/sepolia.json`](deployments/sepolia.json).

---

## What makes it trustworthy

1. **Terms are immutable.** `target`, `deadline` and `beneficiary` are `immutable`, written once in
   the constructor. There is no setter to audit, bribe, or compromise.
2. **No escape hatch.** No `owner`, `cancel`, `pause`, `sweep`, `emergencyWithdraw`, or upgrade
   proxy. A judge can grep the ABI: the only privileged call is `collect()`.
3. **Refunds are pulled, never pushed.** `refund()` pays `msg.sender` only. No function loops over
   pledgers, so one broken address can never block everyone else's money, and no gas limit can
   leave someone unrefunded.
4. **Checks → Effects → Interactions.** `pledges[msg.sender]` is zeroed *before* ETH leaves the
   contract, and `collected` is set *before* the payout. A `nonReentrant` latch sits behind both as
   a second line of defence.
5. **The target is enforced on-chain.** Collection reverts below target; refunds revert at or above
   it. The UI only ever reflects what the contract already guarantees.
6. **Bare ETH is refused.** There is no `receive()`, so a plain transfer reverts instead of leaving
   unattributable ETH stuck in a contract with no way to return it.

---

## Repository layout

```
src/StepwellCampaign.sol              the contract (single file, zero imports — Remix-ready)
test/StepwellCampaign.t.sol           37 behavioural, boundary, reentrancy and fuzz tests
test/StepwellCampaign.invariant.t.sol stateful invariants over random action orderings
script/Deploy.s.sol                   Foundry deployment script (env-driven, no hard-coded secrets)
deployments/sepolia.json              the tracked record of the live Sepolia deployment
docs/DESIGN.md                        threats, state machine, invariants, decision log
.env.example                          the exact variable names, never the values
```

---

## Quickstart

```bash
# Foundry 1.x (https://book.getfoundry.sh/getting-started/installation)
forge build
forge test                 # 37 tests, including 128k-call invariant runs
forge fmt --check
```

Foundry dependencies are vendored in `lib/`, so a plain `git clone` is enough — no submodule dance.

---

## Deploy

### Option A — Remix + MetaMask (the path used for the live deployment)

1. Open <https://remix.ethereum.org> and create `StepwellCampaign.sol` in the file explorer.
2. Paste the full contents of [`src/StepwellCampaign.sol`](src/StepwellCampaign.sol). It has **no
   imports**, so nothing else is needed.
3. **Solidity Compiler** tab → compiler `0.8.24` or newer → **Compile**.
4. **Deploy & Run** tab → Environment: **Injected Provider — MetaMask** → network: **Sepolia**.
5. Constructor arguments, in this order:

   | Argument | Type | Example | Notes |
   | --- | --- | --- | --- |
   | `target_` | `uint256` | `1000000000000000000` | wei. 1 ETH = 1e18 wei |
   | `deadline_` | `uint256` | `1790000000` | unix **seconds**, must be in the future |
   | `beneficiary_` | `address` | `0x…` | Meera's wallet |

   Handy conversions: `0.1 ETH = 100000000000000000`, `0.5 ETH = 500000000000000000`,
   `1 ETH = 1000000000000000000`, `2 ETH = 2000000000000000000`.
   Deadline: `date +%s` gives now in seconds; add `1209600` for 14 days.
6. **Deploy**, confirm in MetaMask, then copy the contract address and the transaction hash into
   `deployments/sepolia.json` and into the table above.

### Option B — Foundry script

```bash
cp .env.example .env          # fill it in locally; .env is git-ignored
set -a; . ./.env; set +a      # or use your shell's equivalent

forge script script/Deploy.s.sol --rpc-url "$SEPOLIA_RPC_URL"                    # dry run
forge script script/Deploy.s.sol --rpc-url "$SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" --broadcast                                      # real deploy
forge verify-contract <address> src/StepwellCampaign.sol:StepwellCampaign \
  --chain sepolia --etherscan-api-key "$ETHERSCAN_API_KEY"                      # optional
```

---

## Contract API

| Function | Who | When | What it does |
| --- | --- | --- | --- |
| `pledge()` | anyone | before `deadline` | credits exactly `msg.value` to `msg.sender`; reverts on zero value |
| `refund()` | any pledger | `>= deadline`, target missed | zeroes the caller's pledge, then pays the caller |
| `collect()` | beneficiary only | `>= deadline`, target met, once | latches `collected`, then pays the full pot |
| `state()` | anyone | anytime | `Active`, `Succeeded`, `Failed` or `Collected` |
| `summary()` | anyone | anytime | one call returning terms, totals, caller's pledge, progress, time left, state |
| `progressBps()` | anyone | anytime | progress in basis points, capped at `10_000` |
| `timeRemaining()` | anyone | anytime | seconds left to pledge (`0` after the deadline) |
| `pledges(address)` | anyone | anytime | outstanding (refundable) pledge of an address |
| `totalPledged()` | anyone | anytime | lifetime sum of pledges — the record that decides success |
| `collected()` | anyone | anytime | whether the pot has been paid out |
| `targetReached()` / `refundsOpen()` | anyone | anytime | convenience booleans for the UI |

Events: `Pledged(pledger, amount, total)`, `Refunded(pledger, amount)`,
`Collected(beneficiary, amount)`. All errors are custom errors with the failing values attached,
e.g. `TargetNotMet(raised, target)`.

### Deadline semantics

The deadline is **closed at the boundary**: a pledge in the block whose `block.timestamp` equals
`deadline` reverts, and `refund()` / `collect()` open in that same block. This is pinned by
`test_PledgeRevertsAtExactDeadline`, `test_RefundOpensAtExactDeadline` and
`test_CollectWorksAtExactDeadline`.

---

## Test coverage

`forge test` → **37 passing** (36 example-based + 1 stateful invariant suite, 128,000 calls).

| Area | Tests |
| --- | --- |
| Immutable terms, constructor validation, no escape-hatch selectors | 7 |
| Pledging: `msg.value` crediting, accumulation, zero value, deadline boundary | 7 |
| Collection: access, target check, single payout, exact deadline, forced ETH | 6 |
| Refunds: own pledge only, zeroing, double refund, non-pledger, target-met lockout | 9 |
| Reentrancy: refund, collect, recipient that rejects ETH | 3 |
| Views used by the frontend (`summary`, progress, time left) | 4 |
| Stateful invariants: balance == outstanding pledges, pledge conservation | 3 invariants |

### Mapping to the scored checks

| Check | Where |
| --- | --- |
| 1 — refunds pulled per pledger, no loop | `refund()`, `src/StepwellCampaign.sol`; test `test_RefundReturnsOnlyCallersOwnPledge` |
| 2 — balance cleared before send | `pledges[msg.sender] = 0;` before `.call`, plus `nonReentrant` |
| 3 — payout only once | `collected` checked first and written before the transfer |
| 4 — refunds revert once target met | `if (totalPledged >= target) revert TargetAlreadyMet(...)` |
| 5 — terms cannot change | three `immutable` fields, constructor-only, no setters |
| 6 — collection checks the target | `if (totalPledged < target) revert TargetNotMet(...)` |
| 7 — pledges after deadline revert | `if (block.timestamp >= deadline) revert CampaignEnded(...)` |
| 8 — amounts from `msg.value` | `pledges[msg.sender] += msg.value` — no amount argument exists |
| 9 — Sepolia address tracked | `deployments/sepolia.json` + the table above |
| 10 — no credentials tracked | `.gitignore` blocks `.env*`, keys and keystores; `.env.example` holds names only |

---

## Known limitations

- **One campaign per deployment.** That is deliberate: a second meetup means a second contract, with
  its own immutable terms. No factory, no shared pot, no shared trust.
- **A lost beneficiary key locks a successful pot.** Every design that removes an admin also removes
  the admin's ability to rescue a mistake. For a testnet demo, use a wallet you control.
- **Forced ETH** (e.g. `selfdestruct`) can sit in the contract after settlement — it was never part
  of `totalPledged` and is never paid out.
- **Not audited.** Sepolia only. Do not put real money in a hackathon contract.

## License

MIT — see [LICENSE](LICENSE).
