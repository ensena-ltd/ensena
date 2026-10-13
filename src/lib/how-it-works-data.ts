import {
  Award,
  BadgeCheck,
  BookOpen,
  Calendar,
  FileCheck2,
  Headphones,
  Lock,
  MessageCircle,
  Mic,
  PenTool,
  Phone,
  Rocket,
  ScreenShare,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Wallet,
} from "lucide-react";

export type Persona = "Student" | "Tutor";

export const startWays = [
  {
    icon: Search,
    tint: "bg-ensena-primary/10 text-ensena-primary",
    title: "Find a Tutor",
    description: "Know what you're looking for? Search tutors by subject, academic level, availability, price, rating and teaching experience.",
    cta: "Browse Tutors",
    href: "/find-teachers",
  },
  {
    icon: Calendar,
    tint: "bg-[#CBEFFF] text-[#2F9BE0]",
    title: "Book a Discovery Session",
    description: "Meet a tutor before committing to regular lessons. Discuss your goals, experience their teaching style and decide whether they're the right fit.",
    cta: "Explore Discovery Sessions",
    href: "/find-teachers",
  },
  {
    icon: Headphones,
    tint: "bg-violet-100 text-violet-600",
    title: "Speak to a Counsellor",
    badge: "FREE",
    description: "Not sure where to start? Speak privately with an Ensena counsellor who can help you understand your learning needs and find the right tutor or class.",
    cta: "Speak to a Counsellor",
    href: "/counsellor",
  },
];

export const tutorStartWays = [
  {
    icon: UserCheck,
    tint: "bg-ensena-primary/10 text-ensena-primary",
    title: "Apply to Teach",
    description: "Create your tutor profile and tell us about your subjects, experience and teaching style.",
    cta: "Become a Tutor",
    href: "/become-a-tutor",
  },
  {
    icon: FileCheck2,
    tint: "bg-[#CBEFFF] text-[#2F9BE0]",
    title: "Get Verified",
    description: "Submit your qualifications and identity documents so students can learn from you with confidence.",
    cta: "See verification steps",
    href: "/become-a-tutor",
  },
  {
    icon: Headphones,
    tint: "bg-violet-100 text-violet-600",
    title: "Talk to Our Team",
    badge: "FREE",
    description: "Have questions about teaching on Ensena, pricing or group classes? Our team is here to help.",
    cta: "Speak to a Counsellor",
    href: "/counsellor",
  },
];

export const studentJourney = [
  { icon: Users, title: "Find & Connect", description: "Search tutors, read reviews and choose who you'd like to learn with." },
  { icon: Calendar, title: "Book a Discovery Session", description: "Pick a date and time to meet your tutor and discuss your goals." },
  { icon: Video, title: "Meet Your Tutor", description: "Attend your Discovery Session in our virtual classroom." },
  { icon: FileCheck2, title: "Decide If It's a Fit", description: "Tell us if your tutor was the right fit, right after your session." },
  { icon: Rocket, title: "Continue Learning", description: "Book private lessons or join group classes and start learning." },
  { icon: TrendingUp, title: "Track & Grow", description: "Track your progress, complete lessons and achieve your goals." },
];

export const tutorJourney = [
  { icon: UserCheck, title: "Apply", description: "Create your tutor profile and tell us about yourself." },
  { icon: FileCheck2, title: "Get Verified", description: "Submit your documents and get verified by our team." },
  { icon: Award, title: "Set Your Profile", description: "Add subjects, rates, availability and your teaching style." },
  { icon: Users, title: "Start Teaching", description: "Offer Discovery Sessions, private lessons or create group classes." },
  { icon: Video, title: "Teach Online", description: "Use our classroom to teach and manage your students." },
  { icon: Wallet, title: "Get Paid", description: "Track your earnings, withdraw anytime with ease." },
];

export const featureCards = [
  { icon: ShieldCheck, tint: "bg-rose-50 text-rose-500", title: "Verified Tutors", description: "All tutors go through our verification process before they can teach." },
  { icon: Video, tint: "bg-[#CBEFFF] text-[#2F9BE0]", title: "Virtual Classroom", description: "Interactive learning with video, chat, whiteboard and screen sharing." },
  { icon: Lock, tint: "bg-violet-50 text-violet-500", title: "Secure Payments", description: "Your payment is held safely until the lesson is completed." },
  { icon: FileCheck2, tint: "bg-emerald-50 text-emerald-600", title: "Free Discovery Sessions", description: "Meet a tutor for free before deciding if they're the right fit." },
  { icon: Star, tint: "bg-amber-50 text-amber-600", title: "Reviews You Can Trust", description: "Real reviews from real students who learned on Ensena." },
  { icon: Headphones, tint: "bg-indigo-50 text-indigo-600", title: "Support When Needed", description: "Our team is here to help students and tutors whenever they need us." },
];

export const paymentSteps = [
  { icon: Wallet, title: "1. You pay", description: "You pay securely when booking your lesson." },
  { icon: ShieldCheck, title: "2. Ensena holds the payment", description: "We hold the payment in escrow. The tutor doesn't get paid yet." },
  { icon: Video, title: "3. Your lesson happens", description: "Attend your scheduled lesson in our virtual classroom." },
  { icon: BadgeCheck, title: "4. Payment is released", description: "After the lesson, you release the payment to the tutor. If there's an issue, report it before it's auto-released." },
];

export const verificationSteps = ["Application", "Identity", "Qualifications", "Profile Review", "Approved"];

export const discoverySessionSteps = {
  before: ["Tutor", "Date", "Time", "Subject", "Learning Goal"],
  during: [
    "Learn about the student's goals.",
    "Understand their current level.",
    "Discuss challenges.",
    "Demonstrate their teaching approach.",
  ],
  after: ["Discovery Session", "Is This Tutor the Right Fit?", "Continue with Tutor / Explore Other Tutors / Speak to Counsellor"],
};

export const discoveryFitMock = {
  subject: "English",
  question: "Is Adaeze the right fit for you?",
  yesLabel: "Yes, this is a great fit",
  noLabel: "Not the right fit",
  nextStep: "Book More Sessions",
};

export const privateLessonSteps = ["Tutor", "Subject", "Date & Time", "Lesson Duration", "Frequency", "Pay", "Join Classroom"];

export const groupClassInfo = ["Tutor", "Class topic", "Academic level", "Schedule", "Duration", "Class size", "Available seats", "Price", "Curriculum"];

export const classroomFeatures = [
  { icon: Video, label: "Live video" },
  { icon: Mic, label: "Audio" },
  { icon: ScreenShare, label: "Screen sharing" },
  { icon: PenTool, label: "Interactive whiteboard" },
  { icon: MessageCircle, label: "Live chat" },
  { icon: BookOpen, label: "Lesson materials" },
];

export const afterLessonStudent = ["Lesson Completed", "Leave Review", "Book Again", "Continue Learning"];
export const afterLessonDiscovery = ["Discovery Completed", "Is This Tutor the Right Fit?", "Rate & Review", "Continue with Tutor / Explore Other Tutors"];

export const counsellorSteps = [
  { title: "Tell us what's going on", description: "Complete a short intake form." },
  { title: "Choose how you'd like to talk", description: "Video Call, Phone Call or Message.", icons: [Video, Phone, MessageCircle] },
  { title: "Pick an available time", description: "You only see available counselling slots." },
  { title: "Get guidance", description: "Recommendations for tutors, subjects, Discovery Sessions, private tutoring, group classes or a suggested learning direction." },
];

export const studentTimeline = [
  "Create Account",
  "Find a Tutor or Speak to a Counsellor",
  "Book Discovery Session",
  "Meet Your Tutor",
  "Decide If It's a Fit",
  "Continue With Private or Group Lessons",
  "Learn in the Virtual Classroom",
  "Track Your Learning Journey",
];

export const tutorEarningsExample = { studentPays: 10000, feePct: 15 };

export const trustCards = [
  { icon: ShieldCheck, title: "Verified Tutors", description: "Tutor applications are reviewed before approval." },
  { icon: Lock, title: "Protected Payments", description: "Eligible lesson payments follow Ensena's payment-protection process." },
  { icon: Star, title: "Real Reviews", description: "Reviews come from students who booked through Ensena." },
  { icon: Headphones, title: "Support When Needed", description: "Students and tutors can contact Ensena if something goes wrong." },
];

export const faqItems = [
  { q: "Do I have to book a Discovery Session?", a: "No. Discovery Sessions are optional. If you already know who you want to learn with, you can book private lessons directly." },
  { q: "What happens during a Discovery Session?", a: "You'll meet your tutor in our virtual classroom, discuss your goals and current level, and get a feel for their teaching style before committing to lessons." },
  { q: "Can I change tutors after my Discovery Session?", a: "Yes. You're never obligated to continue with a tutor just because you booked a Discovery Session with them." },
  { q: "Can I book a tutor directly without a Discovery Session?", a: "Yes, if a tutor offers private lessons directly you can book them without going through a Discovery Session first." },
  { q: "How do private lessons work?", a: "You choose a tutor, subject, date, time and lesson duration, then pay securely and join your lesson in our virtual classroom." },
  { q: "How do group classes work?", a: "You browse scheduled classes by subject, level and time, then reserve a seat. Group classes are reviewed by Ensena before becoming available." },
  { q: "Is counselling really free?", a: "Yes, speaking to an Ensena counsellor is completely free for students." },
  { q: "How are tutors verified?", a: "Tutors go through an application, identity check, qualification review and profile review before being approved to teach." },
  { q: "How does payment protection work?", a: "Your payment is held by Ensena until your lesson happens. If there's a problem, report it before the payment is automatically released to the tutor." },
  { q: "What happens if my tutor doesn't attend?", a: "Report it to us before the payment is released and our support team will help resolve it." },
  { q: "Can I cancel or reschedule?", a: "Yes, lessons can be cancelled or rescheduled ahead of time from your dashboard, subject to our cancellation policy." },
  { q: "What is Ensena's platform fee for tutors?", a: "Ensena takes a 20% platform fee from each completed lesson. Tutors always see their expected net earnings before confirming a booking." },
];
