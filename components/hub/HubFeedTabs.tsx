import { HubSort } from "@/lib/supabase/client";

type HubFeedTabsProps = {
  sort: HubSort;
  onChange: (value: HubSort) => void;
};

export function HubFeedTabs({ sort, onChange }: HubFeedTabsProps) {
  return (
    <div className="inline-flex rounded-full border border-slate-600 bg-slate-900/70 p-1">
      <button
        type="button"
        onClick={() => onChange("newest")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          sort === "newest" ? "bg-cyan-400 text-slate-900" : "text-slate-300"
        }`}
      >
        Newest
      </button>
      <button
        type="button"
        onClick={() => onChange("trending")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          sort === "trending" ? "bg-cyan-400 text-slate-900" : "text-slate-300"
        }`}
      >
        Trending
      </button>
    </div>
  );
}
