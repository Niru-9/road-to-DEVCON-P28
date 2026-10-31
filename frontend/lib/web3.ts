import {
  getActiveContractAddress,
  DEFAULT_STEPWELL_ADDRESS,
  STEPWELL_ABI,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_RPC_ENDPOINTS,
  CampaignState,
} from "./contracts";

export function formatWeiToEth(wei: bigint): string {
  const etherString = wei.toString().padStart(19, "0");
  const whole = etherString.slice(0, etherString.length - 18) || "0";
  const fraction = etherString.slice(etherString.length - 18, etherString.length - 14);
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function parseEthToWei(eth: string): bigint {
  try {
    const parts = eth.trim().split(".");
    const whole = BigInt(parts[0] || "0");
    let fractionStr = parts[1] || "";
    if (fractionStr.length > 18) {
      fractionStr = fractionStr.slice(0, 18);
    } else {
      fractionStr = fractionStr.padEnd(18, "0");
    }
    const fraction = BigInt(fractionStr);
    return whole * 10n ** 18n + fraction;
  } catch {
    return 0n;
  }
}

export interface CampaignSummaryData {
  contractAddress: string;
  target: bigint;
  deadline: bigint;
  beneficiary: string;
  totalPledged: bigint;
  pledgedByCaller: bigint;
  progressBps: bigint;
  timeRemaining: bigint;
  state: CampaignState;
  collected: boolean;
  targetEth: string;
  totalPledgedEth: string;
  percentFunded: number;
  formattedDeadline: string;
  isExpired: boolean;
  contributorCount: number;
}


/**
 * Fetch campaign data from Sepolia using standard public JSON-RPC endpoints.
 */
export async function getLiveCampaignSummary(
  userAddress?: string,
  overrideAddress?: string
): Promise<CampaignSummaryData> {
  const currentContract = (overrideAddress || getActiveContractAddress()) as `0x${string}`;

  let target = 50000000000000000n;
  let deadline = 1793343612n;
  let beneficiary = "0x0d3477209913afFAF06CDe63Dd0F13f4C5728135";
  let totalPledged = 0n;
  let pledgedByCaller = 0n;
  let collected = false;
  let state = CampaignState.Active;
  let progressBps = 0n;
  let contributorCount = 0;

  for (const rpc of SEPOLIA_RPC_ENDPOINTS) {
    try {
      // 1. Fetch totalPledged() - selector 0x55468ba4
      const totalPledgedRes = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            {
              to: currentContract,
              data: "0x55468ba4",
            },
            "latest",
          ],
        }),
      });

      const totalPledgedJson = await totalPledgedRes.json();
      if (totalPledgedJson.result) {
        totalPledged = BigInt(totalPledgedJson.result);
      }

      // 2. Fetch state() - selector 0xc19d93fb
      const stateRes = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "eth_call",
          params: [
            {
              to: currentContract,
              data: "0xc19d93fb",
            },
            "latest",
          ],
        }),
      });
      const stateJson = await stateRes.json();
      if (stateJson.result) {
        state = Number(BigInt(stateJson.result)) as CampaignState;
      }

      // 3. Fetch deadline() - selector 0x29dcb0cf
      const dlRes = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "eth_call",
          params: [
            {
              to: currentContract,
              data: "0x29dcb0cf",
            },
            "latest",
          ],
        }),
      });
      const dlJson = await dlRes.json();
      if (dlJson.result) {
        deadline = BigInt(dlJson.result);
      }

      // 4. Fetch target() - selector 0xd4b83992
      const targetRes = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "eth_call",
          params: [
            {
              to: currentContract,
              data: "0xd4b83992",
            },
            "latest",
          ],
        }),
      });
      const targetJson = await targetRes.json();
      if (targetJson.result) {
        target = BigInt(targetJson.result);
      }

      // 5. Fetch beneficiary() - selector 0x38af3eed
      const benRes = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          method: "eth_call",
          params: [
            {
              to: currentContract,
              data: "0x38af3eed",
            },
            "latest",
          ],
        }),
      });
      const benJson = await benRes.json();
      if (benJson.result) {
        beneficiary = "0x" + benJson.result.slice(-40);
      }

      // 6. Fetch caller pledge if address provided - selector 0x343576f5
      if (userAddress && userAddress.startsWith("0x")) {
        const cleanAddr = userAddress.toLowerCase().replace("0x", "").padStart(64, "0");
        const pledgesRes = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 6,
            method: "eth_call",
            params: [
              {
                to: currentContract,
                data: `0x343576f5${cleanAddr}`,
              },
              "latest",
            ],
          }),
        });
        const pledgesJson = await pledgesRes.json();
        if (pledgesJson.result) {
          pledgedByCaller = BigInt(pledgesJson.result);
        }
      }

      // 7. Query unique contributors via Pledged events
      try {
        const blkRes = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "eth_blockNumber", params: [] }),
        });
        const blkJson = await blkRes.json();
        if (blkJson.result) {
          const currentBlock = parseInt(blkJson.result, 16);
          const fromBlock = Math.max(12017878, currentBlock - 20000);
          const logsRes = await fetch(rpc, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 8,
              method: "eth_getLogs",
              params: [
                {
                  address: currentContract,
                  topics: ["0xb8765119b6cc15a7b5d15b95f6c505f2f3c24754824af1892788aad4c0e9945f"],
                  fromBlock: "0x" + fromBlock.toString(16),
                  toBlock: "latest",
                },
              ],
            }),
          });
          const logsJson = await logsRes.json();
          if (Array.isArray(logsJson.result)) {
            const uniqueAddrs = new Set(logsJson.result.map((l: any) => l.topics[1]?.toLowerCase()));
            contributorCount = uniqueAddrs.size;
          }
        }
      } catch {
        // Fallback
      }

      if (totalPledged > 0n && contributorCount === 0) {
        contributorCount = 1;
      }

      break;
    } catch {
      continue;
    }
  }

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const timeRemaining = deadline > nowSeconds ? deadline - nowSeconds : 0n;
  const isExpired = deadline <= nowSeconds;

  if (target > 0n) {
    if (totalPledged >= target) {
      progressBps = 10000n;
    } else {
      progressBps = (totalPledged * 10000n) / target;
    }
  }

  const percentFunded = Number(progressBps) / 100;
  const targetEth = formatWeiToEth(target);
  const totalPledgedEth = formatWeiToEth(totalPledged);

  const deadlineDate = new Date(Number(deadline) * 1000);
  const formattedDeadline = deadlineDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return {
    contractAddress: currentContract,
    target,
    deadline,
    beneficiary,
    totalPledged,
    pledgedByCaller,
    progressBps,
    timeRemaining,
    state,
    collected,
    targetEth,
    totalPledgedEth,
    percentFunded,
    formattedDeadline,
    isExpired,
    contributorCount,
  };
}

/**
 * Deploy a fresh StepwellCampaign contract directly from the connected wallet.
 */
export async function deployNewCampaign(
  account: string,
  targetEth: string = "0.05",
  durationDays: number = 14,
  beneficiaryAddress?: string
): Promise<string> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No EVM wallet detected. Please install MetaMask to deploy on Sepolia.");
  }
  const eth = (window as any).ethereum;

  // Ensure on Sepolia network
  const hexChainId = await eth.request({ method: "eth_chainId" });
  if (parseInt(hexChainId, 16) !== SEPOLIA_CHAIN_ID) {
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
    } catch {
      throw new Error("Please switch your wallet network to Sepolia.");
    }
  }

  const targetWei = parseEthToWei(targetEth);
  const deadlineSeconds = BigInt(Math.floor(Date.now() / 1000) + durationDays * 86400);
  const targetBeneficiary = beneficiaryAddress && beneficiaryAddress.startsWith("0x")
    ? (beneficiaryAddress as `0x${string}`)
    : (account as `0x${string}`);

  const { encodeDeployData } = await import("viem");
  const { STEPWELL_BYTECODE } = await import("./bytecode");

  const deployData = encodeDeployData({
    abi: STEPWELL_ABI,
    bytecode: STEPWELL_BYTECODE,
    args: [targetWei, deadlineSeconds, targetBeneficiary],
  });

  // Contract deployment consumes ~850,000 gas. Setting gas limit to 1,200,000 (0x124f80)
  // prevents MetaMask from overestimating to 5.7M gas, which would trigger an erroneous
  // "insufficient funds for network fee" check on wallets with ~0.016 ETH balance.
  const txHash = await eth.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: account,
        data: deployData,
        gas: "0x124f80", // 1,200,000 gas limit
      },
    ],
  });

  return txHash;
}

/**
 * Poll transaction receipt to find the deployed contract address.
 */
export async function waitForDeployedAddress(txHash: string): Promise<string | null> {
  const eth = typeof window !== "undefined" ? (window as any).ethereum : null;

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 2500));

    // Try MetaMask provider first
    if (eth) {
      try {
        const receipt = await eth.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        });
        if (receipt && receipt.contractAddress) {
          return receipt.contractAddress;
        }
      } catch {
        // Fallback to RPC
      }
    }

    // Try public RPC endpoints
    for (const rpc of SEPOLIA_RPC_ENDPOINTS) {
      try {
        const res = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getTransactionReceipt",
            params: [txHash],
          }),
        }).then((r) => r.json());

        if (res.result && res.result.contractAddress) {
          return res.result.contractAddress;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}
