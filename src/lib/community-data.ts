// Data model for the future Community feature (see feature-flags.ts —
// stays behind `community: false` until explicitly activated). An academic
// discussion platform, not a social network: posts are questions, study
// tips, exam/subject discussions, resources, career/education topics and
// tutor insights — never followers, stories, or a personal-life feed.
//
// Authorship is a relationship to an existing Ensena user, not a duplicate
// Community-only account — authorName/authorRole follow the exact same
// convention as SupportRequest.userName/userRole (support-data.ts), since
// this app has no real backend/foreign keys, only named references to the
// existing dashboardStudent/dashboardTutor personas and admin roster.
//
// subject/academicLevel/exam are plain strings deliberately: they're meant
// to be populated from the SAME existing taxonomies used everywhere else
// (tutors.ts's academicSubjectOptions/languageSubjectOptions, data.ts's
// academicLevels, exams-data.ts's activeExams()) rather than a new,
// parallel Community-only subject list.
export type CommunityPostType =
  | "QUESTION"
  | "STUDY_TIP"
  | "EXAM_DISCUSSION"
  | "SUBJECT_DISCUSSION"
  | "RESOURCE"
  | "CAREER_EDUCATION"
  | "TUTOR_INSIGHT"
  | "GENERAL";

// MVP-era category filters shown in the future feed UI — a narrower, more
// student-facing framing of the underlying post types above (multiple post
// types can map to one visible category); this is the one place that
// decides what's selectable in the UI, mirroring how SUPPORT_CONTEXT_CONFIG
// keeps the support system's categories separate from its internal types.
export type CommunityCategory = "All" | "Questions" | "Study Tips" | "Exams" | "Subjects" | "Career & Education" | "Tutor Insights" | "General";

export const CATEGORY_TO_POST_TYPES: Record<Exclude<CommunityCategory, "All">, CommunityPostType[]> = {
  Questions: ["QUESTION"],
  "Study Tips": ["STUDY_TIP"],
  Exams: ["EXAM_DISCUSSION"],
  Subjects: ["SUBJECT_DISCUSSION"],
  "Career & Education": ["CAREER_EDUCATION"],
  "Tutor Insights": ["TUTOR_INSIGHT"],
  General: ["GENERAL", "RESOURCE"],
};

export type CommunityAuthorRole = "Student" | "Tutor" | "Admin";
export type CommunityContentStatus = "Published" | "Removed" | "Flagged";

export interface CommunityAttachment {
  name: string;
  size: string;
  dataUrl: string;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorRole: CommunityAuthorRole;
  title: string;
  body: string;
  type: CommunityPostType;
  subject?: string;
  academicLevel?: string;
  exam?: string;
  attachments?: CommunityAttachment[];
  createdAtISO: string;
  updatedAtISO: string;
  status: CommunityContentStatus;
  helpfulCount: number;
  helpfulBy: string[];
  commentCount: number;
  savedBy: string[];
  reportCount: number;
  // Ties "✓ Answered" (see section 8 of the spec) to one specific comment,
  // settable only by the post's own author.
  bestAnswerCommentId?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  parentCommentId?: string;
  authorName: string;
  authorRole: CommunityAuthorRole;
  body: string;
  createdAtISO: string;
  helpfulCount: number;
  helpfulBy: string[];
  status: CommunityContentStatus;
}

// Future notification kinds (see feature-flags.ts's community flag) — types
// only, never wired into the live notification system while disabled.
export type CommunityNotificationType =
  | "post_answered"
  | "comment_reply"
  | "best_answer_selected"
  | "content_moderated";
