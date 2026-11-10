import { Badge } from "@/components/ui/badge";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type GroupRole } from "@/lib/roles";

interface RoleBadgeProps {
  role: GroupRole | null | undefined;
  className?: string;
  /** Adds a title tooltip describing what the role can do. */
  withDescription?: boolean;
}

export function RoleBadge({
  role,
  className,
  withDescription = false,
}: RoleBadgeProps) {
  if (!role) return null;

  return (
    <Badge
      variant={role === "owner" ? "secondary" : "outline"}
      className={className}
      title={withDescription ? ROLE_DESCRIPTIONS[role] : undefined}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
