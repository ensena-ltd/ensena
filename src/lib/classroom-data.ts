import { buildBookingReference } from "@/lib/booking-reference";
import { counsellor } from "@/lib/counsellor-data";
import type { DiscoverySession } from "@/lib/discovery-sessions-data";
import { getAllDiscoverySessions } from "@/lib/discovery-sessions-store";
import { formatCounsellingDisplayId, initialCounsellingAppointments } from "@/lib/admin-counselling-data";
import {
  dashboardStudent,
  groupClassResources,
  studentGroupClasses,
  studentLessons,
} from "@/lib/student-dashboard-data";
import { getPrivateLessons } from "@/lib/private-lessons-store";
import { hasSessionAccess } from "@/lib/payment-plans-store";
import { dashboardTutor, initialMyGroupClasses, initialPrivateLessons } from "@/lib/tutor-dashboard-data";
import { getTutorBySlug } from "@/lib/tutors";

export type ClassroomKind = "private" | "group" | "discovery" | "counselling";
export type ClassroomRole = "tutor" | "student";

const LAB_SUBJECTS = new Set(["Physics", "Chemistry", "Biology"]);

export interface ClassroomParticipantView {
  id: string;
  name: string;
  image?: string;
  role: "tutor" | "student";
  isSelf: boolean;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  /** Group Class only (see useGroupWebRTCMesh) — this participant's real, live MediaStream once their WebRTC connection is up. Undefined for kinds that use the plain self/remoteStream pair instead (private, counselling) and for a group participant who hasn't published one yet. */
  stream?: MediaStream | null;
  /** Group Class only — whether this roster entry is actually connected to the real-time classroom right now, distinct from merely being enrolled. Undefined outside group classes. */
  connectionState?: "not-joined" | "connecting" | "connected";
}

export interface ClassroomChatMessage {
  id: string;
  sender: string;
  senderRole: "tutor" | "student";
  text: string;
  time: string;
}

export interface ClassroomSession {
  kind: ClassroomKind;
  id: string;
  /** Stable identity for this lesson's classroom across both the tutor's
   * and the student's independent renders of it — `${kind}:${id}`, since
   * both sides always derive from the same underlying lesson/booking id.
   * This is the key the whiteboard/realtime layer persists and syncs
   * against (see classroom-whiteboard-store.ts, classroom-sync.ts), and
   * what becomes `lesson_id` in whiteboard_documents/classroom_sessions
   * once a real backend is connected (0003_classroom.sql). */
  classroomId: string;
  role: ClassroomRole;
  bookingReference: string;
  subject: string;
  /** A more specific real topic within the subject (e.g. a group class's actual title, which already carries this) — shown as "Subject • Topic" in the header when present. Left unset rather than guessed where no such real value exists on the underlying record. */
  topic?: string;
  title: string;
  typeLabel: "Private Lesson" | "Group Class" | "Discovery Session" | "Counselling Session";
  tutorName: string;
  tutorImage?: string;
  studentName?: string;
  studentImage?: string;
  date: string;
  time: string;
  durationLabel: string;
  durationMinutesNumeric: number;
  /** Real wall-clock scheduled end — see buildFromDiscovery. Only set for Discovery Classes; every other kind uses the plain relative countdown. */
  scheduledEndAtISO?: string;
  mode: "Online" | "Physical" | "In-person";
  seatsLabel?: string;
  materials: string[];
  /** The real headcount — for a student viewing a group class this is
   * larger than `participants.length`, since classmates beyond "you" and
   * the tutor are collapsed into one placeholder tile rather than named
   * individually (see the privacy note on buildFromStudentGroupClass). */
  participantCount: number;
  participants: ClassroomParticipantView[];
  chatSeed: ClassroomChatMessage[];
  labApplies: boolean;
  labSubject?: "Physics" | "Chemistry" | "Biology";
  /** Real gross price for this one session, parsed from the underlying
   * lesson's own price field — used to start a real escrow/lesson-
   * confirmation record when a tutor ends a Private lesson. 0 where a
   * session has no per-lesson price (Discovery, Counselling). */
  amountGross: number;
  /** The REAL server-side-equivalent entitlement check (hasSessionAccess,
   * payment-plans-store.ts) — undefined for a tutor's own render (a tutor
   * always has access to their own assigned class; only a student's
   * entitlement is ever in question) and for Discovery/Counselling
   * (free by construction). `false` means this student has not paid for
   * this specific session — the classroom route must refuse to render
   * ClassroomShell in that case, not just rely on the dashboard hiding the
   * "Enter Class" button (a student who navigates straight to the
   * classroom URL must be blocked here too). */
  hasPaymentAccess?: boolean;
  /** Built from the database (classroom-live-server.ts) rather than demo data:
   * payment access comes from the booking row and ending a class is recorded
   * through server actions instead of browser storage. */
  live?: boolean;
  /** Live group classes only — the group_class_sessions row this room is for. */
  liveSessionId?: string;
}

function parseNairaAmount(text: string | undefined): number {
  if (!text) return 0;
  const digits = text.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function labSubjectFor(subject: string): "Physics" | "Chemistry" | "Biology" | undefined {
  return LAB_SUBJECTS.has(subject) ? (subject as "Physics" | "Chemistry" | "Biology") : undefined;
}

function parseDurationMinutes(text: string): number {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
}

function participant(opts: {
  id: string;
  name: string;
  image?: string;
  role: "tutor" | "student";
  isSelf: boolean;
}): ClassroomParticipantView {
  return { ...opts, micOn: true, camOn: opts.role === "tutor", handRaised: false };
}

function buildChatSeed(tutorName: string, studentLabel: string, subject: string): ClassroomChatMessage[] {
  return [
    { id: "c-1", sender: tutorName, senderRole: "tutor", text: `Let's start with today's ${subject} topic, question 3.`, time: "10:01 AM" },
    { id: "c-2", sender: studentLabel, senderRole: "student", text: "I don't understand step 2.", time: "10:02 AM" },
  ];
}

function buildFromStudentLesson(lesson: (typeof studentLessons)[number] | undefined): ClassroomSession | null {
  if (!lesson) return null;
  return {
    kind: "private",
    // Placeholder — overwritten by getClassroomSession() with the real `${kind}:${id}` value.
    classroomId: "",
    id: lesson.id,
    role: "student",
    bookingReference: buildBookingReference("private", lesson.id),
    subject: lesson.subject,
    title: lesson.subject,
    typeLabel: "Private Lesson",
    tutorName: lesson.tutor,
    tutorImage: lesson.tutorImage,
    studentName: dashboardStudent.name,
    studentImage: dashboardStudent.image,
    date: lesson.date,
    time: lesson.time,
    durationLabel: lesson.duration,
    durationMinutesNumeric: parseDurationMinutes(lesson.duration),
    mode: lesson.mode,
    materials: lesson.materials ?? [],
    participantCount: 2,
    participants: [
      participant({ id: "tutor", name: lesson.tutor, image: lesson.tutorImage, role: "tutor", isSelf: false }),
      participant({ id: "self", name: dashboardStudent.name, image: dashboardStudent.image, role: "student", isSelf: true }),
    ],
    chatSeed: buildChatSeed(lesson.tutor, dashboardStudent.name, lesson.subject),
    labApplies: labSubjectFor(lesson.subject) !== undefined,
    labSubject: labSubjectFor(lesson.subject),
    amountGross: parseNairaAmount(lesson.payment),
    // A legacy seed lesson predates the payment layer entirely — no
    // PaymentPlan will ever reference this id, so hasSessionAccess's own
    // "zero payment records for this booking" grandfather rule correctly
    // resolves this to true rather than needing a special case here.
    hasPaymentAccess: hasSessionAccess(lesson.id, lesson.id, dashboardStudent.name),
  };
}

function buildFromPrivateLesson(lesson: (typeof initialPrivateLessons)[number] | undefined): ClassroomSession | null {
  if (!lesson) return null;
  return {
    kind: "private",
    // Placeholder — overwritten by getClassroomSession() with the real `${kind}:${id}` value.
    classroomId: "",
    id: lesson.id,
    role: "tutor",
    bookingReference: lesson.bookingReference,
    subject: lesson.subject,
    title: lesson.subject,
    typeLabel: "Private Lesson",
    tutorName: dashboardTutor.name,
    tutorImage: dashboardTutor.image,
    studentName: lesson.student,
    date: lesson.date,
    time: lesson.time,
    durationLabel: lesson.duration,
    durationMinutesNumeric: parseDurationMinutes(lesson.duration),
    mode: lesson.mode === "Hybrid" ? "Physical" : lesson.mode,
    materials: lesson.materials ?? [],
    participantCount: 2,
    participants: [
      participant({ id: "self", name: dashboardTutor.name, image: dashboardTutor.image, role: "tutor", isSelf: true }),
      participant({ id: "student", name: lesson.student, role: "student", isSelf: false }),
    ],
    chatSeed: buildChatSeed(dashboardTutor.name, lesson.student, lesson.subject),
    labApplies: labSubjectFor(lesson.subject) !== undefined,
    labSubject: labSubjectFor(lesson.subject),
    amountGross: parseNairaAmount(lesson.price),
  };
}

// Real PrivateLesson records (booked through the actual booking flow) are
// invisible to studentLessons (the legacy sl-* seed) — this is the student-role
// sibling of buildFromPrivateLesson above (which is tutor-only), used as a
// fallback when a private lesson id isn't found in studentLessons.
function buildFromPrivateLessonAsStudent(lesson: (typeof initialPrivateLessons)[number] | undefined): ClassroomSession | null {
  if (!lesson) return null;
  const tutor = getTutorBySlug(lesson.tutorSlug);
  const tutorName = tutor?.name ?? lesson.tutorSlug;
  const tutorImage = tutor?.image ?? "/teacher-1.jpg.png";
  return {
    kind: "private",
    // Placeholder — overwritten by getClassroomSession() with the real `${kind}:${id}` value.
    classroomId: "",
    id: lesson.id,
    role: "student",
    bookingReference: lesson.bookingReference,
    subject: lesson.subject,
    title: lesson.subject,
    typeLabel: "Private Lesson",
    tutorName,
    tutorImage,
    studentName: dashboardStudent.name,
    studentImage: dashboardStudent.image,
    date: lesson.date,
    time: lesson.time,
    durationLabel: lesson.duration,
    durationMinutesNumeric: parseDurationMinutes(lesson.duration),
    mode: lesson.mode === "Hybrid" ? "Physical" : lesson.mode,
    materials: lesson.materials ?? [],
    participantCount: 2,
    participants: [
      participant({ id: "tutor", name: tutorName, image: tutorImage, role: "tutor", isSelf: false }),
      participant({ id: "self", name: dashboardStudent.name, image: dashboardStudent.image, role: "student", isSelf: true }),
    ],
    chatSeed: buildChatSeed(tutorName, dashboardStudent.name, lesson.subject),
    labApplies: labSubjectFor(lesson.subject) !== undefined,
    labSubject: labSubjectFor(lesson.subject),
    amountGross: parseNairaAmount(lesson.price),
    // The real entitlement check — bookingId matches exactly what
    // recordPayment/createSubscription used when this lesson was paid for
    // (private-booking-schedule.ts / tutor-review-client.tsx): the shared
    // multi-session bookingId when one exists, otherwise this lesson's own id.
    hasPaymentAccess: hasSessionAccess(lesson.bookingId ?? lesson.id, lesson.id, dashboardStudent.name),
  };
}

export function buildFromStudentGroupClass(gc: (typeof studentGroupClasses)[number] | undefined): ClassroomSession | null {
  if (!gc) return null;
  const otherCount = Math.max(0, gc.seatsFilled - 1);
  return {
    kind: "group",
    // Placeholder — overwritten by getClassroomSession() with the real `${kind}:${id}` value.
    classroomId: "",
    id: gc.id,
    role: "student",
    bookingReference: buildBookingReference("group", gc.id),
    subject: gc.subject,
    topic: gc.title,
    title: gc.title,
    typeLabel: "Group Class",
    tutorName: gc.tutor,
    tutorImage: gc.tutorImage,
    studentName: dashboardStudent.name,
    studentImage: dashboardStudent.image,
    date: gc.nextSessionDate,
    time: gc.schedule.split("· ")[1] ?? gc.nextClass,
    durationLabel: `${gc.durationMins} mins`,
    durationMinutesNumeric: gc.durationMins,
    mode: gc.mode,
    seatsLabel: `${gc.seatsFilled}/${gc.seatsTotal} students enrolled`,
    materials: groupClassResources,
    participantCount: gc.seatsFilled + 1,
    // Classmates' real names aren't shown to a fellow student here (same
    // privacy stance as the enrolled group-class detail page) — just the
    // tutor, "you", and how many others are in the room.
    participants: [
      participant({ id: "tutor", name: gc.tutor, image: gc.tutorImage, role: "tutor", isSelf: false }),
      participant({ id: "self", name: dashboardStudent.name, image: dashboardStudent.image, role: "student", isSelf: true }),
      ...(otherCount > 0
        ? [participant({ id: "others", name: `${otherCount} other student${otherCount === 1 ? "" : "s"}`, role: "student", isSelf: false })]
        : []),
    ],
    chatSeed: buildChatSeed(gc.tutor, dashboardStudent.name, gc.subject),
    labApplies: labSubjectFor(gc.subject) !== undefined,
    labSubject: labSubjectFor(gc.subject),
    amountGross: gc.pricePerSession,
    // Same "which session is due" resolution the dashboard's own
    // NextSessionCard/SessionsCard use (student-group-class-detail-client.tsx)
    // — the classroom is one persistent room per enrollment, so entry is
    // gated on whichever occurrence is currently due, not a specific date.
    hasPaymentAccess: hasSessionAccess(
      gc.id,
      `${gc.id}-session-${(gc.sessions.find((s) => s.status !== "Completed") ?? gc.sessions.at(-1))?.sessionNumber ?? 1}`,
      dashboardStudent.name
    ),
  };
}

export function buildFromMyGroupClass(gc: (typeof initialMyGroupClasses)[number] | undefined): ClassroomSession | null {
  if (!gc) return null;
  return {
    kind: "group",
    // Placeholder — overwritten by getClassroomSession() with the real `${kind}:${id}` value.
    classroomId: "",
    id: gc.id,
    role: "tutor",
    bookingReference: buildBookingReference("group", gc.id),
    subject: gc.subject,
    topic: gc.title,
    title: gc.title,
    typeLabel: "Group Class",
    tutorName: dashboardTutor.name,
    tutorImage: dashboardTutor.image,
    date: gc.schedule.split("· ")[0]?.trim() ?? gc.schedule,
    time: gc.schedule.split("· ")[1] ?? "",
    durationLabel: gc.durationMinutes ? `${gc.durationMinutes} mins` : "",
    durationMinutesNumeric: gc.durationMinutes ?? 60,
    mode: gc.mode,
    seatsLabel: `${gc.seatsFilled}/${gc.seatsTotal} students enrolled`,
    materials: groupClassResources,
    participantCount: gc.students.length + 1,
    participants: [
      participant({ id: "self", name: dashboardTutor.name, image: dashboardTutor.image, role: "tutor", isSelf: true }),
      ...gc.students.slice(0, 8).map((s, i) => participant({ id: `student-${i}`, name: s.name, role: "student", isSelf: false })),
    ],
    chatSeed: buildChatSeed(dashboardTutor.name, gc.students[0]?.name ?? "Student", gc.subject),
    labApplies: labSubjectFor(gc.subject) !== undefined,
    labSubject: labSubjectFor(gc.subject),
    amountGross: gc.price,
  };
}

// The student-role sibling of buildFromMyGroupClass, used as a fallback when
// a group class id isn't found in studentGroupClasses (the student's own,
// separate seed array — same "two independently-authored seed lists" gap
// buildFromPrivateLessonAsStudent already covers for private lessons). Without
// this, a student route for a tutor-side id (e.g. "gc-1") 404s outright,
// which means classroomId (built as `${kind}:${id}` from EACH side's own id)
// can never match between a tutor's and a student's tab for the same class —
// the real reason a Group Class's live video mesh only ever showed the tutor:
// the "student" side was never actually reaching the same BroadcastChannel/
// Supabase room, not a bug in the grid/mesh rendering itself.
export function buildFromMyGroupClassAsStudent(gc: (typeof initialMyGroupClasses)[number] | undefined): ClassroomSession | null {
  if (!gc) return null;
  // Deliberately no hasPaymentAccess check here: MyGroupClass (the tutor's
  // own shape, used only as this function's fallback source) has no
  // sessions[] array, so there's no real per-session id to check against —
  // guessing one would risk false-locking out an actually-paying student
  // (worse than the status quo) rather than genuinely enforcing anything.
  // buildFromStudentGroupClass above (the primary, common path) has the
  // real check; this fallback only exists for the edge case described below.
  return {
    kind: "group",
    // Placeholder — overwritten by getClassroomSession() with the real `${kind}:${id}` value.
    classroomId: "",
    id: gc.id,
    role: "student",
    bookingReference: buildBookingReference("group", gc.id),
    subject: gc.subject,
    topic: gc.title,
    title: gc.title,
    typeLabel: "Group Class",
    tutorName: dashboardTutor.name,
    tutorImage: dashboardTutor.image,
    studentName: dashboardStudent.name,
    studentImage: dashboardStudent.image,
    date: gc.schedule.split("· ")[0]?.trim() ?? gc.schedule,
    time: gc.schedule.split("· ")[1] ?? "",
    durationLabel: gc.durationMinutes ? `${gc.durationMinutes} mins` : "",
    durationMinutesNumeric: gc.durationMinutes ?? 60,
    mode: gc.mode,
    seatsLabel: `${gc.seatsFilled}/${gc.seatsTotal} students enrolled`,
    materials: groupClassResources,
    participantCount: gc.students.length + 1,
    // Same privacy stance as buildFromStudentGroupClass — classmates
    // collapsed into one honest count rather than named/streamed.
    participants: [
      participant({ id: "tutor", name: dashboardTutor.name, image: dashboardTutor.image, role: "tutor", isSelf: false }),
      participant({ id: "self", name: dashboardStudent.name, image: dashboardStudent.image, role: "student", isSelf: true }),
      ...(gc.students.length > 0
        ? [participant({ id: "others", name: `${gc.students.length} other student${gc.students.length === 1 ? "" : "s"}`, role: "student", isSelf: false })]
        : []),
    ],
    chatSeed: buildChatSeed(dashboardTutor.name, dashboardStudent.name, gc.subject),
    labApplies: labSubjectFor(gc.subject) !== undefined,
    labSubject: labSubjectFor(gc.subject),
    amountGross: gc.price,
  };
}

// Exported (unlike every other buildFrom* here) specifically so
// DiscoveryClassroomClient can build a ClassroomSession straight from a
// DiscoverySession it already has in hand — via useAllDiscoverySessions(),
// which is hydration-safe — instead of going through resolveClassroomSession
// -> getAllDiscoverySessions(), a plain function call that reads real
// localStorage the instant it's called client-side. Calling that during a
// client component's very first (hydration-matching) render would return
// the real runtime-booked session client-side while the server's
// prerendered HTML still shows "not found," a genuine hydration mismatch —
// not just a cosmetic one, since the two renders differ in DOM shape.
export function buildFromDiscovery(role: ClassroomRole, session: DiscoverySession | undefined): ClassroomSession | null {
  if (!session) return null;
  return {
    kind: "discovery",
    // Placeholder — overwritten by getClassroomSession() with the real `${kind}:${id}` value.
    classroomId: "",
    id: session.id,
    role,
    bookingReference: session.bookingReference,
    subject: session.subject,
    title: "Discovery Session",
    typeLabel: "Discovery Session",
    tutorName: session.tutor,
    tutorImage: session.tutorImage,
    studentName: session.student,
    studentImage: session.studentImage,
    date: session.date,
    time: session.time,
    durationLabel: `${session.durationMins} min`,
    durationMinutesNumeric: session.durationMins,
    // A real wall-clock end time (set at booking) drives a genuine hard
    // stop for Discovery Classes specifically — see useLessonCountdown.
    // Undefined for the older hardcoded seed records, which fall back to
    // the ordinary "count down from N minutes after mount" behavior.
    scheduledEndAtISO: session.scheduledEndAtISO,
    mode: "Online",
    materials: session.materials ?? [],
    participantCount: 2,
    participants: [
      participant({ id: "tutor", name: session.tutor, image: session.tutorImage, role: "tutor", isSelf: role === "tutor" }),
      participant({ id: "student", name: session.student, image: session.studentImage, role: "student", isSelf: role === "student" }),
    ],
    chatSeed: buildChatSeed(session.tutor, session.student, session.subject),
    // Discovery sessions are deliberately kept lighter — no Lab regardless of subject.
    labApplies: false,
    // Discovery sessions are free — no escrow/confirmation flow applies.
    amountGross: 0,
  };
}

// Benny always plays the "tutor" role slot here (there's no third role in
// the classroom system for a single counsellor persona) — but either side
// can be the viewer, so `role` picks which participant is "self".
function buildFromCounsellingAppointment(role: ClassroomRole, appointment: (typeof initialCounsellingAppointments)[number] | undefined): ClassroomSession | null {
  if (!appointment) return null;
  return {
    kind: "counselling",
    // Placeholder — overwritten by getClassroomSession() with the real `${kind}:${id}` value.
    classroomId: "",
    id: appointment.id,
    role,
    bookingReference: formatCounsellingDisplayId(appointment.id),
    subject: "Counselling Session",
    title: "Counselling Session",
    typeLabel: "Counselling Session",
    tutorName: counsellor.name,
    tutorImage: counsellor.image,
    studentName: appointment.student,
    studentImage: appointment.studentImage,
    date: appointment.dateLabel,
    time: appointment.time,
    durationLabel: `${appointment.durationMinutes} min`,
    durationMinutesNumeric: appointment.durationMinutes,
    mode: "Online",
    materials: [],
    participantCount: 2,
    participants: [
      participant({ id: "self", name: counsellor.name, image: counsellor.image, role: "tutor", isSelf: role === "tutor" }),
      participant({ id: "student", name: appointment.student, image: appointment.studentImage, role: "student", isSelf: role === "student" }),
    ],
    chatSeed: [],
    // Counselling is video + screen share + chat only — no whiteboard/lab.
    labApplies: false,
    // Counselling sessions aren't billed per-session in this app — no escrow flow.
    amountGross: 0,
  };
}

function resolveClassroomSession(role: ClassroomRole, kind: ClassroomKind, id: string): ClassroomSession | null {
  if (kind === "counselling") return buildFromCounsellingAppointment(role, initialCounsellingAppointments.find((a) => a.id === id));
  if (kind === "discovery") return buildFromDiscovery(role, getAllDiscoverySessions().find((d) => d.id === id));
  if (role === "student") {
    if (kind === "private") {
      return buildFromStudentLesson(studentLessons.find((l) => l.id === id)) ?? buildFromPrivateLessonAsStudent(getPrivateLessons().find((l) => l.id === id));
    }
    return buildFromStudentGroupClass(studentGroupClasses.find((c) => c.id === id)) ?? buildFromMyGroupClassAsStudent(initialMyGroupClasses.find((c) => c.id === id));
  }
  // A tutor's own real, runtime-booked lesson (created via addPrivateLesson)
  // only exists in getPrivateLessons() — initialPrivateLessons alone is the
  // static seed and would never contain it, which is exactly what made a
  // real booking's tutor-side classroom 404 regardless of when this
  // function ran (a Server Component's SSR pass or a client re-resolve both
  // hit this same gap). Checked as a fallback, same shape as the student
  // branch's own real-data fallback above.
  if (kind === "private") return buildFromPrivateLesson(initialPrivateLessons.find((l) => l.id === id) ?? getPrivateLessons().find((l) => l.id === id));
  return buildFromMyGroupClass(initialMyGroupClasses.find((c) => c.id === id));
}

export function getClassroomSession(role: ClassroomRole, kind: ClassroomKind, id: string): ClassroomSession | null {
  const session = resolveClassroomSession(role, kind, id);
  // classroomId is assigned here, once, from the caller's own kind/id
  // rather than inside each builder above — every builder already sets
  // `id: <the same lesson's own id>`, so `${kind}:${id}` is guaranteed
  // identical whether it's the tutor's or the student's independent render
  // of the same lesson resolving it.
  return session ? { ...session, classroomId: `${kind}:${id}` } : null;
}
