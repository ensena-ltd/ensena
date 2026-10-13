import type { LucideIcon } from "lucide-react";
import {
  Award,
  Baby,
  Backpack,
  BadgeCheck,
  BookOpen,
  BookOpenText,
  Calculator,
  CalendarClock,
  ClipboardCheck,
  FlaskConical,
  Headset,
  Landmark,
  Languages,
  NotebookPen,
  School,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";

export interface AcademicLevel {
  icon: LucideIcon;
  label: string;
  sub: string;
  bg: string;
}

export interface Teacher {
  name: string;
  subject: string;
  rating?: string;
  reviews?: number;
  price: number;
  image: string;
  // Optional homepage discovery-feed badges — undefined for every existing
  // caller, so none of the current sections render anything extra.
  yearsExperience?: number;
  availableToday?: boolean;
  modes?: ("Online" | "Physical" | "Hybrid")[];
}

export interface GroupClass {
  name: string;
  // Real, routable id — matches a GroupClassListing.slug in
  // group-classes-data.ts, so cards can link straight to
  // /group-classes/[slug] (the existing booking page) instead of a
  // name-keyed lookup table.
  slug: string;
  enrolled: number;
  maxSeats: number;
  schedule: string;
  price: number;
  bg: string;
  accent: string;
  icon: LucideIcon;
}

// One consistent soft-pink treatment across every card — the same value the
// Exam Prep card already used — rather than a mix of that pink and a plain
// neutral, so no single card reads as the "odd one out."
export const academicLevels: AcademicLevel[] = [
  { icon: Baby, label: "Nursery", sub: "Early Learners", bg: "#FDE9EE" },
  { icon: BookOpen, label: "Primary", sub: "Grades 1 – 6", bg: "#FDE9EE" },
  { icon: Backpack, label: "Secondary", sub: "JSS 1 – SS 3", bg: "#FDE9EE" },
  { icon: ClipboardCheck, label: "Exams", sub: "Exam Prep", bg: "#FDE9EE" },
  { icon: Languages, label: "Language", sub: "Multilingual", bg: "#FDE9EE" },
  { icon: Landmark, label: "Undergraduate", sub: "University", bg: "#FDE9EE" },
  { icon: School, label: "Masters", sub: "Postgraduate", bg: "#FDE9EE" },
  { icon: Award, label: "PhD", sub: "Doctorate", bg: "#FDE9EE" },
];

export const teacherPhotos = [
  "/teacher-1.jpg.png",
  "/teacher-2.jpg.png",
  "/teacher-3.jpg.png",
  "/teacher-4.jpg.png",
];

export const topRatedTeachers: Teacher[] = [
  {
    name: "Tunde Adebayo",
    subject: "Mathematics Tutor",
    rating: "4.9",
    reviews: 320,
    price: 3000,
    image: teacherPhotos[0],
  },
  {
    name: "Chioma Nwosu",
    subject: "Physics Tutor",
    rating: "4.8",
    reviews: 230,
    price: 3200,
    image: teacherPhotos[1],
  },
  {
    name: "Emeka Okafor",
    subject: "English Tutor",
    rating: "4.9",
    reviews: 210,
    price: 2500,
    image: teacherPhotos[2],
  },
  {
    name: "Daniel Adeyemi",
    subject: "Chemistry Tutor",
    rating: "4.9",
    reviews: 180,
    price: 2800,
    image: teacherPhotos[0],
  },
  {
    name: "Zainab Yusuf",
    subject: "Biology Tutor",
    rating: "4.8",
    reviews: 153,
    price: 2500,
    image: teacherPhotos[3],
  },
  {
    name: "Ifeoma Balogun",
    subject: "French Tutor",
    rating: "4.9",
    reviews: 141,
    price: 3500,
    image: teacherPhotos[1],
  },
];

// Reuses existing top-rated/new teacher entries whose subject is a core
// WAEC/JAMB exam subject — for the homepage's "WAEC & JAMB Prep" carousel.
export const examPrepTeachers: Teacher[] = [
  { name: "Tunde Adebayo", subject: "Mathematics Tutor", rating: "4.9", reviews: 320, price: 3000, image: teacherPhotos[0] },
  { name: "Daniel Adeyemi", subject: "Chemistry Tutor", rating: "4.9", reviews: 180, price: 2800, image: teacherPhotos[0] },
  { name: "Chioma Nwosu", subject: "Physics Tutor", rating: "4.8", reviews: 230, price: 3200, image: teacherPhotos[1] },
  { name: "Zainab Yusuf", subject: "Biology Tutor", rating: "4.8", reviews: 153, price: 2500, image: teacherPhotos[3] },
  { name: "Samuel Eze", subject: "Biology Tutor", price: 2500, image: teacherPhotos[2] },
];

export const newTeachers: Teacher[] = [
  {
    name: "Faruk Musa",
    subject: "Mathematics Tutor",
    price: 3000,
    image: teacherPhotos[2],
  },
  {
    name: "Aisha Bello",
    subject: "English Tutor",
    price: 2500,
    image: teacherPhotos[3],
  },
  {
    name: "Oluwatobi Lawal",
    subject: "Physics Tutor",
    price: 2800,
    image: teacherPhotos[0],
  },
  {
    name: "Esther Ibe",
    subject: "Chemistry Tutor",
    price: 2500,
    image: teacherPhotos[1],
  },
  {
    name: "Samuel Eze",
    subject: "Biology Tutor",
    price: 2500,
    image: teacherPhotos[2],
  },
];

// Uniform white card + a single brand-primary accent for every class — the
// old per-subject bg/accent pairing (blue card, green card, orange card...)
// read as busy/childish rather than premium. bg/accent stay on the type
// (still consumed by group-class-card.tsx) but now converge on one clean,
// consistent treatment instead of five competing palettes.
export const groupClasses: GroupClass[] = [
  {
    name: "French Group Class",
    slug: "french-conversation-for-beginners",
    enrolled: 6,
    maxSeats: 10,
    schedule: "Sat, 10:00 AM",
    price: 2000,
    bg: "#FFFFFF",
    accent: "#F80248",
    icon: Languages,
  },
  {
    name: "Mathematics Group Class",
    slug: "mathematics-excellence",
    enrolled: 3,
    maxSeats: 10,
    schedule: "Tue, 4:00 PM",
    price: 1500,
    bg: "#FFFFFF",
    accent: "#F80248",
    icon: Calculator,
  },
  {
    name: "English Group Class",
    slug: "english-language-mastery",
    enrolled: 8,
    maxSeats: 10,
    schedule: "Mon, 5:00 PM",
    price: 1800,
    bg: "#FFFFFF",
    accent: "#F80248",
    icon: BookOpenText,
  },
  {
    name: "Chemistry Group Class",
    slug: "waec-chemistry-masterclass",
    enrolled: 2,
    maxSeats: 10,
    schedule: "Wed, 3:00 PM",
    price: 2000,
    bg: "#FFFFFF",
    accent: "#F80248",
    icon: FlaskConical,
  },
  {
    name: "WAEC Prep Group Class",
    slug: "waec-english-writing-clinic",
    enrolled: 5,
    maxSeats: 10,
    schedule: "Sun, 11:00 AM",
    price: 2500,
    bg: "#FFFFFF",
    accent: "#F80248",
    icon: NotebookPen,
  },
];

export const heroImage = "/hero-student-transparent.png";

// The single source for the "man with folded arms" tutor banner — shown on
// the Become a Tutor hero and the How It Works tutor persona. Update this
// one path (not the individual consumers) to swap the photo everywhere.
export const tutorBannerImage = "/tutor-banner.png";

export const trustAvatars = [
  teacherPhotos[0],
  teacherPhotos[1],
  teacherPhotos[2],
];

export interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const trustFeatures: Benefit[] = [
  {
    icon: ShieldCheck,
    title: "Verified Teachers",
    description: "Every teacher is identity-checked and credential-verified.",
  },
  {
    icon: Wallet,
    title: "Secure Payments",
    description: "Your transactions are encrypted and fully protected.",
  },
  {
    icon: Headset,
    title: "24/7 Support",
    description: "Our team is here to help whenever you need us.",
  },
  {
    icon: CalendarClock,
    title: "Flexible Learning",
    description: "Learn at your own pace, on your own schedule.",
  },
];

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

export const footerLinkGroups: FooterLinkGroup[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Teaching Guide", href: "/teaching-guide" },
      { label: "Learning Guide", href: "/learning-guide" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Refund Policy", href: "/refund-policy" },
    ],
  },
];

export const academicLevelOptions = [
  "All levels",
  "Nursery",
  "Primary",
  "Secondary",
  "Exams",
  "Language",
  "Undergraduate",
  "Masters",
  "PhD",
];

