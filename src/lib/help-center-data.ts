import {
  Calendar,
  CreditCard,
  GraduationCap,
  MessageCircleQuestion,
  Rocket,
  Search,
  ShieldCheck,
  UserCog,
  Video,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  content: string[];
}

export interface HelpCategory {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  articles: HelpArticle[];
}

export const helpCategories: HelpCategory[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "New to Ensena? Learn the basics and get started.",
    icon: Rocket,
    articles: [
      {
        slug: "what-is-ensena",
        title: "What is Ensena?",
        summary: "An overview of what you can do on the platform.",
        content: [
          "Ensena is an academic support platform that helps students access the academic support they need — including tutors — across subjects and academic levels.",
          "Students can find tutors, book a free Discovery Session, book private tutoring, join Group Classes, send Pre-approval requests, receive Special Offers, attend lessons in the Virtual Classroom, message tutors, and speak to an Ensena counsellor for guidance.",
        ],
      },
      {
        slug: "how-ensena-works",
        title: "How Ensena works",
        summary: "The basic path from finding a tutor to learning with them.",
        content: [
          "Find a tutor, review their profile, meet them through a free Discovery Session or book directly, schedule your lessons, pay securely, then attend your lessons and continue learning.",
          "Students who aren't sure where to begin can use Speak to a Counsellor for additional guidance.",
        ],
      },
    ],
  },
  {
    slug: "finding-a-tutor",
    title: "Finding a Tutor",
    description: "How to find the right tutor for your subjects and goals.",
    icon: Search,
    articles: [
      {
        slug: "search-and-filter-tutors",
        title: "How do I find a tutor?",
        summary: "Search and filter tutors by subject, level and price.",
        content: [
          "Go to Find Teachers from the main navigation, then narrow your search by subject, academic level, price, availability and learning format.",
          "Select a tutor to open their full profile and see their ratings and experience.",
        ],
      },
      {
        slug: "what-a-tutor-profile-shows",
        title: "What information can I see on a tutor's profile?",
        summary: "Understanding a tutor's profile before you book.",
        content: [
          "A profile can show a tutor's name, photo, subjects, academic levels, qualifications, experience, languages, teaching approach and location or online availability.",
          "It also shows private lesson price, lesson duration, Discovery Session availability, upcoming times, Group Classes, ratings and reviews, along with actions like Book Free Discovery, Book Instantly, Request Pre-approval, Message Tutor and View Calendar.",
        ],
      },
    ],
  },
  {
    slug: "discovery-sessions",
    title: "Discovery Sessions",
    description: "Everything about free Discovery Sessions.",
    icon: Calendar,
    articles: [
      {
        slug: "how-discovery-sessions-work",
        title: "What is a Discovery Session?",
        summary: "A free introductory meeting before paid lessons.",
        content: [
          "A Discovery Session is a free introductory meeting between a student and tutor before the student commits to paid lessons. It's not a full lesson: it's a chance to discuss learning goals, academic level, schedule and teaching approach, and see whether the tutor is a good fit.",
          "Discovery Sessions are free and last around 25 minutes. Each student gets one free Discovery Session per tutor.",
        ],
      },
      {
        slug: "booking-a-discovery-session",
        title: "How do I book a Discovery Session?",
        summary: "Book and join your session.",
        content: [
          "Open the tutor's profile and select Book Free Discovery, then choose one of the tutor's available times to confirm the booking. It will appear under My Classes → Discovery Sessions.",
          "When the session becomes available, select Join Classroom to enter the Ensena Virtual Classroom.",
        ],
      },
      {
        slug: "after-a-discovery-session",
        title: "What happens after my Discovery Session?",
        summary: "Your options once the session ends.",
        content: [
          "After the session, you can continue with the tutor toward paid lessons, send a Pre-approval request describing your preferred arrangement, keep messaging the tutor, or find another tutor. There's no obligation to continue.",
        ],
      },
    ],
  },
  {
    slug: "booking-lessons",
    title: "Booking Lessons",
    description: "Book private lessons, manage your schedule and reschedule.",
    icon: Calendar,
    articles: [
      {
        slug: "book-instantly-vs-pre-approval",
        title: "Book Instantly vs. Request Pre-approval",
        summary: "Two ways to book a private lesson.",
        content: [
          "Book Instantly lets you book right away at the tutor's listed price and availability by choosing your schedule, frequency and lesson duration.",
          "Request Pre-approval lets you describe the tutoring arrangement you want and send it to the tutor to confirm before you pay, useful for recurring lessons.",
        ],
      },
      {
        slug: "how-pre-approval-works",
        title: "How does Pre-approval work?",
        summary: "Send a request and get a response from the tutor.",
        content: [
          "From a tutor's profile, select Request Pre-approval and provide the subject, frequency, preferred days and times, start date and a message. For a Daily request you can select one day; for Weekly or Monthly, you choose how many days per week and select exactly that many days.",
          "The tutor receives your request in their Inbox and can accept it, decline it, or send a Special Offer with different pricing or terms. You don't request a discount through a separate button. If you want to ask about pricing, just mention it in your message.",
        ],
      },
      {
        slug: "managing-a-booking",
        title: "How do I manage or reschedule a booking?",
        summary: "Use Manage on any lesson card.",
        content: [
          "Open the lesson in My Classes and select Manage. Depending on the booking's status, you may see options to view it on your calendar, reschedule it, cancel it, or get help. Only the actions that actually apply to that booking are shown.",
        ],
      },
      {
        slug: "how-special-offers-work",
        title: "How do Special Offers work?",
        summary: "Understand offers from tutors and how to accept them.",
        content: [
          "A Special Offer is a discounted price a tutor chooses to send you for private lessons. You can't request one through a dedicated discount button, but you can mention pricing questions in a message.",
          "When a tutor sends a Special Offer, you'll see the price and terms before deciding whether to accept or decline it. Nothing is charged just because a tutor sends an offer.",
        ],
      },
    ],
  },
  {
    slug: "group-classes",
    title: "Group Classes",
    description: "Join group classes and learn with other students.",
    icon: GraduationCap,
    articles: [
      {
        slug: "joining-a-group-class",
        title: "How do I join a Group Class?",
        summary: "Group class enrolment and seats.",
        content: [
          "Open a Group Class listing to review its schedule, price and available seats, then select Join Class and complete payment. A place is confirmed once the booking succeeds. After that, the class appears under My Classes → Group Classes.",
        ],
      },
      {
        slug: "attending-a-group-class",
        title: "How do I attend my Group Class?",
        summary: "Joining the classroom when it's time.",
        content: [
          "When the class is ready to begin, select Join Classroom from your lesson card. Students with a confirmed booking can enter the Virtual Classroom for that session.",
        ],
      },
    ],
  },
  {
    slug: "payments-refunds",
    title: "Payments & Refunds",
    description: "Payments, fees, refunds and cancellation policies.",
    icon: CreditCard,
    articles: [
      {
        slug: "how-payments-work",
        title: "How do payments work?",
        summary: "What you see before you pay.",
        content: [
          "Before checkout, Ensena shows a booking summary with the tutor or class, lesson schedule, price, any Special Offer discount, and the total amount. Nothing is charged until you confirm.",
          "Your payment is processed securely through Ensena's payment providers, and eligible tutor earnings are released according to Ensena's payout rules once a lesson is completed.",
        ],
      },
      {
        slug: "how-refunds-work",
        title: "How do refunds work?",
        summary: "Cancelling a booking and what gets refunded.",
        content: [
          "You can cancel an eligible booking from My Classes → Manage → Cancel Booking. Before you confirm, Ensena shows whether a full refund, partial refund or no refund applies, based on how much notice you've given.",
          "For the full policy, see the Cancellation & Refund Policy.",
        ],
      },
    ],
  },
  {
    slug: "student-account",
    title: "Student Account",
    description: "Manage your account, settings and personal information.",
    icon: UserCog,
    articles: [
      {
        slug: "managing-your-student-account",
        title: "Managing your student account",
        summary: "Update your profile and preferences.",
        content: [
          "You can update your profile details, academic level and preferences from your Student Dashboard settings.",
        ],
      },
      {
        slug: "account-access-issues",
        title: "I can't access my account",
        summary: "What to do if you're locked out.",
        content: [
          "If you're having trouble signing in, use the password reset option on the sign-in page. If that doesn't work, contact Ensena Support. You don't need to be signed in to reach us.",
        ],
      },
    ],
  },
  {
    slug: "tutor-help",
    title: "Tutor Help",
    description: "Resources for tutors teaching on Ensena.",
    icon: GraduationCap,
    articles: [
      {
        slug: "becoming-a-tutor",
        title: "How do I become a tutor on Ensena?",
        summary: "Requirements, verification and getting started.",
        content: [
          "Sign up as a tutor, then complete your profile with your subjects, qualifications and availability. New profiles go through a verification review before they appear in tutor search results.",
          "See the Teaching Guide for a full walkthrough of setting up your profile, rates and availability.",
        ],
      },
      {
        slug: "tutor-dashboard-overview",
        title: "Finding your way around the Tutor Dashboard",
        summary: "Where lessons, messages and earnings live.",
        content: [
          "My Classes covers your private lessons, Discovery Sessions and Group Classes. Inbox contains your conversations plus Pre-approvals & Offers. Earnings shows your available balance and payout history.",
        ],
      },
    ],
  },
  {
    slug: "virtual-classroom",
    title: "Virtual Classroom",
    description: "How to use the classroom and troubleshoot issues.",
    icon: Video,
    articles: [
      {
        slug: "joining-your-lesson",
        title: "How do I join my lesson?",
        summary: "Entering the virtual classroom.",
        content: [
          "From My Classes, find your upcoming lesson. A Join Classroom option becomes available shortly before the scheduled start time.",
        ],
      },
      {
        slug: "camera-microphone-not-working",
        title: "My camera or microphone isn't working",
        summary: "Troubleshooting steps before your lesson.",
        content: [
          "Check that your browser has permission to access your camera and microphone, and that the correct devices are selected. Make sure no other app is using the camera, your internet connection is stable, and your browser is up to date.",
          "If the problem continues, contact Ensena Support.",
        ],
      },
    ],
  },
  {
    slug: "counselling",
    title: "Speak to a Counsellor",
    description: "Get guidance and academic counselling support.",
    icon: MessageCircleQuestion,
    articles: [
      {
        slug: "what-is-counselling",
        title: "What is Speak to a Counsellor?",
        summary: "Guidance when you're not sure where to start.",
        content: [
          "If you're unsure which tutor, subject or learning path is right for you, Ensena's counselling service can help: with choosing a tutor, exam preparation options, building a learning plan, or understanding academic levels.",
          "Select Speak to a Counsellor from the navigation, choose an available appointment, and it will appear in your dashboard once confirmed.",
        ],
      },
      {
        slug: "counselling-scope",
        title: "Does counselling replace professional advice?",
        summary: "What counselling is and isn't.",
        content: [
          "Ensena's counselling is academic and educational guidance. It is not medical, mental-health, legal or financial advice. If you need that kind of support, please seek an appropriately qualified professional.",
        ],
      },
    ],
  },
  {
    slug: "safety-trust",
    title: "Safety & Trust",
    description: "Your safety is our priority. Learn how we protect you.",
    icon: ShieldCheck,
    articles: [
      {
        slug: "staying-safe-on-ensena",
        title: "Staying safe on Ensena",
        summary: "Keeping bookings, payments and messages on the platform.",
        content: [
          "Keep bookings, payments and communication within Ensena rather than moving them elsewhere. This is what keeps your payment protected and lets Ensena help if something goes wrong.",
        ],
      },
      {
        slug: "reporting-a-concern",
        title: "Reporting a concern",
        summary: "How to reach Ensena about a safety issue.",
        content: [
          "If something doesn't feel right about a tutor, student or lesson, contact Ensena Support so our team can look into it.",
        ],
      },
    ],
  },
  {
    slug: "technical-support",
    title: "Technical Support",
    description: "Get help with technical issues and errors.",
    icon: Wrench,
    articles: [
      {
        slug: "common-technical-problems",
        title: "Common technical problems",
        summary: "Login, booking and classroom issues.",
        content: [
          "If you can't log in, try resetting your password. If a booking or payment doesn't appear to have gone through, check My Classes before trying again, and contact Support with your booking reference if it's still missing.",
          "For classroom issues like audio or video not working, see the Virtual Classroom help articles.",
        ],
      },
    ],
  },
];

export function findHelpCategory(slug: string): HelpCategory | undefined {
  return helpCategories.find((c) => c.slug === slug);
}

export function findHelpArticle(categorySlug: string, articleSlug: string): HelpArticle | undefined {
  return findHelpCategory(categorySlug)?.articles.find((a) => a.slug === articleSlug);
}

export interface PopularArticleRef {
  categorySlug: string;
  articleSlug: string;
}

export const popularArticleRefs: PopularArticleRef[] = [
  { categorySlug: "booking-lessons", articleSlug: "book-instantly-vs-pre-approval" },
  { categorySlug: "discovery-sessions", articleSlug: "how-discovery-sessions-work" },
  { categorySlug: "booking-lessons", articleSlug: "how-pre-approval-works" },
  { categorySlug: "booking-lessons", articleSlug: "how-special-offers-work" },
  { categorySlug: "virtual-classroom", articleSlug: "joining-your-lesson" },
  { categorySlug: "payments-refunds", articleSlug: "how-refunds-work" },
  { categorySlug: "tutor-help", articleSlug: "becoming-a-tutor" },
];

export const popularSearches = ["Booking a tutor", "Discovery sessions", "Pre-approval", "Payments", "Joining a class"];
