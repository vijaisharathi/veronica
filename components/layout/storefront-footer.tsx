"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, RotateCcw, Truck, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import { APP_CONFIG } from "@/config/constants";
import { ROUTES } from "@/config/routes";
import { FOOTER_SECTIONS } from "@/config/navigation";

export function StorefrontFooter() {
  const [email, setEmail] = React.useState("");
  const [newsletterStatus, setNewsletterStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setNewsletterStatus("error");
      setErrorMessage("Please provide a valid email address");
      return;
    }

    setNewsletterStatus("success");
    setErrorMessage("");
    setEmail("");
  };

  return (
    <footer className="bg-neutral-950 text-neutral-300 border-t border-neutral-800 pt-16 pb-24 lg:pb-16 text-xs">
      {/* Commerce Assurances Bar */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12 mb-12 border-b border-neutral-800/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h5 className="font-semibold text-neutral-100 uppercase tracking-wider text-[11px]">
                100% Genuine Couture
              </h5>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Authenticity certified directly from ateliers.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h5 className="font-semibold text-neutral-100 uppercase tracking-wider text-[11px]">
                Hassle-Free Returns
              </h5>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                14-day doorstep reverse logistics pickup.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-amber-400 shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h5 className="font-semibold text-neutral-100 uppercase tracking-wider text-[11px]">
                Express Logistics
              </h5>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Pan-India rapid transit across 19,000+ pincodes.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h5 className="font-semibold text-neutral-100 uppercase tracking-wider text-[11px]">
                Sartorial Excellence
              </h5>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Handpicked fabrics and master tailoring.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Navigation Columns from Centralized Config */}
          {FOOTER_SECTIONS.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <h5 className="font-semibold text-neutral-100 uppercase tracking-widest text-[11px]">
                {section.title}
              </h5>
              <ul className="space-y-2 text-neutral-400">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link
                      href={link.href}
                      className={`hover:text-white transition-colors ${
                        link.isSale ? "text-red-400 hover:text-red-300 font-medium" : ""
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Subscription Column */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <h5 className="font-semibold text-neutral-100 uppercase tracking-widest text-[11px]">
              The Atelier Gazette
            </h5>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Receive private invitations to seasonal collections and trunk shows.
            </p>

            {newsletterStatus === "success" ? (
              <div className="rounded bg-neutral-900 border border-emerald-800/60 p-3 space-y-1 animate-fade-in">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Subscription Confirmed</span>
                </div>
                <p className="text-[10px] text-neutral-400">
                  Welcome to the VÉRONA Gazette. Invitations will be dispatched to your inbox.
                </p>
              </div>
            ) : (
              <form noValidate onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (newsletterStatus === "error") setNewsletterStatus("idle");
                    }}
                    placeholder="Enter your email address"
                    className="w-full rounded bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500"
                    aria-label="Email address for newsletter"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs transition-colors flex items-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                    aria-label="Subscribe to newsletter"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                {newsletterStatus === "error" && (
                  <p className="text-[10px] text-red-400 animate-fade-in">{errorMessage}</p>
                )}
                <p className="text-[10px] text-neutral-500">
                  By subscribing, you accept our Privacy Notice.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Copyright & Legal Links */}
        <div className="mt-16 pt-8 border-t border-neutral-900 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <p>
            &copy; {new Date().getFullYear()} {APP_CONFIG.NAME} Private Limited. All rights reserved. Registered Indian Trademark.
          </p>
          <div className="flex items-center gap-4">
            <Link href={ROUTES.STATES} className="hover:text-neutral-400">Terms of Use</Link>
            <span>•</span>
            <Link href={ROUTES.STATES} className="hover:text-neutral-400">Privacy Notice</Link>
            <span>•</span>
            <Link href={ROUTES.STATES} className="hover:text-neutral-400">Security &amp; Encryption</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
