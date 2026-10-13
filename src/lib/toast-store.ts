// App-wide toasts are Sonner's (mounted once via <Toaster /> in the root
// layout — src/components/ui/toaster.tsx). New code should call Sonner
// directly: `import { toast } from "sonner"; toast.success(...) / toast.error(...)`.
// showToast() is kept so existing call sites keep working unchanged; it
// just forwards to Sonner.
import { toast } from "sonner";

export type ToastTone = "default" | "success" | "error";

export function showToast(text: string, tone: ToastTone = "default", durationMs = 2500): void {
  const options = { duration: durationMs };
  if (tone === "success") toast.success(text, options);
  else if (tone === "error") toast.error(text, options);
  else toast(text, options);
}
