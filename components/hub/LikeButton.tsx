type LikeButtonProps = {
  liked: boolean;
  count: number;
  disabled?: boolean;
  onToggle: () => void;
};

export function LikeButton({ liked, count, disabled, onToggle }: LikeButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
        liked
          ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
          : "border-slate-500 text-slate-200"
      } disabled:opacity-60`}
    >
      {liked ? "Liked" : "Like"} ({count})
    </button>
  );
}
