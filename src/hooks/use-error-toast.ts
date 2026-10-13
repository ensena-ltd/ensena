"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// Shows a form's current error message as a Sonner error toast whenever it
// changes (the inline message stays too, next to the field it's about).
export function useErrorToast(message: string | null | undefined) {
  useEffect(() => {
    if (message) toast.error(message);
  }, [message]);
}
