// Age checks for date-of-birth fields ("YYYY-MM-DD" strings from
// <input type="date">). Tutors must be at least TUTOR_MIN_AGE.
export const TUTOR_MIN_AGE = 18;

export function ageOn(dob: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age;
}

export function isAtLeastAge(dob: string, minAge: number): boolean {
  const age = ageOn(dob);
  return age !== null && age >= minAge;
}

/** Latest date of birth that is still `minAge` today — for the input's `max`. */
export function latestDobForAge(minAge: number, today = new Date()): string {
  const d = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const TUTOR_AGE_MESSAGE = `You must be at least ${TUTOR_MIN_AGE} years old to teach on Ensena.`;
