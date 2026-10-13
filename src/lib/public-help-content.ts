// Public/unauthenticated Help Center content — same FaqItem shape as the
// tutor/student/admin Help Centers, rendered through the shared
// HelpCenterClient. Shown before Ensena knows whether the visitor is a
// student or a tutor (landing page, sign-in, sign-up, forgot password).
import type { FaqItem } from "@/lib/tutor-dashboard-data";

export const publicFaqItems: FaqItem[] = [
  { question: "How do I create an Ensena account?", answer: "Go to Sign Up and choose Student or Tutor. It only takes a couple of minutes.", tags: ["public"] },
  { question: "I can't sign in. What should I do?", answer: "Double-check your email and password, or use Forgot Password to reset it. If your account is with a school or organization, use the email that account was created with.", tags: ["account"] },
  { question: "How do I reset my password?", answer: "Go to Sign In and select Forgot Password. We'll send a reset link to your email.", tags: ["account"] },
  { question: "How do I find a tutor?", answer: "Browse Find Teachers to search by subject, academic level, price and availability, or start a Discovery Session to meet a tutor first.", tags: ["public"] },
  { question: "How do I become a tutor on Ensena?", answer: "Go to Become a Tutor and complete the application: your profile, subjects, verification documents and pricing.", tags: ["tutor-signup"] },
  { question: "How does payment work?", answer: "Payments are held securely in escrow and only released to the tutor after your lesson is completed.", tags: ["payment"] },
  { question: "What is a Discovery Session?", answer: "A short introductory session so you can meet a tutor before committing to regular lessons.", tags: ["booking"] },
  { question: "Is my personal information safe?", answer: "Yes. See our Privacy Policy for details on how your data is handled and protected." },
  { question: "The site isn't loading properly. What can I do?", answer: "Try refreshing the page or clearing your browser cache. If the problem continues, let us know using Submit a Ticket below.", tags: ["technical"] },
];

// Article content itself now lives in help-articles-data.ts (audience:
// "Public") so Admin can manage it — see PublicHelpCenterClient, which
// reads it through usePublishedHelpArticles("Public") instead of a
// hardcoded list.
