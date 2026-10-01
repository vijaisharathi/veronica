export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading VÉRONA application"
      className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400"
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-100" />
        <p className="text-xs font-mono tracking-widest uppercase text-neutral-500">
          Loading VÉRONA...
        </p>
      </div>
    </div>
  );
}
