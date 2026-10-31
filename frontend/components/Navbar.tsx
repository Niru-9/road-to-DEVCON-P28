"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, ExternalLink, ChevronDown, RefreshCw } from "lucide-react";
import { STEPWELL_ADDRESS, SEPOLIA_CHAIN_ID } from "../lib/contracts";

interface NavbarProps {
  walletAddress?: string | null;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
}

export function Navbar({ walletAddress, onConnectWallet, onDisconnectWallet }: NavbarProps) {
  const pathname = usePathname();
  const [internalWallet, setInternalWallet] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const activeAddress = walletAddress !== undefined ? walletAddress : internalWallet;

  const checkConnection = useCallback(async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      try {
        const accounts = await eth.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setInternalWallet(accounts[0]);
        }
        const hexChainId = await eth.request({ method: "eth_chainId" });
        if (hexChainId) {
          setChainId(parseInt(hexChainId, 16));
        }
      } catch (e) {
        console.warn("Wallet read error", e);
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();

    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const handleAccountsChanged = (accs: string[]) => {
        setInternalWallet(accs.length > 0 ? accs[0] : null);
      };
      const handleChainChanged = (hex: string) => {
        setChainId(parseInt(hex, 16));
      };

      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);

      return () => {
        if (eth.removeListener) {
          eth.removeListener("accountsChanged", handleAccountsChanged);
          eth.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [checkConnection]);

  const handleSwitchNetwork = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setIsSwitching(true);
        const eth = (window as any).ethereum;
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // 11155111 in hex
        });
        setChainId(SEPOLIA_CHAIN_ID);
        setIsSwitching(false);
      } catch (err: any) {
        // Chain 11155111 might need to be added
        if (err.code === 4902) {
          try {
            const eth = (window as any).ethereum;
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xaa36a7",
                  chainName: "Sepolia Test Network",
                  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["https://rpc.sepolia.org"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
            setChainId(SEPOLIA_CHAIN_ID);
          } catch (addError) {
            console.error(addError);
          }
        }
        setIsSwitching(false);
      }
    }
  };

  const handleWalletClick = async () => {
    if (onConnectWallet && !activeAddress) {
      onConnectWallet();
      return;
    }
    if (activeAddress && onDisconnectWallet) {
      onDisconnectWallet();
      return;
    }

    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const eth = (window as any).ethereum;
        const accounts = await eth.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          setInternalWallet(accounts[0]);
        }
        const hex = await eth.request({ method: "eth_chainId" });
        const cId = parseInt(hex, 16);
        setChainId(cId);

        if (cId !== SEPOLIA_CHAIN_ID) {
          await handleSwitchNetwork();
        }
      } catch (err) {
        console.error("Connection failed", err);
      }
    } else {
      alert("Please install MetaMask or a compatible EVM browser wallet.");
    }
  };

  const navLinks = [
    { href: "/", label: "Explore" },
    { href: "/campaign", label: "Campaigns" },
    { href: "/settlement", label: "Settlement & Refunds" },
    { href: "/verify", label: "Verification" },
  ];

  const isWrongNetwork = activeAddress && chainId !== null && chainId !== SEPOLIA_CHAIN_ID;

  return (
    <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2.5 cursor-pointer select-none group">
        <div className="w-8 h-8 rounded-full bg-[#1F1D1A] flex items-center justify-center text-[#FBF7F4] shadow-xs group-hover:scale-105 transition-transform">
          <svg
            className="w-4 h-4 text-[#EFEAE2]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9" />
            <path d="M12 2v7" />
            <path d="M12 9c-3 0-5 2-5 5" />
            <path d="M12 9c3 0 5 2 5 5" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-[#1F1D1A]">
          Step<span className="font-medium text-[#685D54]">well</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A453E]">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors py-1 border-b-2 ${
                isActive
                  ? "border-[#1F1D1A] text-[#1F1D1A] font-semibold"
                  : "border-transparent text-[#685D54] hover:text-[#1F1D1A]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Network & Wallet Actions */}
      <div className="flex items-center gap-3">
        {/* Subtle Network Status Indicator */}
        {isWrongNetwork ? (
          <button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{isSwitching ? "Switching..." : "Switch to Sepolia"}</span>
          </button>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F3ECE2] text-[#685D54] border border-[#E5DED2]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sepolia</span>
          </span>
        )}

        {/* Connect Wallet Button */}
        <button
          onClick={handleWalletClick}
          className="px-5 py-2.5 rounded-full bg-[#8E8071] hover:bg-[#7D7062] active:scale-95 transition-all text-xs sm:text-sm font-medium text-[#FAF8F5] shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Wallet className="w-4 h-4 text-[#F3ECE2]" />
          {activeAddress ? (
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}</span>
            </span>
          ) : (
            "Connect Wallet"
          )}
        </button>
      </div>
    </header>
  );
}
