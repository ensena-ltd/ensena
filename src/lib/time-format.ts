// Converts a 12-hour display string ("10:00 AM") to the 24-hour value
// required by <input type="time"> ("10:00").
export function to24HourValue(time12h: string): string {
  const match = time12h.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:00";
  let hours = Number(match[1]);
  const minutes = match[2];
  const modifier = match[3].toUpperCase();
  if (modifier === "AM" && hours === 12) hours = 0;
  if (modifier === "PM" && hours !== 12) hours += 12;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

// Converts a 24-hour <input type="time"> value ("22:00") back to the
// 12-hour display string ("10:00 PM") used throughout the UI.
export function to12HourDisplay(time24h: string): string {
  const [hoursStr, minutes] = time24h.split(":");
  let hours = Number(hoursStr);
  const modifier = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${modifier}`;
}
