import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-neutral-950 text-neutral-100">
      <div className="max-w-md w-full border border-neutral-800 rounded-xl p-8 bg-neutral-900/60 text-center space-y-6">
        <span className="text-6xl font-extralight tracking-widest text-neutral-500 font-mono">
          404
        </span>

        <div>
          <h2 className="text-xl font-light tracking-wide uppercase">
            Page Not Found
          </h2>
          <p className="text-xs text-neutral-400 mt-2">
            The destination you requested does not exist or has been relocated within the VÉRONA catalogue.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-950 font-medium text-xs rounded-lg transition-colors text-center"
        >
          Return to Overview
        </Link>
      </div>
    </div>
  );
}
