"use client";

// Browser side of push notifications: registers /sw.js, asks permission,
// subscribes with the server's VAPID public key and saves the subscription
// (or removes it). Works in Chrome, Edge, Firefox and Android; on iPhone /
// iPad only once Ensena is added to the Home Screen (iOS 16.4+).
import { removePushSubscription, savePushSubscription } from "@/lib/actions/notifications";

export type PushSupport = "supported" | "unsupported" | "needs-install" | "denied";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return isIos && !standalone ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "supported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  const support = pushSupport();
  if (support === "needs-install") return { ok: false, message: "On iPhone/iPad, add Ensena to your Home Screen first (Share → Add to Home Screen), then turn this on from there." };
  if (support === "denied") return { ok: false, message: "Notifications are blocked for Ensena in your browser settings. Allow them, then try again." };
  if (support !== "supported") return { ok: false, message: "This browser doesn't support push notifications." };
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { ok: false, message: "Push notifications aren't set up on the server yet." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, message: "You didn't allow notifications, so push wasn't turned on." };

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  return savePushSubscription(json, navigator.userAgent);
}

export async function disablePush(): Promise<{ ok: boolean; message?: string }> {
  const sub = await currentPushSubscription();
  const endpoint = sub?.endpoint ?? null;
  if (sub) await sub.unsubscribe().catch(() => undefined);
  return removePushSubscription(endpoint);
}
