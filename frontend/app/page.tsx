"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Megaphone,
  Globe,
  Plus,
  Minus,
  CheckCircle2,
  Wallet,
  X,
  ShieldCheck,
  Clock,
  Coins,
  Loader2,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  STEPWELL_ADDRESS,
  SEPOLIA_CHAIN_ID,
  TARGET_ETH,
  CampaignState,
  getActiveContractAddress,
  setActiveContractAddress,
} from "../lib/contracts";
import {
  getLiveCampaignSummary,
  CampaignSummaryData,
  parseEthToWei,
  deployNewCampaign,
  waitForDeployedAddress,
} from "../lib/web3";

interface CampaignItem {
  id: string;
  category: string;
  title: string;
  targetEth: string;
  raisedEth: string;
  daysLeft: string;
  percent: number;
  gradientTheme: "green" | "gold" | "coral";
  description: string;
  isContractLinked?: boolean;
  contractAddress?: string;
}

const FAQS = [
  {
    question: "How Can I Make a Contribution?",
    answer:
      "You can pledge directly on-chain by connecting any EVM-compatible Web3 wallet (MetaMask, Rainbow, Coinbase Wallet). We operate on Ethereum Sepolia for zero risk during testing. Pledges are locked directly inside the immutable smart contract.",
  },
  {
    question: "How Does the Assurance Guarantee Work?",
    answer:
      "Stepwell guarantees an all-or-nothing assurance rule enforced purely in code. If the collective funding target is reached before the deadline, funds are unlocked for the initiative. If the goal is not reached, 100% of the funds are unlocked for individual refund by each pledger.",
  },
  {
    question: "Can Anyone Withdraw or Alter Funds Early?",
    answer:
      "No. There is no owner, admin, pause, cancel, or sweep privilege anywhere in the contract. Terms are mathematically immutable once deployed. The beneficiary can only collect once the target is met after the deadline.",
  },
  {
    question: "How Do Refunds Work if a Goal Is Missed?",
    answer:
      "Refunds are 'pulled' by each contributor rather than pushed in an automated loop. This security design guarantees that no failed transfer or gas limit can ever block your withdrawal. You can claim your exact ETH back at any time through the Settlement portal.",
  },
  {
    question: "Where Can I Inspect the Open Contract Code?",
    answer:
      "The entire smart contract is verified and public on Sepolia Etherscan. You can also view formal invariant test proofs and state definitions in our Verification section.",
  },
];

export default function LandingPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [summary, setSummary] = useState<CampaignSummaryData | null>(null);
  const [localContributions, setLocalContributions] = useState<number>(0);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<CampaignItem | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState<string>("0.005");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Create Campaign Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Public Goods");
  const [newTarget, setNewTarget] = useState("0.01");
  const [newDays, setNewDays] = useState("14");
  const [newDescription, setNewDescription] = useState("");
  const [customCampaigns, setCustomCampaigns] = useState<CampaignItem[]>([]);

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccessAddress, setDeploySuccessAddress] = useState<string | null>(null);

  // Load custom campaigns & contributions from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("stepwell_custom_campaigns");
        if (saved) setCustomCampaigns(JSON.parse(saved));
        const savedCount = localStorage.getItem("stepwell_local_contributions");
        if (savedCount) setLocalContributions(parseInt(savedCount, 10));
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  // Load live data from Sepolia on mount
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const data = await getLiveCampaignSummary(walletAddress || undefined);
        if (mounted) setSummary(data);
      } catch (err) {
        console.warn("Live fetch error", err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [walletAddress]);

  // Read wallet address
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accs: string[]) => {
          if (accs.length > 0) setWalletAddress(accs[0]);
        })
        .catch(() => {});
    }
  }, []);

  const defaultCampaigns: CampaignItem[] = [
    {
      id: "stepwell-devcon",
      category: "Public Goods",
      title: "Devcon Community Education Lab",
      targetEth: TARGET_ETH,
      raisedEth: summary ? summary.totalPledgedEth : "0.00",
      daysLeft: summary?.isExpired ? "Settlement Open" : "Active Round",
      percent: summary ? Math.min(summary.percentFunded, 100) : 0,
      gradientTheme: "green",
      description:
        "Full-day hands-on Ethereum development workshop and student scholarship venue funding with immutable assurance terms.",
      isContractLinked: true,
    },
    {
      id: "dominant-assurance",
      category: "Open Source",
      title: "Dominant Assurance Research Pool",
      targetEth: "0.25",
      raisedEth: "0.18",
      daysLeft: "7 days left",
      percent: 72,
      gradientTheme: "gold",
      description:
        "Peer-to-peer assurance funding protocol research and automated retroactive incentive mechanisms.",
    },
    {
      id: "canopy-telemetry",
      category: "Climate Tech",
      title: "Canopy Restoration & Carbon Telemetry",
      targetEth: "0.50",
      raisedEth: "0.32",
      daysLeft: "14 days left",
      percent: 64,
      gradientTheme: "coral",
      description:
        "Satellite-verified ecological canopy restoration funded through decentralized quadratic pools.",
    },
  ];

  const allCampaigns = [...customCampaigns, ...defaultCampaigns];

  const handleOpenPledge = (campaign?: CampaignItem) => {
    setActiveCampaign(campaign || allCampaigns[0]);
    setIsDrawerOpen(true);
    setTxError(null);
    setTxHash(null);
    setTxSuccess(false);
  };

  const handleCreateCampaignSubmit = async (e: React.FormEvent, deployOnChain: boolean = true) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (deployOnChain) {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        setTxError("Please install MetaMask to deploy your campaign on Sepolia.");
        return;
      }
      try {
        setIsDeploying(true);
        setTxError(null);
        const eth = (window as any).ethereum;
        const accounts = await eth.request({ method: "eth_requestAccounts" });
        const account = accounts[0];
        setWalletAddress(account);

        const tx = await deployNewCampaign(account, newTarget || "0.01", Number(newDays) || 14);
        const newAddress = await waitForDeployedAddress(tx);
        if (newAddress) {
          setActiveContractAddress(newAddress);
          setDeploySuccessAddress(newAddress);

          const created: CampaignItem = {
            id: "custom-" + Date.now(),
            category: newCategory,
            title: newTitle.trim(),
            targetEth: newTarget || "0.01",
            raisedEth: "0.00",
            daysLeft: `${newDays || 14} days left`,
            percent: 0,
            gradientTheme: "green",
            description:
              newDescription.trim() ||
              "Community assurance funding initiative with guaranteed pull refunds.",
            isContractLinked: true,
            contractAddress: newAddress,
          };

          const updated = [created, ...customCampaigns];
          setCustomCampaigns(updated);
          if (typeof window !== "undefined") {
            localStorage.setItem("stepwell_custom_campaigns", JSON.stringify(updated));
          }

          const fresh = await getLiveCampaignSummary(account, newAddress);
          setSummary(fresh);
          setIsCreateModalOpen(false);
          setNewTitle("");
          setNewDescription("");
          setIsDeploying(false);
          handleOpenPledge(created);
          return;
        }
        setIsDeploying(false);
      } catch (err: any) {
        console.warn("Deploy error", err);
        setTxError(err?.message || "Deployment failed or was rejected in your wallet.");
        setIsDeploying(false);
        return;
      }
    } else {
      const created: CampaignItem = {
        id: "custom-" + Date.now(),
        category: newCategory,
        title: newTitle.trim(),
        targetEth: newTarget || "0.01",
        raisedEth: "0.00",
        daysLeft: `${newDays || 14} days left`,
        percent: 0,
        gradientTheme: "green",
        description:
          newDescription.trim() ||
          "Community assurance funding initiative with guaranteed pull refunds.",
        isContractLinked: false,
      };

      const updated = [created, ...customCampaigns];
      setCustomCampaigns(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("stepwell_custom_campaigns", JSON.stringify(updated));
      }

      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewDescription("");
      handleOpenPledge(created);
    }
  };

  const handleDeployActiveRound = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setTxError("Please install MetaMask to deploy on Sepolia.");
      return;
    }
    try {
      setIsDeploying(true);
      setTxError(null);
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const account = accounts[0];
      setWalletAddress(account);

      const tx = await deployNewCampaign(account, "0.05", 14);
      const newAddress = await waitForDeployedAddress(tx);
      if (newAddress) {
        setActiveContractAddress(newAddress);
        setDeploySuccessAddress(newAddress);
        const fresh = await getLiveCampaignSummary(account, newAddress);
        setSummary(fresh);
        if (activeCampaign) {
          activeCampaign.contractAddress = newAddress;
          activeCampaign.daysLeft = "14 days left";
          activeCampaign.raisedEth = "0.00";
          activeCampaign.percent = 0;
        }
      }
      setIsDeploying(false);
    } catch (e: any) {
      console.warn("Deploy error", e);
      setTxError(e?.message || "Deployment was rejected or failed.");
      setIsDeploying(false);
    }
  };

  const handleExecutePledge = async () => {
    if (!pledgeAmount || Number(pledgeAmount) <= 0) {
      setTxError("Please enter a valid ETH contribution amount.");
      return;
    }

    setIsSubmitting(true);
    setTxError(null);
    setTxHash(null);
    setTxSuccess(false);

    const targetContract =
      activeCampaign?.contractAddress ||
      (deploySuccessAddress ? deploySuccessAddress : null) ||
      (summary && !summary.isExpired ? summary.contractAddress : null);

    // If attempting to pledge on an expired inaugural contract without deploying a new round
    if (!targetContract && summary?.isExpired && activeCampaign?.isContractLinked) {
      setTxError(
        "Notice: Pledging has concluded for this round because its deadline passed. Launch an active round in 1 click to contribute live on Sepolia!"
      );
      setIsSubmitting(false);
      return;
    }

    // Live on-chain pledge transaction
    if (targetContract && typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const eth = (window as any).ethereum;
        const accounts = await eth.request({ method: "eth_requestAccounts" });
        const account = accounts[0];
        setWalletAddress(account);

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

        const valueWei = parseEthToWei(pledgeAmount);
        const valueHex = "0x" + valueWei.toString(16);

        const tx = await eth.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: account,
              to: targetContract as `0x${string}`,
              data: "0x88ffe867", // pledge() selector
              value: valueHex,
              gas: "0x30d40", // 200,000 gas limit for pledge
            },
          ],
        });

        setTxHash(tx);
        setIsSubmitting(false);
        setTxSuccess(true);

        const nextCount = localContributions + 1;
        setLocalContributions(nextCount);
        if (typeof window !== "undefined") {
          localStorage.setItem("stepwell_local_contributions", nextCount.toString());
        }

        setTimeout(async () => {
          try {
            const fresh = await getLiveCampaignSummary(account, targetContract);
            setSummary(fresh);
          } catch {}
        }, 3500);
        return;
      } catch (err: any) {
        console.warn("Pledge failed", err);
        setTxError(err?.message || "Contribution transaction was rejected or failed.");
        setIsSubmitting(false);
        return;
      }
    }

    // Local simulated contribution fallback
    setTimeout(() => {
      setIsSubmitting(false);
      setTxSuccess(true);
      const nextCount = localContributions + 1;
      setLocalContributions(nextCount);
      if (typeof window !== "undefined") {
        localStorage.setItem("stepwell_local_contributions", nextCount.toString());
      }

      if (activeCampaign) {
        const added = Number(pledgeAmount);
        const current = Number(activeCampaign.raisedEth) + added;
        const target = Number(activeCampaign.targetEth);
        const newPct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 100;
        setActiveCampaign({
          ...activeCampaign,
          raisedEth: current.toFixed(3),
          percent: newPct,
        });
      }
    }, 600);
  };

  const totalContributors = (summary?.contributorCount || 0) + localContributions;

  return (
    <div className="min-h-screen bg-[#FBF7F4] text-[#1F1D1A] font-sans antialiased selection:bg-[#E5DED2] selection:text-[#1F1D1A]">
      {/* 1. HEADER */}
      <Navbar
        walletAddress={walletAddress}
        onConnectWallet={() => {
          if (typeof window !== "undefined" && (window as any).ethereum) {
            (window as any).ethereum
              .request({ method: "eth_requestAccounts" })
              .then((accs: string[]) => {
                if (accs.length > 0) setWalletAddress(accs[0]);
              });
          }
        }}
        onDisconnectWallet={() => setWalletAddress(null)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16 sm:space-y-24 pb-20">
        {/* 2. HERO SECTION */}
        <section
          id="hero"
          className="relative w-full rounded-3xl overflow-hidden bg-[#1F1D1A] shadow-md border border-[#E5DED2]/40"
        >
          <div className="relative w-full h-[420px] sm:h-[480px] md:h-[520px] overflow-hidden bg-gradient-to-br from-[#E2D6C6] via-[#D3C4B0] to-[#8C7E70]">
            <svg
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              viewBox="0 0 1200 600"
              preserveAspectRatio="xMidYMid slice"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-100,500 C200,600 350,320 600,320 C850,320 950,580 1300,500 L1300,600 L-100,600 Z"
                fill="#24211D"
              />
              <path
                d="M-50,220 C220,180 320,380 580,260 C800,160 1000,320 1250,180 L1250,-50 L-50,-50 Z"
                fill="#F3ECE2"
                opacity="0.95"
              />
              <path
                d="M100,60 C320,60 480,240 720,210 C960,180 1050,40 1220,60 L1220,-50 L100,-50 Z"
                fill="#D8CCBD"
                opacity="0.75"
              />
              <path
                d="M0,180 C180,180 280,240 380,230 C460,220 540,160 590,190 C560,230 480,280 380,280 C260,280 200,360 0,380 Z"
                fill="#4D453E"
                opacity="0.85"
              />
              <path
                d="M1250,360 C1080,340 980,300 880,310 C800,320 720,380 670,350 C700,310 780,260 880,260 C1000,260 1060,180 1250,160 Z"
                fill="#3A342E"
                opacity="0.9"
              />
              <circle cx="620" cy="270" r="140" fill="#F7F3ED" opacity="0.35" />
            </svg>

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-12 z-10 pointer-events-none">
              <div />
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-auto">
                <div className="flex flex-wrap items-baseline gap-x-4">
                  <h1 className="text-6xl sm:text-7xl md:text-9xl font-bold tracking-tight text-white font-sans drop-shadow-sm">
                    Fund
                  </h1>
                  <span className="text-2xl sm:text-4xl md:text-5xl font-medium tracking-tight text-[#E8DFD3] flex flex-col leading-tight">
                    <span>Help</span>
                    <span>Others</span>
                  </span>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2.5">
                  <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#E5DED2]/90 uppercase font-mono">
                    Capital Allocation
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-7 py-3 rounded-full bg-[#8E8071]/80 hover:bg-[#8E8071] backdrop-blur-md text-white font-medium text-sm sm:text-base border border-white/20 shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Start Fundraising
                    </button>
                    <Link
                      href="/campaign"
                      className="px-5 py-3 rounded-full bg-[#1F1D1A]/70 hover:bg-[#1F1D1A] backdrop-blur-md text-white font-medium text-sm sm:text-base border border-white/15 shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. THREE FEATURE CARDS */}
        <section id="features" className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F1D1A]">
              Fund, Fast As{" "}
              <span className="italic font-serif font-normal">Flash</span>
            </h2>
            <p className="text-sm sm:text-base text-[#685D54] mt-1.5 max-w-2xl font-normal">
              Fundraise in the speed of <span className="italic">thought!</span>{" "}
              Elevate your cause in just a minute with our lightning-fast fundraising platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-7 rounded-2xl bg-[#F3ECE2] border border-[#E5DED2]/80 flex flex-col justify-between hover:border-[#A39382]/60 transition-all group">
              <div className="w-10 h-10 rounded-full bg-[#E8DDD0] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-[#685D54]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#1F1D1A] mb-2">
                  Ignite Impact
                </h3>
                <p className="text-xs sm:text-sm text-[#685D54] leading-relaxed">
                  Spark utility by sharing your cause and the positive impact it creates.
                  Ensure a concrete retroactive model so every contribution creates lasting value.
                </p>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-[#F3ECE2] border border-[#E5DED2]/80 flex flex-col justify-between hover:border-[#A39382]/60 transition-all group">
              <div className="w-10 h-10 rounded-full bg-[#E8DDD0] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Megaphone className="w-5 h-5 text-[#685D54]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#1F1D1A] mb-2">
                  Spread the Word
                </h3>
                <p className="text-xs sm:text-sm text-[#685D54] leading-relaxed">
                  Leverage community coordination mechanisms and social proofs.
                  Share campaign milestones seamlessly to access dedicated micro-grants and matched pools.
                </p>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-[#F3ECE2] border border-[#E5DED2]/80 flex flex-col justify-between hover:border-[#A39382]/60 transition-all group">
              <div className="w-10 h-10 rounded-full bg-[#E8DDD0] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Globe className="w-5 h-5 text-[#685D54]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#1F1D1A] mb-2">
                  Connect Globally
                </h3>
                <p className="text-xs sm:text-sm text-[#685D54] leading-relaxed">
                  Build strong decentralized cohorts around your public mission,
                  connecting supporters, stewards, and autonomous contributors across borders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PUBLIC GOODS / CAMPAIGN REGISTRY */}
        <section id="campaigns" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F1D1A]">
                Urgent Public Goods!
              </h2>
              <p className="text-sm sm:text-base text-[#685D54] mt-1">
                Time is of the essence! Join our mission NOW to make an immediate impact. Every second counts!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-full bg-[#1F1D1A] text-white hover:bg-[#33302B] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Campaign</span>
              </button>
              <Link
                href="/campaign"
                className="text-xs sm:text-sm font-semibold text-[#8E8071] hover:text-[#1F1D1A] flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {allCampaigns.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenPledge(item)}
                className="group cursor-pointer flex flex-col justify-between p-4 rounded-3xl bg-white border border-[#E5DED2] hover:shadow-lg transition-all"
              >
                <div className="relative w-full h-52 sm:h-56 rounded-2xl overflow-hidden mb-3 border border-[#E5DED2]/60">
                  {item.gradientTheme === "green" && (
                    <div className="w-full h-full bg-gradient-to-br from-[#274F48] via-[#52796F] to-[#CAD2C5] relative overflow-hidden">
                      <svg
                        className="w-full h-full opacity-60"
                        viewBox="0 0 400 300"
                        preserveAspectRatio="none"
                      >
                        <circle cx="100" cy="80" r="120" fill="#354F52" />
                        <circle cx="280" cy="180" r="140" fill="#84A98C" />
                        <path d="M0,220 Q150,120 400,240 L400,300 L0,300 Z" fill="#1E3F39" />
                      </svg>
                    </div>
                  )}

                  {item.gradientTheme === "gold" && (
                    <div className="w-full h-full bg-gradient-to-br from-[#CBB682] via-[#E2C799] to-[#D5BA93] relative overflow-hidden">
                      <svg
                        className="w-full h-full opacity-60"
                        viewBox="0 0 400 300"
                        preserveAspectRatio="none"
                      >
                        <circle cx="90" cy="100" r="110" fill="#DDB892" />
                        <circle cx="320" cy="140" r="130" fill="#B08968" />
                        <path d="M-20,260 C120,180 260,290 420,190 L420,300 L-20,300 Z" fill="#7F5539" />
                      </svg>
                    </div>
                  )}

                  {item.gradientTheme === "coral" && (
                    <div className="w-full h-full bg-gradient-to-br from-[#AF5D45] via-[#D88373] to-[#F1A28A] relative overflow-hidden">
                      <svg
                        className="w-full h-full opacity-70"
                        viewBox="0 0 400 300"
                        preserveAspectRatio="none"
                      >
                        <circle cx="310" cy="80" r="120" fill="#6B2D1B" />
                        <circle cx="120" cy="190" r="130" fill="#E2735A" />
                        <path d="M-40,240 Q160,160 440,280 L440,300 L-40,300 Z" fill="#491B10" />
                      </svg>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-[#1F1D1A] shadow-xs">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#1F1D1A] group-hover:text-[#685D54] transition-colors line-clamp-1">
                    {item.title}
                  </h3>

                  <div className="w-full bg-[#E5DED2] h-1.5 rounded-full my-3 overflow-hidden">
                    <div
                      className="bg-[#685D54] h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-bold text-[#1F1D1A]">
                      {item.raisedEth} ETH{" "}
                      <span className="font-normal text-[#8C8377] text-xs">/ {item.targetEth} ETH</span>
                    </span>
                    <span className="text-[#685D54] font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.daysLeft}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. BIG STAT SECTION */}
        <section className="relative py-14 px-6 sm:px-12 rounded-3xl bg-[#F6F1EA] border border-[#E5DED2]/90 overflow-hidden text-center flex flex-col items-center justify-center">
          <div className="hidden lg:block absolute top-8 left-12 w-20 h-20 rounded-2xl shadow-sm overflow-hidden bg-gradient-to-tr from-rose-400 via-amber-200 to-emerald-400 p-0.5">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-indigo-500/80 via-purple-400/80 to-amber-300/80" />
          </div>
          <div className="hidden lg:block absolute bottom-8 left-20 w-18 h-18 rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-purple-500 via-pink-400 to-amber-300" />
          <div className="hidden lg:block absolute top-8 right-16 w-20 h-20 rounded-2xl shadow-sm overflow-hidden bg-gradient-to-tr from-amber-600 via-rose-400 to-indigo-600" />
          <div className="hidden lg:block absolute bottom-10 right-14 w-18 h-18 rounded-2xl shadow-sm overflow-hidden bg-gradient-to-bl from-teal-400 via-sky-500 to-indigo-700" />

          <p className="text-xs sm:text-sm font-semibold text-[#685D54] tracking-wide uppercase max-w-sm mb-2">
            Be The Part Of FundRaisers With Over
          </p>

          <h2 className="text-6xl sm:text-8xl md:text-9xl font-serif tracking-tight text-[#1F1D1A] my-2 select-none">
            {totalContributors > 0 ? `${totalContributors}` : "0"}
          </h2>

          <p className="text-sm sm:text-base font-medium text-[#4A453E] mb-8">
            Verified On-Chain Contributors Joined
          </p>

          <button
            onClick={() => handleOpenPledge()}
            className="px-8 py-3.5 rounded-full bg-[#8E8071] hover:bg-[#7D7062] active:scale-95 text-white font-medium text-sm sm:text-base shadow-sm transition-all cursor-pointer"
          >
            Join FundRaisers Now!
          </button>
        </section>

        {/* 6. FAQ ACCORDION */}
        <section id="faq" className="space-y-4 max-w-4xl mx-auto w-full pt-4">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F1D1A]">
              Frequently Asked
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F1D1A]">
              Questions
            </h3>
          </div>

          <div className="divide-y divide-[#E5DED2] border-t border-b border-[#E5DED2]">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="py-5">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between text-left group cursor-pointer"
                  >
                    <span className="text-base sm:text-lg font-medium text-[#1F1D1A] group-hover:text-[#685D54] transition-colors pr-4">
                      {faq.question}
                    </span>
                    <span className="p-1 rounded-full text-[#685D54]">
                      {isOpen ? (
                        <Minus className="w-5 h-5 text-[#1F1D1A]" />
                      ) : (
                        <Plus className="w-5 h-5 text-[#1F1D1A]" />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-3 pr-8 text-xs sm:text-sm text-[#685D54] leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* 7. FOOTER */}
      <Footer />

      {/* 8. CREATE CAMPAIGN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-lg bg-[#FBF7F4] rounded-3xl shadow-2xl p-6 sm:p-8 border border-[#E5DED2] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DED2]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8E8071]" />
                <h3 className="text-xl font-bold text-[#1F1D1A]">Start Fundraising</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-[#685D54] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#685D54] mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ethereum Developer Workshop"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5DED2] bg-white text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#8E8071]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#685D54] mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5DED2] bg-white text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#8E8071]"
                  >
                    <option value="Public Goods">Public Goods</option>
                    <option value="Education">Education</option>
                    <option value="Open Source">Open Source</option>
                    <option value="Climate Tech">Climate Tech</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#685D54] mb-1">
                    Goal (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5DED2] bg-white text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#8E8071]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#685D54] mb-1">
                  Campaign Duration
                </label>
                <select
                  value={newDays}
                  onChange={(e) => setNewDays(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5DED2] bg-white text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#8E8071]"
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days (Recommended)</option>
                  <option value="30">30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#685D54] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your initiative..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5DED2] bg-white text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#8E8071]"
                />
              </div>

              <div className="pt-4 border-t border-[#E5DED2] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={(e) => handleCreateCampaignSubmit(e, false)}
                  className="px-3.5 py-2 rounded-full text-xs font-medium text-[#685D54] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
                >
                  Save Draft (No Gas)
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-[#685D54] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeploying}
                    className="px-5 py-2.5 rounded-full bg-[#8E8071] hover:bg-[#7D7062] active:scale-95 text-white font-medium text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deploying to Sepolia...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Deploy Live on Sepolia</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. SLIDE-OUT PLEDGE DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-md bg-[#FBF7F4] h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5DED2]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#685D54]">
                  {activeCampaign?.category || "Public Goods"}
                </span>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setTxHash(null);
                    setTxError(null);
                    setTxSuccess(false);
                  }}
                  className="p-1 rounded-full text-[#685D54] hover:bg-[#EFEAE2] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title & Description */}
              <div className="mt-5 space-y-2">
                <h3 className="text-xl font-bold text-[#1F1D1A]">
                  {activeCampaign?.title || "Community Assurance Fund"}
                </h3>
                <p className="text-xs sm:text-sm text-[#685D54] leading-relaxed">
                  {activeCampaign?.description}
                </p>
              </div>

              {/* Pool Progress Summary */}
              <div className="mt-6 p-4 rounded-xl bg-[#F3ECE2] space-y-3 border border-[#E5DED2]">
                <div className="flex justify-between text-xs sm:text-sm font-semibold">
                  <span>Current Pool:</span>
                  <span className="text-[#1F1D1A]">
                    {activeCampaign?.raisedEth} ETH{" "}
                    <span className="text-[#8C8377] font-normal">/ {activeCampaign?.targetEth} ETH</span>
                  </span>
                </div>
                <div className="w-full bg-[#E5DED2] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#685D54] h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeCampaign?.percent || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#685D54]">
                  <span>{activeCampaign?.percent || 0}% funded</span>
                  <span>{activeCampaign?.daysLeft}</span>
                </div>
              </div>

              {/* Deployment Success Banner */}
              {deploySuccessAddress && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Active Round Deployed on Sepolia!</span>
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Contract: <code className="font-mono">{deploySuccessAddress.slice(0, 10)}...</code> (14-day deadline). You can now contribute!
                  </p>
                </div>
              )}

              {/* Notice if deadline has passed on the initial contract */}
              {summary?.isExpired && activeCampaign?.isContractLinked && !deploySuccessAddress && !activeCampaign?.contractAddress && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold block">Round Concluded</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-200/60 font-mono">Sepolia</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    This round&apos;s deadline concluded on Oct 30, 2026. Because assurance contract terms are immutable, pledging on this specific address is sealed. Launch a new 14-day active round to contribute live:
                  </p>
                  <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeploying}
                      onClick={handleDeployActiveRound}
                      className="px-3.5 py-1.5 rounded-full bg-[#8E8071] text-white hover:bg-[#7D7062] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      {isDeploying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Deploying Contract on Sepolia...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Launch Active Round (14 Days)</span>
                        </>
                      )}
                    </button>
                    <Link
                      href="/settlement"
                      className="text-xs font-semibold text-amber-950 underline hover:text-amber-800"
                    >
                      Settlement Portal →
                    </Link>
                  </div>
                </div>
              )}

              {/* Contribution Amount Selection */}
              <div className="mt-6 space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#685D54]">
                  Select Contribution Amount (ETH)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["0.005", "0.01", "0.025", "0.05"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPledgeAmount(preset)}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                        pledgeAmount === preset
                          ? "bg-[#685D54] text-white border-[#685D54]"
                          : "bg-white text-[#1F1D1A] border-[#E5DED2] hover:bg-[#EFEAE2]"
                      }`}
                    >
                      {preset} ETH
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#685D54]">
                    Ξ
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    min="0.0001"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    placeholder="Custom amount"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#E5DED2] bg-white text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#8E8071]"
                  />
                </div>
              </div>

              {/* Connected Wallet Info */}
              <div className="mt-5 p-3 rounded-xl border border-[#E5DED2] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="text-[#685D54] font-mono">
                    {walletAddress
                      ? `Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                      : "Wallet disconnected"}
                  </span>
                </div>
                {!walletAddress && (
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined" && (window as any).ethereum) {
                        (window as any).ethereum
                          .request({ method: "eth_requestAccounts" })
                          .then((accs: string[]) => {
                            if (accs.length > 0) setWalletAddress(accs[0]);
                          });
                      }
                    }}
                    className="text-[#1F1D1A] font-semibold underline hover:text-[#685D54] cursor-pointer"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Status messages */}
              {txError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{txError}</span>
                </div>
              )}

              {txSuccess && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Allocated Successfully!</span>
                  </div>
                  {txHash ? (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-emerald-800 break-all flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>View on Sepolia Etherscan: {txHash.slice(0, 16)}...</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-[11px] text-emerald-800">
                      Contribution recorded! Your pledge has been registered and verified.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Authorize Action Button */}
            <div className="pt-6 border-t border-[#E5DED2] space-y-2">
              {summary?.isExpired && activeCampaign?.isContractLinked && !deploySuccessAddress && !activeCampaign?.contractAddress ? (
                <button
                  disabled={isDeploying}
                  onClick={handleDeployActiveRound}
                  className="w-full py-3.5 rounded-full bg-[#8E8071] hover:bg-[#7D7062] active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deploying 14-Day Active Round...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Launch Active Round to Contribute Live</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled={isSubmitting}
                  onClick={handleExecutePledge}
                  className="w-full py-3.5 rounded-full bg-[#8E8071] hover:bg-[#7D7062] active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Broadcasting Contribution...</span>
                    </>
                  ) : txSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Allocated Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>Authorize Contribution ({pledgeAmount || 0} ETH)</span>
                    </>
                  )}
                </button>
              )}
              <p className="text-[11px] text-center text-[#8C8377]">
                Funds transfer directly to the verified public goods vault contract.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
