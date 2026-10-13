// Structural placeholder copy for Ensena's legal documents. This describes
// how the platform actually works today (bookings, commission, escrow, etc.)
// so the sections are accurate, but the wording itself has NOT been reviewed
// by a qualified legal professional and should not be treated as final,
// binding legal language until it is.
import type { LegalSection } from "@/components/public-pages/legal-page-layout";

export const LEGAL_LAST_UPDATED = "27 July 2026";

export const refundPolicySections: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    content:
      "This policy explains how cancellations and refunds work for bookings made through Ensena: private lessons, Discovery Sessions and Group Classes. It works alongside the Cancellations, Refunds and Pre-approvals sections of the Terms of Service.",
  },
  {
    id: "cancelling-a-private-lesson",
    title: "Cancelling a Private Lesson",
    content:
      "You can cancel or reschedule an upcoming private lesson from Manage on the lesson card in My Classes. The booking shows whether a full refund, partial refund or no refund applies before you confirm. This depends on how much notice you give before the scheduled lesson time.",
  },
  {
    id: "cancelling-a-discovery-session",
    title: "Cancelling a Discovery Session",
    content:
      "Discovery Sessions are free, so there's nothing to refund if one is cancelled. Cancelling a Discovery Session does not use up your one free session with that tutor unless you've actually attended it.",
  },
  {
    id: "cancelling-a-group-class-enrolment",
    title: "Cancelling a Group Class Enrolment",
    content:
      "You can cancel your enrolment in a Group Class from Manage on the class card. Refund eligibility depends on how close to the next session the cancellation is made, consistent with the terms shown at enrolment.",
  },
  {
    id: "tutor-initiated-cancellations",
    title: "Tutor-Initiated Cancellations",
    content:
      "If a tutor cancels a confirmed lesson or Group Class session, the student is notified and offered rescheduling, a credit, or a refund, depending on the circumstances. Students should not be left paying for a session that didn't take place.",
  },
  {
    id: "no-shows",
    title: "No-Shows",
    content:
      "A no-show is when a user misses a confirmed lesson without cancelling in advance. Refund treatment differs depending on whether the student or the tutor was the one who didn't attend, and repeated no-shows may affect a user's standing on the platform.",
  },
  {
    id: "technical-problems",
    title: "Technical Problems",
    content:
      "If a lesson can't reasonably proceed because of a significant technical problem with the Ensena platform itself, affected users may be offered rescheduling, a credit or a refund. Report technical problems as soon as possible through Contact Support.",
  },
  {
    id: "refund-method-and-timing",
    title: "Refund Method and Timing",
    content:
      "Approved refunds are returned to the original payment method (or wallet balance, where used) through Ensena's payment provider. Processing times depend on the provider and are outside Ensena's direct control.",
  },
  {
    id: "non-refundable-circumstances",
    title: "Non-Refundable Circumstances",
    content:
      "Late cancellations, no-shows by the person requesting the refund, and completed lessons are generally not eligible for a refund, except where required by applicable consumer law.",
  },
  {
    id: "disputing-a-refund-decision",
    title: "Disputing a Refund Decision",
    content:
      "If you disagree with a refund decision, contact Ensena Support with your booking reference. A member of the team will review the booking and respond.",
  },
  {
    id: "changes-to-this-policy",
    title: "Changes to This Policy",
    content:
      "Ensena may update this policy from time to time. Material changes will be reflected by an updated \"Last updated\" date on this page.",
  },
  {
    id: "contact",
    title: "Contact",
    content: "Questions about a specific booking or refund can be sent through the Ensena Contact page.",
  },
];


export const privacySections: LegalSection[] = [
  {
    id: "information-you-provide",
    title: "Information You Provide",
    content:
      "This includes information you provide directly, such as your name, email address, and any details you enter into your profile, a booking, or a message.",
  },
  {
    id: "account-information",
    title: "Account Information",
    content:
      "When you create an account, Ensena stores information such as your name, email, phone number and role (student, tutor or admin).",
  },
  {
    id: "tutor-profile-information",
    title: "Tutor Profile Information",
    content:
      "Tutors provide additional information such as subjects taught, hourly rate, availability, qualifications and verification documents.",
  },
  {
    id: "student-information",
    title: "Student Information",
    content:
      "Students (or guardians on their behalf) may provide academic level, learning goals, and preferences used to match them with a suitable tutor.",
  },
  {
    id: "booking-information",
    title: "Booking Information",
    content:
      "Ensena stores information about bookings, including the subject, schedule, duration, price, and status of lessons, Discovery Sessions and group classes.",
  },
  {
    id: "messages",
    title: "Messages",
    content:
      "Messages sent between students and tutors through Ensena are stored to support the booking relationship and for safety/moderation purposes.",
  },
  {
    id: "payments",
    title: "Payments",
    content:
      "Payment processing is handled by Ensena's supported payment providers. Ensena stores payment status and references needed for escrow, refunds and accounting, but does not store full card details.",
  },
  {
    id: "discovery-sessions",
    title: "Discovery Sessions",
    content:
      "Information about free Discovery Sessions (such as whether a student has already used their free session with a given tutor) is stored to enforce Ensena's anti-abuse limits.",
  },
  {
    id: "virtual-classroom-data",
    title: "Virtual Classroom Data",
    content:
      "Where lessons take place in Ensena's virtual classroom, session metadata (such as timing and attendance) may be stored to support the booking record.",
  },
  {
    id: "technical-information",
    title: "Technical / Device Information",
    content:
      "Ensena may collect standard technical information such as browser type, device information and usage data to operate and improve the platform.",
  },
  {
    id: "how-information-is-used",
    title: "How Information Is Used",
    content:
      "Information is used to operate the platform: matching students with the academic support they need, processing bookings and payments, enabling communication, providing support, and keeping the platform safe.",
  },
  {
    id: "service-providers",
    title: "Service Providers",
    content:
      "Ensena works with service providers (such as payment processors and hosting/infrastructure providers) who process information on Ensena's behalf, solely to provide the platform's services.",
  },
  {
    id: "data-retention",
    title: "Data Retention",
    content:
      "Information is retained for as long as needed to provide the service and meet legal, accounting and dispute-resolution obligations.",
  },
  {
    id: "security",
    title: "Security",
    content:
      "Ensena takes reasonable measures to protect user information. No online service can guarantee absolute security, and Ensena does not claim any specific security certification unless actually obtained.",
  },
  {
    id: "your-rights",
    title: "Your Rights",
    content:
      "Depending on your location, you may have rights to access, correct or delete your personal information. Requests can be made through the Ensena Contact page.",
  },
  {
    id: "children-minors",
    title: "Children / Minors",
    content:
      "Where a student is a minor, an account is expected to be created and managed by a parent or guardian, who is responsible for the information provided on the minor's behalf.",
  },
  {
    id: "cookies",
    title: "Cookies",
    content:
      "Ensena uses cookies as described in the Cookie Policy.",
  },
  {
    id: "changes-to-policy",
    title: "Changes to This Policy",
    content:
      "Ensena may update this Privacy Policy from time to time. Material changes will be reflected by an updated \"Last updated\" date on this page.",
  },
  {
    id: "contact",
    title: "Contact",
    content:
      "Questions about this policy can be sent through the Ensena Contact page.",
  },
];
