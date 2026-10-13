// No roles are open right now. This is the real architecture for the
// Careers page — populate this array once there is an actual open role.
// Do not add placeholder job listings.
export interface JobRole {
  slug: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract";
  description: string;
}

export const openRoles: JobRole[] = [];
