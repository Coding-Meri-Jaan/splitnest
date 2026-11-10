import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

// Static gradient pairs keep Tailwind's class scanner happy while giving each
// person a stable, recognisable colour.
const gradients = [
  "bg-linear-to-br from-indigo-500 to-violet-600",
  "bg-linear-to-br from-fuchsia-500 to-rose-500",
  "bg-linear-to-br from-emerald-500 to-teal-600",
  "bg-linear-to-br from-amber-400 to-orange-500",
  "bg-linear-to-br from-sky-500 to-blue-600",
  "bg-linear-to-br from-violet-500 to-purple-600",
  "bg-linear-to-br from-rose-400 to-pink-600",
  "bg-linear-to-br from-cyan-500 to-teal-600",
];

function hashName(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function MemberAvatar({
  name,
  size = "default",
  className,
}: MemberAvatarProps) {
  const gradient = gradients[hashName(name) % gradients.length];

  return (
    <Avatar size={size} className={cn("shadow-sm", className)}>
      <AvatarFallback
        className={cn(
          "font-semibold text-white ring-1 ring-inset ring-white/25",
          gradient
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
