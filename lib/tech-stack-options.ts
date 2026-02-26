export type TechStackOption = {
  id: string;
  label: string;
  iconSlug: string;
  iconColor?: string;
  aliases?: string[];
};

export const TECH_STACK_OPTIONS: TechStackOption[] = [
  { id: "typescript", label: "TypeScript", iconSlug: "typescript", aliases: ["ts"] },
  { id: "javascript", label: "JavaScript", iconSlug: "javascript", aliases: ["js"] },
  { id: "python", label: "Python", iconSlug: "python" },
  { id: "java", label: "Java", iconSlug: "openjdk" },
  { id: "csharp", label: "C#", iconSlug: "sharp", aliases: ["dotnet", ".net"] },
  { id: "go", label: "Go", iconSlug: "go", aliases: ["golang"] },
  { id: "php", label: "PHP", iconSlug: "php" },
  { id: "ruby", label: "Ruby", iconSlug: "ruby" },
  { id: "nodejs", label: "Node.js", iconSlug: "nodedotjs", aliases: ["node"] },
  { id: "express", label: "Express", iconSlug: "express", iconColor: "ffffff" },
  { id: "nestjs", label: "NestJS", iconSlug: "nestjs" },
  { id: "nextjs", label: "Next.js", iconSlug: "nextdotjs", iconColor: "ffffff" },
  { id: "react", label: "React", iconSlug: "react" },
  { id: "vue", label: "Vue", iconSlug: "vuedotjs", aliases: ["vue.js"] },
  { id: "angular", label: "Angular", iconSlug: "angular" },
  { id: "django", label: "Django", iconSlug: "django", iconColor: "ffffff" },
  { id: "fastapi", label: "FastAPI", iconSlug: "fastapi" },
  { id: "springboot", label: "Spring Boot", iconSlug: "springboot", aliases: ["spring"] },
  { id: "laravel", label: "Laravel", iconSlug: "laravel" },
  { id: "rails", label: "Rails", iconSlug: "rubyonrails", aliases: ["ruby on rails"] },
  { id: "postgresql", label: "PostgreSQL", iconSlug: "postgresql", aliases: ["postgres"] },
  { id: "mysql", label: "MySQL", iconSlug: "mysql" },
  { id: "mongodb", label: "MongoDB", iconSlug: "mongodb", aliases: ["mongo"] },
  { id: "redis", label: "Redis", iconSlug: "redis" },
  { id: "supabase", label: "Supabase", iconSlug: "supabase" },
  { id: "firebase", label: "Firebase", iconSlug: "firebase" },
  { id: "aws", label: "AWS", iconSlug: "amazonwebservices" },
  { id: "gcp", label: "GCP", iconSlug: "googlecloud", aliases: ["google cloud"] },
  { id: "azure", label: "Azure", iconSlug: "microsoftazure" },
  { id: "docker", label: "Docker", iconSlug: "docker" },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9#.]+/g, "").trim();

export function getTechOption(label: string): TechStackOption | undefined {
  const normalized = normalize(label);
  return TECH_STACK_OPTIONS.find((option) => {
    if (normalize(option.label) === normalized) return true;
    return (option.aliases ?? []).some((alias) => normalize(alias) === normalized);
  });
}

export function getTechIconUrl(option: TechStackOption) {
  if (option.iconSlug === "microsoftazure") {
    return "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/microsoftazure.svg";
  }

  return option.iconColor
    ? `https://cdn.simpleicons.org/${option.iconSlug}/${option.iconColor}`
    : `https://cdn.simpleicons.org/${option.iconSlug}`;
}
