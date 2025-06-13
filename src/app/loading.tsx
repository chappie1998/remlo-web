export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-emerald-400 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
} 