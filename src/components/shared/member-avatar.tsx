import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";

interface MemberAvatarProps {
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function MemberAvatar({
  name,
  size = "default",
  className,
}: MemberAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
