export const DEFAULT_STEPWELL_ADDRESS = "0x468926db1F042A7237729E1b9336352Af96aF020" as const;
export const STEPWELL_ADDRESS = DEFAULT_STEPWELL_ADDRESS;

export function getActiveContractAddress(): `0x${string}` {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("stepwell_custom_contract");
    if (custom && custom.startsWith("0x") && custom.length === 42) {
      return custom as `0x${string}`;
    }
  }
  if (process.env.NEXT_PUBLIC_STEPWELL_ADDRESS && process.env.NEXT_PUBLIC_STEPWELL_ADDRESS.startsWith("0x")) {
    return process.env.NEXT_PUBLIC_STEPWELL_ADDRESS as `0x${string}`;
  }
  return DEFAULT_STEPWELL_ADDRESS;
}

export function setActiveContractAddress(addr?: string | null) {
  if (typeof window !== "undefined") {
    if (addr && addr.startsWith("0x") && addr.length === 42) {
      localStorage.setItem("stepwell_custom_contract", addr);
    } else {
      localStorage.removeItem("stepwell_custom_contract");
    }
  }
}

export const SEPOLIA_CHAIN_ID = 11155111;
export const BENEFICIARY_ADDRESS = "0x0d3477209913afFAF06CDe63Dd0F13f4C5728135" as const;
export const TARGET_WEI = 50000000000000000n; // 0.05 ETH
export const TARGET_ETH = "0.05";
export const DEADLINE_TIMESTAMP = 1793343612; // 2026-10-30 07:00:12 UTC

export const SEPOLIA_RPC_ENDPOINTS = [
  "https://rpc.sepolia.org",
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://1rpc.io/sepolia",
  "https://rpc2.sepolia.org",
];

export const STEPWELL_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "target_", type: "uint256", internalType: "uint256" },
      { name: "deadline_", type: "uint256", internalType: "uint256" },
      { name: "beneficiary_", type: "address", internalType: "address payable" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "receive",
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "beneficiary",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address payable" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "collect",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "collected",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createdAt",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deadline",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pledge",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "pledges",
    inputs: [{ name: "pledger", type: "address", internalType: "address" }],
    outputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "progressBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "refund",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refundsOpen",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "state",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "enum StepwellCampaign.State" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "summary",
    inputs: [],
    outputs: [
      { name: "target_", type: "uint256", internalType: "uint256" },
      { name: "deadline_", type: "uint256", internalType: "uint256" },
      { name: "beneficiary_", type: "address", internalType: "address" },
      { name: "totalPledged_", type: "uint256", internalType: "uint256" },
      { name: "pledgedByCaller", type: "uint256", internalType: "uint256" },
      { name: "progressBps_", type: "uint256", internalType: "uint256" },
      { name: "timeRemaining_", type: "uint256", internalType: "uint256" },
      { name: "state_", type: "uint8", internalType: "enum StepwellCampaign.State" },
      { name: "collected_", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "target",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "targetReached",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "timeRemaining",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalPledged",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Collected",
    inputs: [
      { name: "beneficiary", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Pledged",
    inputs: [
      { name: "pledger", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "total", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [
      { name: "pledger", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AlreadyCollected",
    inputs: [],
  },
  {
    type: "error",
    name: "CampaignEnded",
    inputs: [{ name: "deadline", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "CampaignStillActive",
    inputs: [{ name: "deadline", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "InvalidCampaignTerms",
    inputs: [],
  },
  {
    type: "error",
    name: "NotBeneficiary",
    inputs: [{ name: "caller", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "NothingToRefund",
    inputs: [],
  },
  {
    type: "error",
    name: "Reentrancy",
    inputs: [],
  },
  {
    type: "error",
    name: "TargetAlreadyMet",
    inputs: [
      { name: "raised", type: "uint256", internalType: "uint256" },
      { name: "target", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TargetNotMet",
    inputs: [
      { name: "raised", type: "uint256", internalType: "uint256" },
      { name: "target", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "UsePledgeFunction",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroPledge",
    inputs: [],
  },
] as const;

export enum CampaignState {
  Active = 0,
  Succeeded = 1,
  Failed = 2,
  Collected = 3,
}

export const STATE_LABELS: Record<CampaignState, { label: string; color: string; badgeBg: string }> = {
  [CampaignState.Active]: {
    label: "Active — Pledging Open",
    color: "text-emerald-700",
    badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  [CampaignState.Succeeded]: {
    label: "Succeeded — Goal Met",
    color: "text-amber-700",
    badgeBg: "bg-amber-50 border-amber-200 text-amber-800",
  },
  [CampaignState.Failed]: {
    label: "Failed — Refunds Open",
    color: "text-rose-700",
    badgeBg: "bg-rose-50 border-rose-200 text-rose-800",
  },
  [CampaignState.Collected]: {
    label: "Collected — Pot Paid Out",
    color: "text-stone-600",
    badgeBg: "bg-stone-100 border-stone-200 text-stone-700",
  },
};
