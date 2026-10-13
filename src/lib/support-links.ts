import type { RelatedRecordType, SupportContext, SupportSource } from "@/lib/support-data";

export type SupportRole = "Guest" | "Student" | "Tutor" | "Admin";

interface SupportLinkParams {
  role: SupportRole;
  context: SupportContext;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: string;
  relatedRecordLabel?: string;
  category?: string;
  source?: SupportSource;
}

function supportQuery(params: SupportLinkParams): string {
  const query = new URLSearchParams({ context: params.context });
  if (params.relatedRecordType) query.set("relatedRecordType", params.relatedRecordType);
  if (params.relatedRecordId) query.set("relatedRecordId", params.relatedRecordId);
  if (params.relatedRecordLabel) query.set("relatedRecordLabel", params.relatedRecordLabel);
  if (params.category) query.set("category", params.category);
  if (params.source) query.set("source", params.source);
  return query.toString();
}

// The actual ticket-submission form. Reached two ways: directly, when
// something inside a Help Center (Submit a Ticket / Report an Issue)
// already did its job of getting the person there; never as the first
// thing a "Contact Support" click shows — see buildContactSupportHref.
export function buildSupportHref(params: SupportLinkParams): string {
  const basePath =
    params.role === "Student"
      ? "/student-dashboard/support/new"
      : params.role === "Tutor"
        ? "/tutor-dashboard/support/new"
        : params.role === "Admin"
          ? "/admin/support/new"
          : "/support/new";

  return `${basePath}?${supportQuery(params)}`;
}

// Every "Contact Support" entry point across the platform (NeedHelpCard,
// sidebars, sign-in/sign-up, the public site header) builds its link with
// this function, not buildSupportHref — the Help Center is always the
// first screen, per the "Contact Support -> Help Center -> Submit a
// Ticket" flow. The same context/related-record params still travel along
// as query params, so once someone clicks "Submit a Ticket" inside the
// Help Center, the actual form is exactly as pre-filled as it always was.
export function buildContactSupportHref(params: SupportLinkParams): string {
  const basePath =
    params.role === "Student"
      ? "/student-dashboard/help"
      : params.role === "Tutor"
        ? "/tutor-dashboard/help"
        : params.role === "Admin"
          ? "/admin/help"
          : "/help-center";

  return `${basePath}?${supportQuery(params)}`;
}
