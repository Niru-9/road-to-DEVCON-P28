The Meetup That Only Happens If We All Chip In
Meera runs the Road to Devcon chapter in Indore. Before Devcon 8 she wants to host a full-day Ethereum workshop for sixty college students, but the hall needs a deposit she can't front herself. Last time she collected pledges over UPI in a WhatsApp group. Half the people never paid, and she covered the gap from her own savings.

This time she wants a rule nobody has to trust her on. People pledge toward a target before a deadline. If the target is reached, the deposit goes to Meera. If it isn't, every pledger gets their money back, without asking her and without her being able to stop it.

The old stepwells were dug by the whole village or not at all. Build the onchain version of that promise.

What you'll learn

How assurance contracts turn "I'll chip in if others do" into a commitment anyone can enforce
How to design payout and refund paths that stay safe no matter who calls what, or in what order
How to make a contract's guarantee clear to people who have never used a wallet
What to do

Write a contract for a single campaign with a target, a deadline, and a beneficiary.
Let anyone pledge ETH before the deadline.
After the deadline, let the beneficiary collect the funds if the target was met. Let pledgers recover their pledges if it wasn't.
Deploy to Sepolia and record the deployed address in your repo.
Build a page Meera could drop into her WhatsApp group. It should show progress and time left, and let people pledge and claim refunds.
Stretch: Make it a dominant assurance contract. Meera locks a small bonus up front, and if the campaign fails, pledgers get their refund plus a share of the bonus.
Deliverable. A public GitHub repo with the contract, a deploy script, the deployed Sepolia address, and the frontend.

Acceptance criteria

A student in Meera's group pledges from their phone, and whatever happens at the deadline, either Meera gets the deposit or everyone gets their money back, with no one trusting anyone.
10 scored test cases · 80 points are read straight off your code — open the Test cases tab to see exactly what they are before you build.

Suggested stack

Solidity
Foundry
Scaffold-ETH 2
viem
Sepolia


harness to use and download 
Get started
npx loopshouse add road-to-devcon-xi
Copy
Before you run it

Needs Node 20.12+ (22 LTS recommended) — check with node -v, and switch with nvm use 22if you're older. Sign-in opens in your browser (Google, GitHub, or an email code) — nothing to copy or paste.

Run it in your project directory — it installs this battle's agent skill and signs you in, then you build with your own coding agent.

How to use
Via CLI
Query this problem's knowledge graph straight from your terminal:

loops knowledge query --event road-to-devcon-xi --problem meetup-assurance-contract -q "<your question>"
Copy
Via IDE
Once the skill is installed, your coding agent knows this battle — just ask it in plain English inside your IDE:

Ask the "The Meetup That Only Happens If We All Chip In" knowledge graph: <your question>



testes 
Test cases

10

Points from checks

80 /100

Points from judgment

20

Each check is answered by reading the repo you submit — pass it, bank its points.

1.Refunds are claimed by each pledger, not pushed in a loop

15
Passes if A pledger calls a function that sends their own recorded pledge to msg.sender, and no function loops over pledgers to send ETH.

Fails if Refunds are sent by iterating over pledgers in one function, refunds can only be triggered by the beneficiary or an owner, or the contract has no refund path at all.

2.Refund clears the pledger's balance before sending ETH

15
Passes if The pledger's recorded amount is zeroed (or decremented) before the ETH transfer, or the refund function carries a reentrancy guard such as nonReentrant.

Fails if The recorded amount is cleared only after the external call and the function has no reentrancy guard, or there is no refund function.

3.Beneficiary payout can execute only once

10
Passes if A flag or stored total is written before the transfer and checked at the top of the function, so a second call reverts or sends nothing.

Fails if A second call can send funds again, the flag is written only after the external call with no reentrancy guard, or there is no beneficiary payout function.

4.Refunds revert once the target has been met

8
Passes if The refund function reverts whenever the total pledged is at or above the target.

Fails if Pledgers can take a refund even though the target was met, or there is no refund function.

5.Campaign terms cannot be changed after launch

7
Passes if The target, deadline and beneficiary are written only in the constructor or campaign-creation function (or are immutable), and no other function can modify them.

Fails if Any function lets an owner or anyone else change the target, deadline or beneficiary after creation, or the contract stores no campaign terms at all.

6.Beneficiary collection checks the target in the contract

6
Passes if Collection reverts unless the total pledged is at or above the target.

Fails if The target check exists only in the frontend, the beneficiary can collect regardless of the total, or there is no collect function.

7.Pledges after the deadline revert

6
Passes if The pledge function reverts when block.timestamp is past the deadline.

Fails if The deadline is enforced only in the UI, the pledge function has no time check, or the contract stores no deadline.

8.Pledge amounts are recorded from msg.value

5
Passes if The amount credited to the pledger is msg.value.

Fails if The credited amount comes from a function argument, the pledge function is not payable, or there is no pledge function.

9.Deployed Sepolia address is recorded in the repo

4
Passes if A contract address for the Sepolia deployment appears in a tracked file.

Fails if No deployed contract address appears anywhere in the repo.

10.No credentials appear in any tracked file

4
Passes if No private key, seed phrase, API key, or authenticated RPC URL appears in any tracked file.

Fails if Any such credential appears in a tracked file.