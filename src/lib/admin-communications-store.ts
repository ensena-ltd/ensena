import type { MessageChannel } from "@/lib/admin-communications-data";

const SENT_KEY = "ensena_communications_sent";
const SCHEDULED_KEY = "ensena_communications_scheduled";
export const COMMS_EVENT = "ensena:communications-changed";

export interface SentMessage {
  id: string;
  atMs: number;
  sentBy: string;
  audienceLabel: string;
  recipientCount: number;
  channels: MessageChannel[];
  subject: string;
  body: string;
}

export interface ScheduledMessage {
  id: string;
  scheduledForMs: number;
  scheduledForLabel: string;
  sentBy: string;
  audienceLabel: string;
  recipientCount: number;
  channels: MessageChannel[];
  subject: string;
  body: string;
}

const seedSent: SentMessage[] = [
  {
    id: "sent-seed-1",
    atMs: new Date(2026, 7, 28, 12, 42).getTime(),
    sentBy: "Benny (Admin)",
    audienceLabel: "Active students in Lagos",
    recipientCount: 42,
    channels: ["Email", "In-App"],
    subject: "New WAEC Mathematics Classes Available",
    body: "New WAEC Mathematics preparation classes are now available on Ensena.",
  },
];

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const readSent = makeCachedReader<SentMessage[]>(SENT_KEY, seedSent);
const readScheduled = makeCachedReader<ScheduledMessage[]>(SCHEDULED_KEY, []);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(COMMS_EVENT));
}

export function getSentMessages(): SentMessage[] {
  return readSent();
}

export function getScheduledMessages(): ScheduledMessage[] {
  return readScheduled();
}

export function sendMessage(input: Omit<SentMessage, "id" | "atMs">): void {
  const entry: SentMessage = { ...input, id: `sent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, atMs: Date.now() };
  writeJson(SENT_KEY, [entry, ...readSent()]);
}

export function scheduleMessage(input: Omit<ScheduledMessage, "id">): void {
  const entry: ScheduledMessage = { ...input, id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  writeJson(SCHEDULED_KEY, [entry, ...readScheduled()]);
}

export function cancelScheduledMessage(id: string): void {
  writeJson(SCHEDULED_KEY, readScheduled().filter((m) => m.id !== id));
}

export function subscribeCommunications(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COMMS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COMMS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export { seedSent };
