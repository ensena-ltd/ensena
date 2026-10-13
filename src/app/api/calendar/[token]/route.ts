import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";

// Private iCalendar (.ics) feed of a user's Ensena schedule — private
// lessons, discovery sessions, group-class sessions, counselling
// appointments and homework due dates. The URL itself is the secret (a
// random token from Settings → Calendar Sync, which can be regenerated or
// turned off). Google Calendar, Apple Calendar and Outlook subscribe to it
// and re-fetch it periodically, so new bookings show up automatically.
export const dynamic = "force-dynamic";

interface CalEvent {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string;
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  allDay?: boolean;
}

function siteUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsDay(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function esc(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// RFC 5545: lines longer than 75 octets are folded.
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

function statusOf(raw: string | null | undefined): CalEvent["status"] {
  if (/cancel/i.test(raw ?? "")) return "CANCELLED";
  if (/pending|request/i.test(raw ?? "")) return "TENTATIVE";
  return "CONFIRMED";
}

function buildIcs(name: string, events: CalEvent[]) {
  const now = icsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ensena//Ensena Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "X-WR-TIMEZONE:Africa/Lagos",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@ensena.co`,
      `DTSTAMP:${now}`,
      ...(e.allDay ? [`DTSTART;VALUE=DATE:${icsDay(e.start)}`, `DTEND;VALUE=DATE:${icsDay(new Date(e.start.getTime() + 86400_000))}`] : [`DTSTART:${icsDate(e.start)}`, `DTEND:${icsDate(e.end)}`]),
      `SUMMARY:${esc(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      ...(e.location ? [`URL:${e.location}`, `LOCATION:${esc(e.location)}`] : []),
      `STATUS:${e.status ?? "CONFIRMED"}`,
      ...(e.allDay || e.status === "CANCELLED" ? [] : ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "TRIGGER:-PT30M", "END:VALARM"]),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/i, "");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new NextResponse("Not found", { status: 404 });

  const admin = getServiceRoleClient();
  const { data: owner } = await admin.from("account_settings").select("user_id").eq("calendar_token", token).maybeSingle();
  if (!owner) return new NextResponse("Not found", { status: 404 });
  const userId = owner.user_id as string;

  const { data: me } = await admin.from("profiles").select("full_name, role").eq("id", userId).maybeSingle();
  const role = me?.role === "tutor" ? "tutor" : "student";
  const mine = role === "tutor" ? "tutor_id" : "student_id";
  const other = role === "tutor" ? "student_id" : "tutor_id";
  const base = siteUrl(request);
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();

  const [lessons, discovery, counselling, homework, enrollments] = await Promise.all([
    admin.from("private_lessons").select("id, student_id, tutor_id, subject, scheduled_at, duration_minutes, mode, status, booking_reference").eq(mine, userId).gte("scheduled_at", since),
    admin.from("discovery_sessions").select("id, student_id, tutor_id, subject, scheduled_start_at, scheduled_end_at, status, booking_reference").eq(mine, userId).gte("scheduled_start_at", since),
    role === "student" ? admin.from("counselling_appointments").select("id, scheduled_at, duration_minutes, status, booking_reference").eq("student_id", userId).gte("scheduled_at", since) : Promise.resolve({ data: [] }),
    role === "student" ? admin.from("homework_items").select("id, tutor_id, title, subject, due_at, submitted_at, status").eq("student_id", userId).gte("due_at", since) : Promise.resolve({ data: [] }),
    role === "student" ? admin.from("group_class_enrollments").select("cohort_id, status").eq("student_id", userId) : Promise.resolve({ data: [] }),
  ]);

  // Names of the other people in each lesson.
  type Row = Record<string, unknown>;
  const rows = (r: { data: unknown }) => (r.data ?? []) as Row[];
  const ids = new Set<string>();
  for (const r of [...rows(lessons), ...rows(discovery)]) if (r[other]) ids.add(r[other] as string);
  const names = new Map<string, string>();
  if (ids.size) {
    const { data } = await admin.from("profiles").select("id, full_name").in("id", [...ids]);
    for (const p of data ?? []) names.set(p.id, p.full_name ?? "");
  }
  const who = (id: unknown) => (id && names.get(id as string)) || (role === "tutor" ? "your student" : "your tutor");
  const dash = role === "tutor" ? "/tutor-dashboard" : "/student-dashboard";

  const events: CalEvent[] = [];
  for (const l of rows(lessons)) {
    if (!l.scheduled_at) continue;
    const start = new Date(l.scheduled_at as string);
    events.push({
      uid: `lesson-${l.id}`,
      start,
      end: new Date(start.getTime() + ((l.duration_minutes as number) || 60) * 60_000),
      title: role === "tutor" ? `Ensena: ${l.subject} with ${who(l.student_id)}` : `Ensena: ${l.subject} lesson with ${who(l.tutor_id)}`,
      description: [`Private lesson (${l.mode ?? "online"})`, l.booking_reference ? `Booking reference: ${l.booking_reference}` : "", `Join from your Ensena dashboard: ${base}${dash}`].filter(Boolean).join("\n"),
      location: `${base}${role === "tutor" ? "/tutor-dashboard/private-lessons" : "/student-dashboard/lessons/upcoming"}`,
      status: statusOf(l.status as string),
    });
  }
  for (const d of rows(discovery)) {
    if (!d.scheduled_start_at) continue;
    const start = new Date(d.scheduled_start_at as string);
    events.push({
      uid: `discovery-${d.id}`,
      start,
      end: d.scheduled_end_at ? new Date(d.scheduled_end_at as string) : new Date(start.getTime() + 30 * 60_000),
      title: `Ensena: ${d.subject ?? "Discovery"} discovery session with ${who(d[other])}`,
      description: [d.booking_reference ? `Booking reference: ${d.booking_reference}` : "", `${base}${dash}`].filter(Boolean).join("\n"),
      location: `${base}${role === "tutor" ? "/tutor-dashboard/discovery-sessions" : dash}`,
      status: statusOf(d.status as string),
    });
  }
  for (const c of rows(counselling)) {
    if (!c.scheduled_at) continue;
    const start = new Date(c.scheduled_at as string);
    events.push({
      uid: `counselling-${c.id}`,
      start,
      end: new Date(start.getTime() + ((c.duration_minutes as number) || 45) * 60_000),
      title: "Ensena: Academic counselling session",
      description: [c.booking_reference ? `Booking reference: ${c.booking_reference}` : "", `${base}${dash}`].filter(Boolean).join("\n"),
      location: `${base}${dash}`,
      status: statusOf(c.status as string),
    });
  }
  for (const h of rows(homework)) {
    if (!h.due_at) continue;
    const done = !!h.submitted_at || /submitted|graded|completed/i.test((h.status as string) ?? "");
    const due = new Date(h.due_at as string);
    events.push({
      uid: `homework-${h.id}`,
      start: due,
      end: due,
      allDay: true,
      title: `${done ? "✓ " : ""}Homework due: ${h.title}${h.subject ? ` (${h.subject})` : ""}`,
      description: `Due ${due.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })} WAT\n${base}/student-dashboard/homework`,
      location: `${base}/student-dashboard/homework`,
    });
  }

  // Group classes: every session of each cohort the student is enrolled in,
  // or — for a tutor — of every class they teach.
  let cohortIds = rows(enrollments)
    .filter((e) => !/cancel|waitlist/i.test((e.status as string) ?? ""))
    .map((e) => e.cohort_id as string)
    .filter(Boolean);
  if (role === "tutor") {
    const { data: taught } = await admin.from("group_classes").select("id").eq("tutor_id", userId).neq("status", "Cancelled");
    const taughtIds = (taught ?? []).map((c) => c.id as string);
    const { data: taughtCohorts } = taughtIds.length ? await admin.from("group_class_cohorts").select("id").in("group_class_id", taughtIds).neq("status", "Cancelled") : { data: [] };
    cohortIds = (taughtCohorts ?? []).map((c) => c.id as string);
  }
  if (cohortIds.length) {
    const [{ data: sessions }, { data: cohorts }] = await Promise.all([
      admin.from("group_class_sessions").select("id, cohort_id, session_number, scheduled_at, status").in("cohort_id", cohortIds).gte("scheduled_at", since),
      admin.from("group_class_cohorts").select("id, group_class_id").in("id", cohortIds),
    ]);
    const classIds = [...new Set((cohorts ?? []).map((c) => c.group_class_id).filter(Boolean))];
    const { data: classes } = classIds.length ? await admin.from("group_classes").select("id, title, subject").in("id", classIds) : { data: [] };
    const classOfCohort = new Map((cohorts ?? []).map((c) => [c.id, (classes ?? []).find((k) => k.id === c.group_class_id)]));
    for (const s of sessions ?? []) {
      if (!s.scheduled_at) continue;
      const k = classOfCohort.get(s.cohort_id);
      const start = new Date(s.scheduled_at);
      events.push({
        uid: `group-${s.id}`,
        start,
        end: new Date(start.getTime() + 60 * 60_000),
        title: `Ensena: ${k?.title ?? k?.subject ?? "Group class"} — session ${s.session_number ?? ""}`.trim(),
        location: `${base}${role === "tutor" ? `/tutor-dashboard/classroom/group/${k?.id ?? ""}` : "/student-dashboard"}`,
        status: statusOf(s.status),
      });
    }
  }

  const body = buildIcs(`Ensena — ${me?.full_name?.trim() || "My lessons"}`, events);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ensena.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
