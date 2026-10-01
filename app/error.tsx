"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, log digest or masked error to external monitoring service
    console.error("[VÉRONA APPLICATION ERROR]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center p-6 bg-neutral-950 text-neutral-100"
    >
      <div className="max-w-md w-full border border-neutral-800 rounded-xl p-8 bg-neutral-900/60 text-center space-y-6">
        <div className="inline-flex p-3 rounded-full bg-red-950/60 border border-red-800/50 text-red-400">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-light tracking-wide uppercase">
            Service Temporarily Unavailable
          </h2>
          <p className="text-xs text-neutral-400 mt-2">
            An unexpected error occurred while processing your request. Our engineering team has been notified.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-neutral-600 mt-2">
              Reference: {error.digest}
            </p>
          )}
        </div>

        <button
          onClick={() => reset()}
          className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-950 font-medium text-xs rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
