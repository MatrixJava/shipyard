import { HubSort } from "@/lib/supabase/client";

type HubFeedTabsProps = {
  sort: HubSort;
  onChange: (value: HubSort) => void;
};

export function HubFeedTabs({ sort, onChange }: HubFeedTabsProps) {
  return (
    <div className="inline-flex rounded-full border border-sky-200/35 bg-sky-100/10 p-1">
      <button
        type="button"
        onClick={() => onChange("newest")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          sort === "newest" ? "bg-sky-100 text-sky-900" : "text-sky-100"
        }`}
      >
        Newest
      </button>
      <button
        type="button"
        onClick={() => onChange("trending")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          sort === "trending" ? "bg-sky-100 text-sky-900" : "text-sky-100"
        }`}
      >
        Trending
      </button>
    </div>
  );
}
