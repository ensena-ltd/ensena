// One shared query-param contract for "show the post-class review popup
// immediately on arrival" — set by classroom-shell.tsx whenever a Private or
// Group class ends (never Discovery, which is excluded from reviews
// entirely), and read by whichever page the tutor/student lands on right
// after leaving the classroom. A single constant/helper here means every
// call site agrees on the exact param name instead of hand-rolling it.
export const REVIEW_PROMPT_PARAM = "reviewPrompt";

export function appendReviewPrompt(href: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${REVIEW_PROMPT_PARAM}=1`;
}
