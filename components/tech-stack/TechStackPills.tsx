import Image from "next/image";
import { getTechIconUrl, getTechOption } from "@/lib/tech-stack-options";

type TechStackPillsProps = {
  stack: string[];
};

export function TechStackPills({ stack }: TechStackPillsProps) {
  if (stack.length === 0) {
    return <p className="text-sm text-slate-400">Stack: Not set</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {stack.map((item) => {
        const option = getTechOption(item);

        return (
          <span key={`${item}-${option?.id ?? "custom"}`} className="stack-pill">
            {option && <Image src={getTechIconUrl(option)} alt={`${option.label} logo`} width={14} height={14} />}
            {option?.label ?? item}
          </span>
        );
      })}
    </div>
  );
}
