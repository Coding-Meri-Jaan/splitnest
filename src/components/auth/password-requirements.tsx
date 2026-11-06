import { PASSWORD_REQUIREMENTS } from "@/lib/auth/password";

export function PasswordRequirements() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        Use at least:
      </p>
      <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        {PASSWORD_REQUIREMENTS.map((requirement) => (
          <li key={requirement} className="flex items-start gap-1.5">
            <span aria-hidden className="mt-0.5 text-primary">
              •
            </span>
            <span>{requirement}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
