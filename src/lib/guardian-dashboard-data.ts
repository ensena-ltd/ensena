export interface GuardianProfile {
  name: string;
  image: string;
}

export const guardianProfile: GuardianProfile = {
  name: "Grace Ejie",
  image: "/teacher-1.jpg.png",
};

export interface LinkedChild {
  id: string;
  name: string;
  image: string;
  level: string;
  tutor: string;
  tutorImage: string;
}

export const linkedChildren: LinkedChild[] = [
  { id: "c1", name: "Cynthia Ejie", image: "/teacher-4.jpg.png", level: "WAEC", tutor: "Adaeze Okonkwo", tutorImage: "/teacher-2.jpg.png" },
];

export interface GuardianSidebarNavItem {
  label: string;
  href: string;
}

// MVP guardian nav: a single comprehensive Dashboard page (child's schedule,
// tutor, learning plan, assignments, progress, bookings and payments all live
// there as sections) rather than splitting into many sparsely-populated
// sub-pages. Expand into dedicated routes once there's enough real usage to
// justify it.
export const guardianSidebarNavItems: GuardianSidebarNavItem[] = [
  { label: "Dashboard", href: "/guardian-dashboard" },
];
