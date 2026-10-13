// No articles have been published yet. This is the real architecture for
// /blog and /blog/[slug] — populate this array (or wire it to a CMS/DB) once
// there is real editorial content. Do not fill it with placeholder posts.
export const blogCategories = [
  "Learning",
  "Exams",
  "Tutoring",
  "Study Tips",
  "University",
  "Languages",
  "Technology",
  "Ensena Updates",
] as const;

export type BlogCategory = (typeof blogCategories)[number];

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  image: string;
  publishedAt: string; // ISO date
  content: string[];
}

export const blogArticles: BlogArticle[] = [];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return blogArticles.find((a) => a.slug === slug);
}
