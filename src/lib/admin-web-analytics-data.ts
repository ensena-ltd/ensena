// Mock representations of what would come from GA4 / Google Search Console /
// Microsoft Clarity once connected. See the Reports & Analytics page's
// "Integrations" note — this is UI scaffolding, not a real analytics engine.

export const analyticsSummaryCards = {
  totalVisitors: 184230,
  uniqueVisitors: 142870,
  registeredUsers: 12458,
  returningVisitors: 41360,
  conversionRatePct: 6.8,
  bounceRatePct: 38.4,
  avgSessionMins: 4.2,
  lessonsBooked: 3842,
};

export const trafficSources = [
  { source: "Google Search", visitors: 68420, pct: 37, color: "#F80248" },
  { source: "Direct", visitors: 34210, pct: 19, color: "#3B82F6" },
  { source: "Instagram", visitors: 21500, pct: 12, color: "#8B5CF6" },
  { source: "WhatsApp", visitors: 16580, pct: 9, color: "#22C55E" },
  { source: "Facebook", visitors: 12940, pct: 7, color: "#F59E0B" },
  { source: "TikTok", visitors: 11060, pct: 6, color: "#EC4899" },
  { source: "Referrals", visitors: 9210, pct: 5, color: "#14B8A6" },
  { source: "Email Campaigns", visitors: 6210, pct: 3, color: "#94A3B8" },
  { source: "X", visitors: 4100, pct: 2, color: "#64748B" },
];

export interface SearchKeyword {
  keyword: string;
  impressions: number;
  clicks: number;
  ctrPct: number;
  avgPosition: number;
}

export const searchKeywords: SearchKeyword[] = [
  { keyword: "mathematics tutor", impressions: 24500, clicks: 1840, ctrPct: 7.5, avgPosition: 3.2 },
  { keyword: "waec tutor", impressions: 18200, clicks: 1520, ctrPct: 8.4, avgPosition: 2.8 },
  { keyword: "online tutoring nigeria", impressions: 15900, clicks: 980, ctrPct: 6.2, avgPosition: 4.1 },
  { keyword: "physics tutor", impressions: 12100, clicks: 740, ctrPct: 6.1, avgPosition: 4.6 },
  { keyword: "jamb tutor", impressions: 10800, clicks: 690, ctrPct: 6.4, avgPosition: 3.9 },
  { keyword: "french teacher", impressions: 6200, clicks: 310, ctrPct: 5.0, avgPosition: 5.8 },
];

export interface CountryVisitors {
  country: string;
  flag: string;
  visitors: number;
  states?: { name: string; visitors: number; cities?: { name: string; visitors: number }[] }[];
}

export const countryVisitors: CountryVisitors[] = [
  {
    country: "Nigeria",
    flag: "🇳🇬",
    visitors: 154320,
    states: [
      { name: "Lagos", visitors: 62400, cities: [{ name: "Lekki", visitors: 18200 }, { name: "Ikeja", visitors: 15100 }, { name: "Surulere", visitors: 12300 }, { name: "Yaba", visitors: 9800 }] },
      { name: "Abuja (FCT)", visitors: 28900 },
      { name: "Rivers", visitors: 14200 },
      { name: "Kano", visitors: 9800 },
      { name: "Oyo", visitors: 8100 },
    ],
  },
  { country: "United Kingdom", flag: "🇬🇧", visitors: 8420 },
  { country: "United States", flag: "🇺🇸", visitors: 6910 },
  { country: "Canada", flag: "🇨🇦", visitors: 3840 },
  { country: "Ghana", flag: "🇬🇭", visitors: 2980 },
];

export const deviceBreakdown = {
  types: [
    { label: "Mobile", pct: 68, color: "#F80248" },
    { label: "Desktop", pct: 27, color: "#3B82F6" },
    { label: "Tablet", pct: 5, color: "#8B5CF6" },
  ],
  operatingSystems: [
    { label: "Android", pct: 44 },
    { label: "iOS", pct: 26 },
    { label: "Windows", pct: 22 },
    { label: "macOS", pct: 7 },
    { label: "Linux", pct: 1 },
  ],
  browsers: [
    { label: "Chrome", pct: 61 },
    { label: "Safari", pct: 24 },
    { label: "Edge", pct: 9 },
    { label: "Firefox", pct: 6 },
  ],
};

export interface PageAnalytics {
  path: string;
  views: number;
  uniqueVisitors: number;
  avgTimeMins: number;
  bounceRatePct: number;
  exitRatePct: number;
}

export const topPages: PageAnalytics[] = [
  { path: "/ (Landing Page)", views: 92100, uniqueVisitors: 71200, avgTimeMins: 1.8, bounceRatePct: 42, exitRatePct: 30 },
  { path: "/find-teachers", views: 54300, uniqueVisitors: 38900, avgTimeMins: 3.1, bounceRatePct: 28, exitRatePct: 22 },
  { path: "/become-a-tutor", views: 21400, uniqueVisitors: 17200, avgTimeMins: 2.4, bounceRatePct: 35, exitRatePct: 40 },
  { path: "/group-classes", views: 18900, uniqueVisitors: 14100, avgTimeMins: 2.0, bounceRatePct: 33, exitRatePct: 26 },
  { path: "/counsellor", views: 9600, uniqueVisitors: 7800, avgTimeMins: 1.6, bounceRatePct: 48, exitRatePct: 44 },
];
