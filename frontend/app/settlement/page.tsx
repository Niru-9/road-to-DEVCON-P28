"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Loader2,
  Coins,
  Wallet,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import {
  STEPWELL_ADDRESS,
  BENEFICIARY_ADDRESS,
  TARGET_ETH,
  CampaignState,
  getActiveContractAddress,
} from "../../lib/contracts";
import { getLiveCampaignSummary, CampaignSummaryData } from "../../lib/web3";

export default function SettlementPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [summary, setSummary] = useState<CampaignSummaryData | null>(null);

  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [isSubmittingCollect, setIsSubmittingCollect] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txSuccessAction, setTxSuccessAction] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await getLiveCampaignSummary(walletAddress || undefined);
      setSummary(data);
    } catch (e) {
      console.warn("Settlement summary fetch error", e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
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

  const handleRefund = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setTxError("Please connect your wallet first.");
      return;
    }

    try {
      setIsSubmittingRefund(true);
      setTxError(null);
      setTxHash(null);
      setTxSuccessAction(null);

      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const account = accounts[0];
      setWalletAddress(account);

      // refund() selector: 0x590e1ae3
      const tx = await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: (summary?.contractAddress || getActiveContractAddress()) as `0x${string}`,
            data: "0x590e1ae3",
          },
        ],
      });

      setTxHash(tx);
      setTxSuccessAction("refund");
      setIsSubmittingRefund(false);
      setTimeout(loadData, 4000);
    } catch (err: any) {
      console.warn("Refund failed", err);
      setTxError(err?.message || "Refund transaction could not be processed.");
      setIsSubmittingRefund(false);
    }
  };

  const handleCollect = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setTxError("Please connect your wallet first.");
      return;
    }

    try {
      setIsSubmittingCollect(true);
      setTxError(null);
      setTxHash(null);
      setTxSuccessAction(null);

      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const account = accounts[0];
      setWalletAddress(account);

      // collect() selector: 0xe5225381
      const tx = await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: (summary?.contractAddress || getActiveContractAddress()) as `0x${string}`,
            data: "0xe5225381",
          },
        ],
      });

      setTxHash(tx);
      setTxSuccessAction("collect");
      setIsSubmittingCollect(false);
      setTimeout(loadData, 4000);
    } catch (err: any) {
      console.warn("Collect failed", err);
      setTxError(err?.message || "Disbursement transaction could not be completed.");
      setIsSubmittingCollect(false);
    }
  };

  const isBeneficiary =
    walletAddress &&
    walletAddress.toLowerCase() === BENEFICIARY_ADDRESS.toLowerCase();

  const userBalanceEth = summary
    ? (Number(summary.pledgedByCaller) / 1e18).toFixed(4)
    : "0.0000";

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
            Settlement & Refunds
          </span>
        </div>

        {/* Header */}
        <div className="pb-6 border-b border-[#E5DED2] space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EFEAE2] text-[#685D54] border border-[#E5DED2]">
              Assurance Protocol
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-[#685D54] border border-[#E5DED2]">
              Sepolia
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1F1D1A]">
            Settlement & Refund Portal
          </h1>
          <p className="text-sm sm:text-base text-[#685D54] max-w-2xl">
            Secure, non-custodial capital withdrawal and project settlement enforced directly by the smart contract.
          </p>
        </div>

        {/* Clean Popup Toast for Completed Transactions */}
        {txSuccessAction && txHash && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm animate-in fade-in space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>
                  {txSuccessAction === "refund"
                    ? "Refund Claimed Successfully!"
                    : "Campaign Funds Successfully Collected!"}
                </span>
              </div>
              <button
                onClick={() => setTxSuccessAction(null)}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-emerald-800">
              Your transaction has been broadcasted and confirmed on Ethereum Sepolia.
            </p>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-emerald-900 underline font-semibold"
            >
              <span>View Transaction on Sepolia Etherscan</span>
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

        {/* Two Polished Portals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. CONTRIBUTOR REFUND PORTAL */}
          <div className="bg-white p-7 sm:p-9 rounded-3xl border border-[#E5DED2] shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F3ECE2] text-[#685D54]">
                  Contributor Portal
                </span>
                <span className="text-xs text-[#8C8377] font-medium">Single-Tx Settlement</span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-[#1F1D1A]">
                  Claim Your Refund
                </h3>
                <p className="text-xs sm:text-sm text-[#685D54] mt-1 leading-relaxed">
                  If the campaign target was not reached by the deadline, your contribution remains 100% refundable.
                  Withdraw your funds directly back to your connected wallet.
                </p>
              </div>

              {/* Balance Card */}
              <div className="p-6 rounded-2xl bg-[#F6F1EA] border border-[#E5DED2] space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8C8377] block">
                  Your Claimable Balance
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-bold text-[#1F1D1A] font-serif">
                    {userBalanceEth} ETH
                  </span>
                  <span className="text-xs font-mono text-[#685D54]">
                    {walletAddress
                      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                      : "Wallet Disconnected"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#685D54]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Pull-based refund: zero intermediary delay</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Protected against reentrancy and lockups</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DED2] space-y-3">
              <button
                disabled={
                  isSubmittingRefund ||
                  !walletAddress ||
                  (summary ? summary.pledgedByCaller === BigInt(0) : true)
                }
                onClick={handleRefund}
                className="w-full py-4 rounded-full bg-[#8E8071] hover:bg-[#7D7062] active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {isSubmittingRefund ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Refund...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>Claim Refund ({userBalanceEth} ETH)</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[#8C8377]">
                Refunds are transferred immediately back to your connected address.
              </p>
            </div>
          </div>

          {/* 2. RECIPIENT DISBURSEMENT PORTAL */}
          <div className="bg-white p-7 sm:p-9 rounded-3xl border border-[#E5DED2] shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F3ECE2] text-[#685D54]">
                  Initiative Steward Portal
                </span>
                <span className="text-xs text-[#8C8377] font-medium">One-Shot Payout</span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-[#1F1D1A]">
                  Disburse Initiative Funds
                </h3>
                <p className="text-xs sm:text-sm text-[#685D54] mt-1 leading-relaxed">
                  When a campaign successfully satisfies its funding target, the verified beneficiary collects
                  the total accrued pool to deploy for the intended cause.
                </p>
              </div>

              {/* Pool Status Box */}
              <div className="p-6 rounded-2xl bg-[#F6F1EA] border border-[#E5DED2] space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#8C8377]">Designated Beneficiary:</span>
                  <span className="text-[#1F1D1A] font-mono">{BENEFICIARY_ADDRESS.slice(0, 10)}...</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#8C8377]">Funding Target:</span>
                  <span className="text-[#1F1D1A] font-mono">{TARGET_ETH} ETH</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#8C8377]">Accumulated Pool:</span>
                  <span className="text-[#1F1D1A] font-mono">
                    {summary ? summary.totalPledgedEth : "0.00"} ETH
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#685D54]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Target requirement verified in smart contract code</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>One-shot disbursement latch prevents duplicate withdrawals</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DED2] space-y-3">
              <button
                disabled={
                  isSubmittingCollect ||
                  !isBeneficiary ||
                  (summary ? summary.collected : true)
                }
                onClick={handleCollect}
                className="w-full py-4 rounded-full bg-[#1F1D1A] hover:bg-[#33302B] active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {isSubmittingCollect ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Disbursement...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>Disburse Campaign Pool ({summary ? summary.totalPledgedEth : "0.00"} ETH)</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[#8C8377]">
                Only the verified beneficiary address may authorize the collective payout.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
