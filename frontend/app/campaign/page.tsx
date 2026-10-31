"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  Lock,
} from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import {
  STEPWELL_ADDRESS,
  SEPOLIA_CHAIN_ID,
  BENEFICIARY_ADDRESS,
  TARGET_ETH,
  CampaignState,
  getActiveContractAddress,
  setActiveContractAddress,
} from "../../lib/contracts";
import {
  getLiveCampaignSummary,
  CampaignSummaryData,
  parseEthToWei,
  deployNewCampaign,
  waitForDeployedAddress,
} from "../../lib/web3";

export default function CampaignPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [summary, setSummary] = useState<CampaignSummaryData | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState<string>("0.01");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccessAddress, setDeploySuccessAddress] = useState<string | null>(null);

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
      }
      setIsDeploying(false);
    } catch (e: any) {
      console.warn("Deploy error", e);
      setTxError(e?.message || "Deployment was rejected or failed.");
      setIsDeploying(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getLiveCampaignSummary(walletAddress || undefined);
        if (mounted) setSummary(data);
      } catch (e) {
        console.warn(e);
      }
    };
    load();
    const timer = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [walletAddress]);

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

  const handlePledge = async () => {
    if (!pledgeAmount || Number(pledgeAmount) <= 0) {
      setTxError("Please specify a valid ETH contribution amount.");
      return;
    }

    if (summary && summary.isExpired) {
      setTxError(
        "Notice: The initial deadline for this campaign has concluded on Sepolia. Pledges are closed; please visit the Settlement & Refunds portal."
      );
      return;
    }

    if (typeof window === "undefined" || !(window as any).ethereum) {
      setTxError("Please install MetaMask to interact with Sepolia.");
      return;
    }

    try {
      setIsSubmitting(true);
      setTxError(null);
      setTxHash(null);
      setTxSuccess(false);

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
          throw new Error("Please switch your wallet to Sepolia network.");
        }
      }

      const valueWei = parseEthToWei(pledgeAmount);
      const valueHex = "0x" + valueWei.toString(16);

      const tx = await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: (summary?.contractAddress || getActiveContractAddress()) as `0x${string}`,
            data: "0x88ffe867", // pledge()
            value: valueHex,
            gas: "0x30d40", // 200,000 gas limit for pledge
          },
        ],
      });

      setTxHash(tx);
      setIsSubmitting(false);
      setTxSuccess(true);

      setTimeout(async () => {
        const fresh = await getLiveCampaignSummary(account);
        setSummary(fresh);
      }, 4000);
    } catch (err: any) {
      console.warn(err);
      setTxError(err?.message || "Transaction was rejected or could not be completed.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7F4] text-[#1F1D1A] font-sans antialiased selection:bg-[#E5DED2]">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Breadcrumb Back Link */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#685D54] hover:text-[#1F1D1A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </Link>
          <span className="text-[#A39382]">/</span>
          <span className="text-xs sm:text-sm font-semibold text-[#1F1D1A]">
            Campaign Workspace
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E5DED2]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EFEAE2] text-[#685D54] border border-[#E5DED2]">
                Public Goods Initiative
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-[#685D54] border border-[#E5DED2]">
                Sepolia Verified
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1F1D1A]">
              Community Education &amp; Technology Lab
            </h1>
            <p className="text-sm sm:text-base text-[#685D54] max-w-2xl">
              Collective funding for hands-on developer workshops, student venue deposits, and open educational resources.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[#8C8377] bg-white px-4 py-2.5 rounded-2xl border border-[#E5DED2]">
            <span>Vault:</span>
            <a
              href={`https://sepolia.etherscan.io/address/${summary?.contractAddress || getActiveContractAddress()}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#1F1D1A] font-semibold underline flex items-center gap-1 hover:text-[#8E8071]"
            >
              <span>{(summary?.contractAddress || getActiveContractAddress()).slice(0, 8)}...{(summary?.contractAddress || getActiveContractAddress()).slice(-6)}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Success Alert */}
        {txSuccess && txHash && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm animate-in fade-in space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Contribution Broadcasted Successfully!</span>
              </div>
              <button
                onClick={() => setTxSuccess(false)}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-emerald-800">
              Your contribution is locked directly in the smart contract on Sepolia.
            </p>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-emerald-900 underline font-semibold"
            >
              <span>View On-Chain Receipt</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {txError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{txError}</span>
            </div>
            <button
              onClick={() => setTxError(null)}
              className="text-xs font-semibold underline text-rose-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="relative w-full h-64 sm:h-80 rounded-3xl overflow-hidden bg-gradient-to-br from-[#E2D6C6] via-[#D3C4B0] to-[#8C7E70] border border-[#E5DED2] p-8 flex flex-col justify-between">
              <svg
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                viewBox="0 0 800 400"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
              >
                <path
                  d="M-50,300 C150,380 250,180 480,180 C700,180 750,350 900,300 L900,400 L-50,400 Z"
                  fill="#24211D"
                />
                <circle cx="450" cy="180" r="100" fill="#F7F3ED" opacity="0.4" />
              </svg>

              <div className="relative z-10 flex justify-between items-start">
                <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white font-medium text-xs">
                  Education &amp; Infrastructure
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[#1F1D1A] font-bold text-xs">
                  Target: {TARGET_ETH} ETH
                </span>
              </div>

              <div className="relative z-10 text-white space-y-1">
                <h3 className="text-2xl sm:text-3xl font-bold font-sans">
                  The Assurance Commitment
                </h3>
                <p className="text-xs sm:text-sm text-[#F3ECE2] max-w-lg">
                  Empowering community builders with full transparency.
                  If the target is met, the venue is secured. If not, 100% of pledges are refundable.
                </p>
              </div>
            </div>

            {/* Campaign Narrative */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E5DED2] space-y-5">
              <h3 className="text-xl font-bold text-[#1F1D1A]">
                About This Initiative
              </h3>
              <p className="text-xs sm:text-sm text-[#685D54] leading-relaxed">
                Hosting high-impact developer workshops requires advance venue deposits and resource reservations.
                Traditional crowdfunding relies on blind trust, often leaving organizers exposed or contributors unrefunded if goals fall short.
              </p>
              <p className="text-xs sm:text-sm text-[#685D54] leading-relaxed">
                Stepwell solves this coordination dilemma by encoding the agreement directly into an Ethereum assurance contract.
                Pledges are locked immutably until the deadline. Either the collective target is reached and the event deposit is deployed,
                or every contributor pulls their pledge back with zero counterparty friction.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E5DED2]/70 text-xs">
                <div className="flex items-center gap-2.5 text-[#4A453E]">
                  <Users className="w-4 h-4 text-[#8E8071]" />
                  <span>Student Scholarships</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#4A453E]">
                  <MapPin className="w-4 h-4 text-[#8E8071]" />
                  <span>Regional Meetups</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#4A453E]">
                  <Calendar className="w-4 h-4 text-[#8E8071]" />
                  <span>Decentralized Labs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Console */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-8 bg-white p-6 sm:p-8 rounded-3xl border border-[#E5DED2] shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#1F1D1A]">
                  Contribution Console
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EFEAE2] text-[#685D54]">
                  Ethereum Sepolia
                </span>
              </div>

              {/* Funding Gauge */}
              <div className="p-5 rounded-2xl bg-[#F6F1EA] border border-[#E5DED2] space-y-4">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-3xl font-bold text-[#1F1D1A] font-serif">
                      {summary ? summary.totalPledgedEth : "0.00"}
                    </span>
                    <span className="text-xs text-[#8C8377] ml-1">ETH Pledged</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#8C8377] block">Target Goal</span>
                    <span className="font-bold text-sm text-[#1F1D1A]">{TARGET_ETH} ETH</span>
                  </div>
                </div>

                <div className="w-full bg-[#E5DED2] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#685D54] h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(summary?.percentFunded || 0, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#685D54] font-medium">
                  <span>{summary ? summary.percentFunded.toFixed(1) : 0}% of goal</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {summary?.isExpired ? "Round Concluded" : "Pledges Open"}
                  </span>
                </div>
              </div>

              {/* Personal Balance */}
              {walletAddress && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex justify-between items-center">
                  <div>
                    <span className="block text-[11px] text-emerald-700 font-semibold uppercase">Your Contribution</span>
                    <span className="font-bold text-sm">
                      {summary ? (Number(summary.pledgedByCaller) / 1e18).toFixed(4) : "0.0000"} ETH
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-white rounded-md font-mono text-[11px] text-emerald-800 border border-emerald-200">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              )}

              {/* Deployment Success Banner */}
              {deploySuccessAddress && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Active Round Deployed on Sepolia!</span>
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Contract: <code className="font-mono">{deploySuccessAddress.slice(0, 10)}...</code> (14-day open deadline). Pledging is now live!
                  </p>
                </div>
              )}

              {/* Notice if deadline has passed on this contract */}
              {summary?.isExpired && !deploySuccessAddress && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold block">Round Concluded</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-200/60 font-mono">Sepolia</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    This round&apos;s deadline passed. To test pledging live, launch a fresh 14-day active round in 1 click:
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
                          <span>Deploying Contract...</span>
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

              {/* Amount Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#685D54]">
                  Select Contribution (ETH)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["0.005", "0.01", "0.025", "0.05"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPledgeAmount(preset)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                        pledgeAmount === preset
                          ? "bg-[#685D54] text-white border-[#685D54]"
                          : "bg-[#FBF7F4] text-[#1F1D1A] border-[#E5DED2] hover:bg-[#EFEAE2]"
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
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-[#E5DED2] bg-[#FBF7F4] text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#8E8071]"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={isSubmitting || (summary?.isExpired ?? false)}
                onClick={handlePledge}
                className="w-full py-4 rounded-full bg-[#8E8071] hover:bg-[#7D7062] active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming On-Chain...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>Contribute {pledgeAmount || 0} Sepolia ETH</span>
                  </>
                )}
              </button>

              <div className="space-y-2 text-center">
                <p className="text-[11px] text-[#8C8377]">
                  Funds are secured in contract <span className="font-mono">{STEPWELL_ADDRESS.slice(0, 8)}...</span>
                </p>
                <Link
                  href="/settlement"
                  className="inline-block text-xs font-semibold text-[#8E8071] hover:text-[#1F1D1A] underline"
                >
                  View Settlement &amp; Refund Terms →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
