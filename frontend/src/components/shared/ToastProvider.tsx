"use client";

import toast, { Toaster, resolveValue, type Toast } from "react-hot-toast";
import { CheckCircle2, XCircle, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "loading" | "blank";

const CONFIG: Record<
    ToastKind,
    { accent: string; chip: string; Icon: React.ElementType; spin?: boolean }
> = {
    success: { accent: "bg-success", chip: "bg-success/10 text-success", Icon: CheckCircle2 },
    error: { accent: "bg-destructive", chip: "bg-destructive/10 text-destructive", Icon: XCircle },
    loading: { accent: "bg-brand-600", chip: "bg-brand-50 text-brand-700", Icon: Loader2, spin: true },
    blank: { accent: "bg-brand-600", chip: "bg-brand-50 text-brand-700", Icon: Info },
};

function AppToast({ t }: { t: Toast }) {
    // Let fully-custom toasts render as-is.
    if (t.type === "custom") return <>{resolveValue(t.message, t)}</>;

    const cfg = CONFIG[(t.type as ToastKind) in CONFIG ? (t.type as ToastKind) : "blank"];
    const { Icon } = cfg;

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                opacity: t.visible ? 1 : 0,
                transform: t.visible ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.97)",
                transition: "all 220ms cubic-bezier(0.21, 1.02, 0.73, 1)",
            }}
            className="pointer-events-auto flex w-full max-w-sm items-stretch overflow-hidden rounded-lg border border-border bg-card shadow-lg ring-1 ring-black/5"
        >
            {/* Colored accent rail */}
            <span className={cn("w-1 flex-shrink-0", cfg.accent)} aria-hidden="true" />

            <div className="flex flex-1 items-start gap-3 py-3 pl-3 pr-2">
                <span
                    className={cn(
                        "mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full",
                        cfg.chip,
                    )}
                >
                    <Icon className={cn("h-4 w-4", cfg.spin && "animate-spin")} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1 self-center text-sm font-medium leading-snug text-foreground">
                    {resolveValue(t.message, t)}
                </div>

                {t.type !== "loading" && (
                    <button
                        type="button"
                        onClick={() => toast.dismiss(t.id)}
                        aria-label="Dismiss notification"
                        className="-mr-0.5 mt-0.5 flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
                duration: 4000,
                success: { duration: 4000 },
                error: { duration: 6000 },
            }}
        >
            {(t) => <AppToast t={t} />}
        </Toaster>
    );
}
