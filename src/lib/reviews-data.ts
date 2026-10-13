// The single, real review model for the whole platform — replaces three
// previously separate, incompatible review shapes that existed nowhere
// near each other (tutors.ts's synthetic `reviewList`, tutor-dashboard-data
// .ts's local-state `TutorReview`, admin-data.ts's local-state
// `AdminReview`). Every review, in either direction, is one record here;
// the Tutor Dashboard, Student Dashboard, and Admin Dashboard all read the
// same store rather than three disconnected mock arrays.
export type ReviewDirection = "student-to-tutor" | "tutor-to-student";

// Published: visible on the recipient's public/dashboard reviews.
// Reported: the recipient has asked Admin to look at it — still visible
// (reviews are never self-removable) until Admin resolves the request.
// Removed by Admin: no longer shown publicly, but the record is kept for
// the audit trail rather than hard-deleted.
export type ReviewStatus = "Published" | "Reported" | "Removed by Admin";

export interface Review {
  id: string;
  direction: ReviewDirection;
  reviewerName: string;
  reviewerImage?: string;
  recipientName: string;
  recipientImage?: string;
  // The real underlying booking/lesson id this review is tied to (an
  // escrow LessonConfirmation id or a PrivateLesson/StudentLesson id) —
  // never a fabricated/orphan reference.
  bookingId: string;
  bookingType: "Private" | "Group" | "Discovery";
  subject: string;
  rating: number; // 1-5
  comment: string;
  submittedAtMs: number;
  submittedAtLabel: string;
  status: ReviewStatus;
  reportReason?: string;
  reportDetails?: string;
  reportedAtLabel?: string;
  adminNote?: string;
  resolvedBy?: string;
  resolvedAtLabel?: string;
  // A tutor may publicly reply to a student's review of them — this is
  // distinct from editing/deleting the review itself (the review's own
  // rating/comment/status stay exactly as the student submitted them).
  tutorReply?: string;
}

export const reportReasons = [
  "Review is false or misleading",
  "Inappropriate or offensive language",
  "Unrelated to the actual lesson",
  "Personal information disclosed",
  "Other",
];

export const reviewStatusStyles: Record<ReviewStatus, string> = {
  Published: "bg-emerald-100 text-emerald-700",
  Reported: "bg-amber-100 text-amber-700",
  "Removed by Admin": "bg-rose-100 text-rose-700",
};

// A handful of real, pre-existing reviews so the Tutor/Student/Admin
// surfaces aren't empty on first load — each tied to a real completed
// lesson already present in tutor-dashboard-data.ts/student-dashboard-data
// .ts, never an invented booking.
export const seedReviews: Review[] = [
  {
    id: "rev-seed-1",
    direction: "student-to-tutor",
    reviewerName: "James O.",
    reviewerImage: "/teacher-1.jpg.png",
    recipientName: "Adaeze Okonkwo",
    recipientImage: "/teacher-2.jpg.png",
    bookingId: "pl-5",
    bookingType: "Private",
    subject: "Physics",
    rating: 5,
    comment: "Adaeze explained electromagnetism so clearly that I finally understand Lenz's law. Patient and always checks I understand before moving on.",
    submittedAtMs: new Date(2026, 7, 21, 10, 0).getTime(),
    submittedAtLabel: "Aug 21, 2026",
    status: "Published",
  },
  {
    id: "rev-seed-2",
    direction: "student-to-tutor",
    reviewerName: "Mary U.",
    reviewerImage: "/teacher-2.jpg.png",
    recipientName: "Adaeze Okonkwo",
    recipientImage: "/teacher-2.jpg.png",
    bookingId: "pl-6",
    bookingType: "Private",
    subject: "Chemistry",
    rating: 4,
    comment: "Really good session on organic chemistry naming. Would have liked a few more practice questions at the end.",
    submittedAtMs: new Date(2026, 7, 19, 16, 30).getTime(),
    submittedAtLabel: "Aug 19, 2026",
    status: "Published",
  },
  {
    id: "rev-seed-3",
    direction: "tutor-to-student",
    reviewerName: "Adaeze Okonkwo",
    reviewerImage: "/teacher-2.jpg.png",
    recipientName: "James O.",
    recipientImage: "/teacher-1.jpg.png",
    bookingId: "pl-5",
    bookingType: "Private",
    subject: "Physics",
    rating: 5,
    comment: "James came prepared with questions and stayed engaged the whole session. A pleasure to teach.",
    submittedAtMs: new Date(2026, 7, 21, 10, 5).getTime(),
    submittedAtLabel: "Aug 21, 2026",
    status: "Published",
  },
];
