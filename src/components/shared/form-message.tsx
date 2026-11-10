import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FormMessageProps {
  error?: string | null;
  message?: string | null;
}

export function FormMessage({ error, message }: FormMessageProps) {
  if (!error && !message) {
    return null;
  }

  const isError = Boolean(error);
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <p
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "sn-pop flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
          : "sn-pop flex items-start gap-2 rounded-xl border border-success/25 bg-success/8 px-3.5 py-2.5 text-sm text-success"
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{error ?? message}</span>
    </p>
  );
}
