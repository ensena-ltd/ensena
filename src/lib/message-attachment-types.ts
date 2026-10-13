// Shared attachment metadata shape for both ChatMessage (tutor-dashboard-data.ts)
// and StudentChatMessage (student-dashboard-data.ts) — split into its own
// file with zero dependencies so both can import it without creating a
// circular import with messages-store.ts (which imports both message types).
// The actual file bytes live in IndexedDB (attachment-store.ts); a message
// only ever carries this lightweight reference.
export interface MessageAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}
