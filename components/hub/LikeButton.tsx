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
          ? "border-emerald-200/70 bg-emerald-200/16 text-emerald-100"
          : "border-sky-200/40 bg-sky-100/8 text-sky-100"
      } disabled:opacity-60`}
    >
      {liked ? "Liked" : "Like"} ({count})
    </button>
  );
}
