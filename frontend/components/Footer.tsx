import React from "react";
import Link from "next/link";
import { ExternalLink, ShieldCheck, Github, FileCode, CheckCircle2 } from "lucide-react";
import { STEPWELL_ADDRESS } from "../lib/contracts";

export function Footer() {
  return (
    <footer className="w-full bg-[#141311] text-[#A69E94] pt-14 pb-8 rounded-t-[2.5rem] mt-20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-12">
        <div className="flex flex-col lg:flex-row justify-between gap-10">
          {/* Brand Info */}
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#141311]">
                <svg
                  className="w-4 h-4 text-[#141311]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9" />
                  <path d="M12 2v7" />
                  <path d="M12 9c-3 0-5 2-5 5" />
                  <path d="M12 9c3 0 5 2 5 5" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Step<span className="text-[#8E8071]">well</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#8C8377] leading-relaxed">
              An immutable assurance contract for the Road to Devcon Indore chapter.
              Sixty students, one venue deposit, and an on-chain promise nobody has to trust anyone on.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Deployed on Sepolia (11155111)</span>
            </div>
          </div>

          {/* Nav Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-14 text-xs sm:text-sm">
            <div>
              <h4 className="font-semibold text-white mb-3 tracking-wide">Protocol</h4>
              <ul className="space-y-2 text-[#9A9187]">
                <li>
                  <Link href="/campaign" className="hover:text-white transition-colors">
                    Pledge Campaign
                  </Link>
                </li>
                <li>
                  <Link href="/settlement" className="hover:text-white transition-colors">
                    Settlement & Refunds
                  </Link>
                </li>
                <li>
                  <Link href="/verify" className="hover:text-white transition-colors">
                    Security & Proofs
                  </Link>
                </li>
                <li>
                  <a
                    href={`https://sepolia.etherscan.io/address/${STEPWELL_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span>Sepolia Contract</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 tracking-wide">Security</h4>
              <ul className="space-y-2 text-[#9A9187]">
                <li>
                  <Link href="/verify#pull-refunds" className="hover:text-white transition-colors">
                    Pull-Based Refunds
                  </Link>
                </li>
                <li>
                  <Link href="/verify#cei" className="hover:text-white transition-colors">
                    Checks-Effects-Interactions
                  </Link>
                </li>
                <li>
                  <Link href="/verify#invariants" className="hover:text-white transition-colors">
                    Foundry Invariants (38/38)
                  </Link>
                </li>
                <li>
                  <Link href="/verify#no-sweep" className="hover:text-white transition-colors">
                    Zero Admin Privilege
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 tracking-wide">Meetup</h4>
              <ul className="space-y-2 text-[#9A9187]">
                <li>
                  <span className="text-[#D8CCBD]">Road to Devcon Indore</span>
                </li>
                <li>
                  <span className="text-[#8C8377]">Organiser: Meera</span>
                </li>
                <li>
                  <span className="text-[#8C8377]">Target: 0.05 Sepolia ETH</span>
                </li>
                <li>
                  <span className="text-[#8C8377]">Venue: 60-Student Hall</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#25221E] pt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 text-xs text-[#7F766C]">
          <p>© Stepwell 2026. The meetup that only happens if we all chip in.</p>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://sepolia.etherscan.io/address/${STEPWELL_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-full border border-[#2B2723] hover:border-[#4B443D] text-[#B8AF9F] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-300" />
              <span>Sepolia: {STEPWELL_ADDRESS.slice(0, 6)}...{STEPWELL_ADDRESS.slice(-4)}</span>
            </a>
            <Link
              href="/verify"
              className="px-3.5 py-1.5 rounded-full border border-[#2B2723] hover:border-[#4B443D] text-[#B8AF9F] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>38/38 Verified Tests</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
