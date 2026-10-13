// The single content model behind every Help Center in the app — Public,
// Student and Tutor. One article can be scoped to a specific audience or to
// "All" (shown everywhere); one category taxonomy is shared across
// audiences. Admin manages this list (see help-articles-store.ts and
// admin-knowledge-base-client.tsx); every Help Center consumes it rather
// than keeping its own hardcoded article text, so editing an article once
// in Admin updates every place it's shown.
// "Admin" is internal-only documentation for platform staff (see
// admin-help-center-client.tsx) — never mixed into the Student/Tutor/Public
// audiences below, since it covers moderation/ops actions that would be
// meaningless (or inappropriate) to show a student or tutor.
export type HelpArticleAudience = "Student" | "Tutor" | "Public" | "All" | "Admin";
export type HelpArticleStatus = "Draft" | "Published" | "Archived";

// A starting taxonomy, not a closed one — admin can file an article under
// any category string (see the free-text combobox in
// admin-knowledge-base-editor). These are just the categories today's
// seed articles actually use.
export const HELP_ARTICLE_CATEGORIES = [
  "Getting Started",
  "Account",
  "Tutors",
  "Classes",
  "Payments",
  "Bookings",
  "Counselling",
  "Security",
  "Learning",
] as const;

// (string & {}) keeps autocomplete for the known categories above while
// still accepting any other string an admin types in — the taxonomy is
// meant to grow without a code change.
export type HelpArticleCategory = (typeof HELP_ARTICLE_CATEGORIES)[number] | (string & {});

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: HelpArticleCategory;
  audience: HelpArticleAudience;
  shortDescription: string;
  // Paragraphs, rendered in order — same shape as the existing public
  // /help knowledge base (help-center-data.ts) for consistency.
  content: string[];
  status: HelpArticleStatus;
  featured?: boolean;
  author: string;
  publishedAt: string | null;
  updatedAt: string;
}

const AUTHOR = "Ensena Team";

// Seed content for the articles already named in the Student, Tutor and
// Public Help Centers. Written from the product as it actually works today
// (Find Teachers, Discovery Sessions, escrow, Study Planner, verification,
// profile completion score, etc.) — nothing here describes a feature that
// isn't implemented.
export const SEED_HELP_ARTICLES: HelpArticle[] = [
  // ---------------------------------------------------------------------
  // Student
  // ---------------------------------------------------------------------
  {
    id: "help-finding-and-booking-the-right-tutor",
    slug: "finding-and-booking-the-right-tutor",
    title: "Finding and booking the right tutor",
    category: "Tutors",
    audience: "Student",
    shortDescription: "Search, compare and book a tutor that fits your subject, level and budget.",
    content: [
      "Go to Find a Tutor and filter by subject, academic level, price and availability to narrow the list down to tutors who teach what you need.",
      "Open a tutor's profile to see their qualifications, experience, languages, teaching approach, rating and reviews, along with their private lesson price and upcoming availability.",
      "If you're not sure a tutor is the right fit yet, book a free Discovery Session first. It's a short introductory meeting, not a full lesson, so you can discuss your goals before committing to paid lessons. You get one free Discovery Session per tutor.",
      "When you're ready to book, choose Book Instantly to confirm a lesson right away at the tutor's listed price and schedule, or Request Pre-approval to describe the arrangement you want (subject, frequency, preferred days) and have the tutor confirm it before you pay.",
      "Once a booking is confirmed, it appears under My Classes, where you can message your tutor, view the lesson on your calendar, or reschedule if you need to.",
    ],
    status: "Published",
    featured: true,
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-how-lessons-and-escrow-payments-work",
    slug: "how-lessons-and-escrow-payments-work",
    title: "How lessons and escrow payments work",
    category: "Payments",
    audience: "Student",
    shortDescription: "What happens to your payment between booking a lesson and it being marked complete.",
    content: [
      "Before you pay, Ensena shows you a booking summary with the tutor or class, the lesson schedule, the price and any discount from a Special Offer, and the total amount. Nothing is charged until you confirm.",
      "Once you pay, your money is held securely in escrow rather than paid to the tutor immediately. It's only released to the tutor after the lesson is marked complete, which protects you if a lesson doesn't happen as booked.",
      "You can pay by card, bank transfer, or Paystack/Flutterwave, and you can also top up your in-app wallet from Wallet → Top Up to pay for lessons without re-entering payment details each time.",
      "If you need to cancel, go to My Classes → Manage → Cancel Booking. Ensena shows whether you'll get a full refund, a partial refund, or no refund before you confirm, based on how much notice you've given. Cancelling more than 24 hours ahead qualifies for a full refund.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-getting-the-most-out-of-group-classes",
    slug: "getting-the-most-out-of-group-classes",
    title: "Getting the most out of group classes",
    category: "Classes",
    audience: "Student",
    shortDescription: "How to join a group class, keep your seat, and get value from learning alongside others.",
    content: [
      "Browse Group Classes to see upcoming classes with their subject, tutor, schedule and price. Open a listing to check the class description and how many seats are still available before you enrol.",
      "Select Join Class and complete payment to secure your seat. A place is only confirmed once the payment succeeds, and the class then appears under My Classes → Group Classes.",
      "When the class is ready to begin, select Join Classroom from your lesson card to enter the Ensena Virtual Classroom for that session.",
      "Because you're learning alongside other students at a similar level, come prepared with any questions from the topic in advance, and use the classroom's messaging to follow along if you need something repeated.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-setting-up-your-study-planner",
    slug: "setting-up-your-study-planner",
    title: "Setting up your study planner",
    category: "Learning",
    audience: "Student",
    shortDescription: "Organize your study tasks by subject and day from your dashboard.",
    content: [
      "Study Planner, in your Student Dashboard sidebar, is a simple task list for organizing what you need to study outside of lessons.",
      "Add a task, assign it to a subject and a day, and it appears on your planner for that date. Tick a task off once you've done it, or remove it if it's no longer needed.",
      "Study Planner is separate from your booked lessons: it's for your own revision and practice, and doesn't affect your bookings or your tutor's schedule.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-understanding-your-progress-reports",
    slug: "understanding-your-progress-reports",
    title: "Understanding your progress reports",
    category: "Learning",
    audience: "Student",
    shortDescription: "What the progress shown on your dashboard is based on.",
    content: [
      "Your Student Dashboard home shows a weekly progress percentage for each subject you're taking lessons in. This reflects your activity for that subject over the current week, such as lessons attended and study tasks completed.",
      "Progress is tracked per subject rather than as a single overall score, so you can see where you're keeping up and where you might want to book more lessons or add study time.",
      "If a subject shows no progress yet, it usually means you haven't had a lesson or logged a task for it this week rather than there being an issue with your account.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },

  // ---------------------------------------------------------------------
  // Tutor
  // ---------------------------------------------------------------------
  {
    id: "help-getting-started-as-a-new-tutor",
    slug: "getting-started-as-a-new-tutor",
    title: "Getting started as a new tutor",
    category: "Getting Started",
    audience: "Tutor",
    shortDescription: "From signing up to taking your first booking.",
    content: [
      "Sign up as a tutor and complete the application: your photo and profile, the subjects and academic levels you teach, your teaching format, and your pricing. You must be at least 18 to teach on Ensena.",
      "Upload your verification documents on the Verification page: a government-issued ID, your academic certificate and any teaching qualification. Our team reviews every application, and you can follow its progress on Application Status.",
      "While you wait, finish every section of Profile → Public Profile and use Preview Profile to see exactly what students will see.",
      "Once you're approved, set your weekly hours in Profile → Availability. Students can then find you in Find Teachers and book any free slot in those hours.",
    ],
    status: "Published",
    featured: true,
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-completing-tutor-verification",
    slug: "completing-tutor-verification",
    title: "Completing tutor verification",
    category: "Account",
    audience: "Tutor",
    shortDescription: "What to upload and what each status means.",
    content: [
      "Open the Verification page and upload a government-issued ID, your academic certificate, and any teaching qualification you have. PDF, JPG, PNG, WEBP, GIF and Word files are accepted.",
      "Your application shows as Pending while it's being reviewed. It then becomes Approved, Rejected, or Resubmission Required if a specific document needs replacing.",
      "If something is sent back, Application Status tells you why. Upload a corrected document and it goes back into review. The most common problem is a blurry or cropped photo of an ID, so make sure all four corners and every detail are readable.",
      "If you're stuck, submit a ticket under Tutor Verification and our team will look at your documents with you.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-setting-your-availability-and-time-off",
    slug: "setting-your-availability-and-time-off",
    title: "Setting your availability and time off",
    category: "Bookings",
    audience: "Tutor",
    shortDescription: "Weekly hours, blocked time and Vacation Mode.",
    content: [
      "Go to Profile → Availability and choose the hours you want to teach on each day of the week. All times are in Nigeria time (WAT).",
      "Students can book any free 30-minute slot inside those hours, at least 2 hours ahead and up to 90 days in advance. Times already taken by your lessons, group classes or discovery sessions are hidden automatically.",
      "Use Block Time to close particular dates or hours, for example an exam you're invigilating or a family event.",
      "Going away? Turn on Vacation Mode. Students can't book anything new while it's on, and lessons you already have stay booked. Turn it off when you're back.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-managing-your-lessons",
    slug: "managing-your-lessons",
    title: "Managing your lessons: cancel, reschedule and complete",
    category: "Bookings",
    audience: "Tutor",
    shortDescription: "Everything you can do with a booked lesson, and what students are told.",
    content: [
      "Every paid lesson appears in Classes → Private Classes and on your Schedule. Students pay when they book, so there's nothing to accept. An unpaid booking only holds the slot for 30 minutes.",
      "To move a lesson, open it and choose Reschedule. You can do this up to 2 hours before it starts, to any time in the next 90 days that doesn't clash with your other classes or the student's. The student is notified straight away.",
      "If you can't teach at all, choose Cancel and give a reason, which is shared with the student. A lesson you cancel is always fully refunded to the student, so reschedule instead whenever you can.",
      "You can enter the classroom up to 24 hours before a lesson to prepare, and the student can join from 30 minutes before. Ending the class from the classroom marks it complete. If a lesson ended without that, filter Private Classes by Needs completing and choose Mark complete.",
    ],
    status: "Published",
    featured: true,
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-cancellation-and-refund-policy-for-tutors",
    slug: "cancellation-and-refund-policy-for-tutors",
    title: "Cancellation and refund policy",
    category: "Payments",
    audience: "Tutor",
    shortDescription: "What happens to the payment when a lesson is cancelled or missed.",
    content: [
      "If you cancel a lesson, or don't show up, the student gets a full refund.",
      "If the student cancels 24 hours or more before the lesson, they get a full refund. Between 2 and 24 hours before, they get 50% back, and the other 50% is paid to you as normal (minus Ensena's commission).",
      "If the student cancels less than 2 hours before the lesson, or doesn't show up, there's no refund and you're paid in full.",
      "Lessons can't be moved within 2 hours of the start time by either side, so last-minute changes always count as a cancellation.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-understanding-the-escrow-payment-system",
    slug: "understanding-the-escrow-payment-system",
    title: "Understanding the escrow payment system",
    category: "Payments",
    audience: "Tutor",
    shortDescription: "How and when you get paid for completed lessons.",
    content: [
      "When a student books, their payment is held securely by Ensena (escrow) instead of going to you straight away. This protects both of you.",
      "When the lesson is complete, the student has 24 hours to confirm it went well or report a problem. The money is released to your available balance as soon as they confirm, or automatically after 24 hours if nothing is reported.",
      "If the student reports a problem, that lesson's payment stays on hold while our team reviews what happened. You'll be told the outcome.",
      "Ensena keeps a 20% commission and you earn the other 80% of the price. You can follow every lesson's payment on the Escrow page, and withdraw released earnings from Withdrawals to the bank account you add there.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-setting-competitive-pricing-for-your-lessons",
    slug: "setting-competitive-pricing-for-your-lessons",
    title: "Setting competitive pricing for your lessons",
    category: "Payments",
    audience: "Tutor",
    shortDescription: "How to choose a price that wins bookings.",
    content: [
      "Set your lesson prices in Profile → Public Profile.",
      "Look up tutors who teach the same subject and level in Find Teachers to see where your price sits. Remember that Ensena keeps 20%, so you earn 80% of the price you set.",
      "New tutors often start a little lower to collect their first reviews, then raise prices as reviews and completed lessons build up. A price change only applies to new bookings.",
      "Offering a free Discovery Session lets students meet you before paying, which is often what turns a profile view into a first booking.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-best-practices-for-group-classes",
    slug: "best-practices-for-group-classes",
    title: "Creating and running group classes",
    category: "Classes",
    audience: "Tutor",
    shortDescription: "Setting up a group class, publishing it and running each session.",
    content: [
      "Go to Classes → Group Classes → Create Group Class. Add a title, subject, level and a clear description of what the class covers and who it's for.",
      "Choose the days, start time, session length, number of weeks, seats and price per student. Every session is created for you and checked against your other classes, so nothing double-books.",
      "Approved tutors can publish a class straight away. Otherwise it's saved as a draft until your account is approved. You can edit the details, unpublish, cancel a single session or cancel the whole class from the class page. Enrolled students are notified and refunded for any sessions they won't get.",
      "On the day, open the session from your Schedule and enter the classroom. The class page shows your roster, and you can mark a session complete once it has started.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-running-a-great-discovery-session",
    slug: "running-a-great-discovery-session",
    title: "Running a great Discovery Session",
    category: "Classes",
    audience: "Tutor",
    shortDescription: "Turning a free first call into a regular student.",
    content: [
      "A Discovery Session is a free introductory call of up to 25 minutes. Each student can have one with each tutor, so it's often their first impression of you.",
      "Your upcoming and past sessions are under Classes → Discovery Sessions, and you can enter the classroom from there.",
      "Use the time to understand the student's goals, level and exam dates, give them a taste of how you teach, and suggest a realistic plan. Keep to the time limit.",
      "End the session from the classroom, or choose Mark complete afterwards, so it moves into your history.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-working-with-your-students",
    slug: "working-with-your-students",
    title: "Working with your students",
    category: "Classes",
    audience: "Tutor",
    shortDescription: "Your student list, Needs Attention and progress.",
    content: [
      "Students lists everyone you teach, whether in private lessons, group classes or discovery sessions. You can search, filter, sort and export the list.",
      "Needs Attention highlights students to follow up with: unpaid bookings, reported lessons, students you haven't taught in 30 days or more, frequent cancellations and overdue homework.",
      "Open a student to see their upcoming and past lessons with you, their homework, and a Performance page with attendance, hours taught and progress by subject.",
      "Use Message to talk to a student. A conversation opens automatically for anyone you teach.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-messaging-and-safety-rules",
    slug: "messaging-and-safety-rules",
    title: "Messaging and safety rules",
    category: "Security",
    audience: "Tutor",
    shortDescription: "Who you can message, and what can't be shared.",
    content: [
      "You can message students who have booked with you (private lessons, group classes or discovery sessions), and anyone who messages you first. You can turn off messages from new students in Settings → Privacy.",
      "For everyone's safety, every message is checked. Phone numbers, email addresses, social media handles, meeting links and payment details can't be shared, and lessons must be booked and paid through Ensena.",
      "Repeated attempts to move a student off the platform lead to a messaging restriction or suspension. If you think a restriction was a mistake, choose Contact Internal Support on the notice to appeal it.",
      "If a student makes you uncomfortable or asks you to break these rules, submit a ticket under Bookings & Students so our team can step in.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-how-to-boost-your-profile-completion-score",
    slug: "how-to-boost-your-profile-completion-score",
    title: "How to boost your profile completion score",
    category: "Account",
    audience: "Tutor",
    shortDescription: "What counts toward your score, and why it matters.",
    content: [
      "Your profile completion score, shown on Application Status, is based on how much of Profile → Public Profile you've filled in: your photo, headline, bio, subjects, academic levels, languages, experience and pricing.",
      "A score of 90% or higher marks your profile as complete. Leaving any of those sections empty keeps your score below that.",
      "A complete profile gives students more to go on when comparing tutors, so revisit it whenever you add a new subject or academic level.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-keeping-your-tutor-account-secure",
    slug: "keeping-your-tutor-account-secure",
    title: "Keeping your account secure",
    category: "Security",
    audience: "Tutor",
    shortDescription: "Passwords, two-step verification and sign-in alerts.",
    content: [
      "Change your password in Settings → Security. Use one you don't use anywhere else.",
      "Turn on two-step verification in Settings → Security by connecting an authenticator app. After that, every sign-in asks for a 6-digit code from the app, even if someone knows your password.",
      "You can update your name and phone number in Settings → Account. To change the email you sign in with, contact Ensena Support so we can confirm it's really you.",
      "Ensena will never ask for your password or a sign-in code by email, phone or message.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-fixing-classroom-and-technical-problems",
    slug: "fixing-classroom-and-technical-problems",
    title: "Fixing classroom and technical problems",
    category: "Getting Started",
    audience: "Tutor",
    shortDescription: "Quick checks for video, audio and loading problems, and how to reach us.",
    content: [
      "Use an up-to-date version of Chrome, Edge, Safari or Firefox, and allow camera and microphone access when the browser asks. If you blocked it, use the camera icon in the address bar to allow it again.",
      "Close other apps that might be using your camera (such as video-calling apps), and try a wired or stronger connection if video freezes. Reloading the classroom page usually reconnects you.",
      "If something still isn't working, use Report an Issue in the Help Center and include what you were doing and a screenshot. You can also email support@ensena.co.",
      "If a technical problem stopped a lesson from going ahead, mention the booking reference in your report so our team can look at that lesson's payment too.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "help-getting-help-from-ensena-support",
    slug: "getting-help-from-ensena-support",
    title: "Getting help from Ensena Support",
    category: "Getting Started",
    audience: "Tutor",
    shortDescription: "Tickets, issue reports and email: how to reach us and follow up.",
    content: [
      "Submit a Ticket in the Help Center and choose the topic, such as Bookings & Students or Payouts, then describe what's going on. Attach screenshots or files if they help (up to 5 files, 5MB each).",
      "Use Report an Issue when something on Ensena isn't working. Reports go straight to our team with a higher priority.",
      "Your Support Requests lists everything you've sent. Open a request to read replies from our team and reply back. You'll also be notified when we reply or resolve it. If a resolved problem comes back, reply on the same request to reopen it.",
      "Prefer email? Write to support@ensena.co and quote your request reference (it starts with SUP) if you have one.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },

  // ---------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------
  {
    id: "help-getting-started-with-ensena",
    slug: "getting-started-with-ensena",
    title: "Getting started with Ensena",
    category: "Getting Started",
    audience: "Public",
    shortDescription: "What Ensena is and how to get started as a student or tutor.",
    content: [
      "Ensena is an academic support platform that makes it easy for students across Nigeria to get quality help with school subjects, WAEC, JAMB and more — through one-on-one tutoring with verified tutors, group classes, and academic guidance.",
      "You can browse Find Teachers and Group Classes without an account to get a feel for what's available. To book a lesson, message a tutor, or apply to teach, you'll need to sign up.",
      "Select Sign Up and choose Student or Tutor. As a student, you can start browsing and booking straight away. As a tutor, you'll complete a profile and go through verification before your profile is visible to students.",
      "If you're not sure where to start, a free Discovery Session lets you meet a tutor before committing to paid lessons.",
    ],
    status: "Published",
    featured: true,
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-how-to-find-and-book-the-right-tutor-public",
    slug: "how-to-find-and-book-the-right-tutor",
    title: "How to find and book the right tutor",
    category: "Tutors",
    audience: "Public",
    shortDescription: "Searching for a tutor before you sign up.",
    content: [
      "Go to Find Teachers to search tutors by subject, academic level, price and availability. You can look through profiles, ratings and reviews without creating an account.",
      "Each tutor's profile shows their qualifications, experience, languages, teaching approach and pricing, so you can compare a few before deciding.",
      "When you're ready to book, you'll need a free student account. From there you can book a lesson directly, or start with a free Discovery Session to meet the tutor first.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-becoming-a-verified-tutor",
    slug: "becoming-a-verified-tutor",
    title: "Becoming a verified tutor",
    category: "Tutors",
    audience: "Public",
    shortDescription: "What it takes to teach on Ensena.",
    content: [
      "Go to Become a Tutor and complete the application: your profile, the subjects and academic levels you teach, your teaching format, and pricing.",
      "You'll also need to submit verification documents, including a government ID and any relevant certifications. Our team reviews every application before a tutor profile becomes visible to students.",
      "Verification exists to keep the platform trustworthy for students and their families, so incomplete or unclear documents will be sent back for resubmission rather than rejected outright wherever possible.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-how-escrow-payments-protect-you",
    slug: "how-escrow-payments-protect-you",
    title: "How escrow payments protect you",
    category: "Payments",
    audience: "Public",
    shortDescription: "Why payments aren't released to a tutor immediately.",
    content: [
      "When a student pays for a lesson on Ensena, that payment is held securely in escrow rather than paid to the tutor right away.",
      "It's only released to the tutor once the lesson is confirmed complete. This protects students from paying for a lesson that doesn't happen, and gives tutors confidence that payment is already secured before they teach.",
      "If something goes wrong with a booking, Ensena Support can review the lesson and the escrow status to help resolve it.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-account-security-and-password-tips",
    slug: "account-security-and-password-tips",
    title: "Account security and password tips",
    category: "Security",
    audience: "Public",
    shortDescription: "Keeping your Ensena account secure.",
    content: [
      "Use a password you don't reuse on other sites, and avoid sharing your login details with anyone, including someone claiming to be from Ensena support.",
      "If you can't sign in, use Forgot Password on the sign-in page to reset it by email. If your account was created through a school or organization, use the same email it was originally set up with.",
      "Keep all bookings, payments and messages inside Ensena rather than moving them to another app. This is what keeps your payment protected under escrow and lets our team step in if something goes wrong.",
      "If you notice any activity on your account you don't recognize, contact Ensena Support right away.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },

  // ---------------------------------------------------------------------
  // Admin (internal — platform staff only, see admin-help-center-client.tsx)
  // ---------------------------------------------------------------------
  {
    id: "help-reviewing-tutor-verification-documents",
    slug: "reviewing-tutor-verification-documents",
    title: "Reviewing tutor verification documents",
    category: "Tutors",
    audience: "Admin",
    shortDescription: "How to review, approve, reject or request resubmission on a tutor application.",
    content: [
      "Go to Tutor Verification to see every application awaiting review, filterable by status.",
      "Open an application to review the submitted government ID and any certifications alongside the rest of their profile.",
      "From there you can approve the application (making the profile visible in student search), reject it, or request resubmission if a specific document needs to be replaced, for example a blurry ID photo.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-handling-a-payment-dispute-end-to-end",
    slug: "handling-a-payment-dispute-end-to-end",
    title: "Handling a payment dispute end-to-end",
    category: "Payments",
    audience: "Admin",
    shortDescription: "Reviewing evidence and resolving a dispute from Disputes.",
    content: [
      "Go to Disputes and open the case in question. Each case shows the booking it relates to, who raised it, and the activity log leading up to it.",
      "Review the evidence available, including messages, the lesson's escrow status, and any attachments, before deciding.",
      "Resolve the case with a full release to the tutor, a full refund to the student, or a partial refund, depending on what the evidence supports. The decision and reasoning are recorded on the case.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-setting-up-a-new-platform-staff-account-and-permissions",
    slug: "setting-up-a-new-platform-staff-account-and-permissions",
    title: "Setting up a new platform-staff account and permissions",
    category: "Account",
    audience: "Admin",
    shortDescription: "Inviting a teammate and controlling what they can access.",
    content: [
      "Go to Settings → Platform Users and invite a new team member by email, assigning them a role such as Customer Support, Finance, or Content Manager.",
      "Each role comes with a default set of sections and permissions. If a role's defaults don't quite fit, choose Custom to hand-pick exactly which sections and actions that person can access.",
      "You can revisit anyone's access later from their platform-user profile. Adjusting their role or their individual permission overrides doesn't require re-inviting them.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-how-escrow-release-and-refunds-work",
    slug: "how-escrow-release-and-refunds-work",
    title: "How escrow release and refunds work",
    category: "Payments",
    audience: "Admin",
    shortDescription: "What happens behind the scenes when a lesson completes, is disputed, or is cancelled.",
    content: [
      "A student's payment is held in escrow from the moment a booking is confirmed. It releases automatically to the tutor's available balance once the lesson is marked complete.",
      "If a dispute is opened before release, the escrow is frozen until the case is resolved from Disputes. Release, refund and partial refund are all available resolutions.",
      "A cancellation before the lesson happens follows the cancellation policy: a full refund with enough notice, and a partial or no refund for a late cancellation, calculated automatically at the time of cancellation.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "help-understanding-the-support-vs-disputes-vs-reports-split",
    slug: "understanding-the-support-vs-disputes-vs-reports-split",
    title: "Understanding the Support vs Disputes vs Reports split",
    category: "Getting Started",
    audience: "Admin",
    shortDescription: "Three separate systems that are easy to confuse, and what each one is actually for.",
    content: [
      "Support is general self-service and ticket handling: a student or tutor asking a question or needing help with something that isn't necessarily anyone's fault.",
      "Disputes are specifically about a booking's payment: a disagreement over whether a lesson happened as expected, resolved by releasing, refunding, or partially refunding escrow.",
      "Reports & Issues cover a person, a class, a message, or content that needs moderation review. These are potential policy violations rather than a payment disagreement or a how-do-I question.",
      "Keeping these separate means a payment disagreement always has clear financial resolution options, while a conduct concern goes through moderation review instead of being treated as a refund request.",
    ],
    status: "Published",
    author: AUTHOR,
    publishedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
];
