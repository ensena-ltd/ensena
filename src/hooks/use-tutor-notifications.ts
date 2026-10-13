"use client";

import { useSyncExternalStore } from "react";

import {
  dismissTutorNotification,
  getTutorNotifications,
  markAllTutorNotificationsRead,
  markTutorNotificationRead,
  subscribeTutorNotifications,
  type TutorNotification,
} from "@/lib/tutor-notifications-store";

// Server snapshot pinned to a fixed empty array (there's no seed data to
// pin to, unlike the student side) so the server render and the client's
// first render agree exactly — same hydration-safety reasoning as
// use-student-notifications.ts.
const EMPTY: TutorNotification[] = [];
function getServerSnapshot(): TutorNotification[] {
  return EMPTY;
}

export function useTutorNotifications() {
  const notifications = useSyncExternalStore(subscribeTutorNotifications, getTutorNotifications, getServerSnapshot);
  return {
    notifications,
    markRead: markTutorNotificationRead,
    markAllRead: markAllTutorNotificationsRead,
    dismiss: dismissTutorNotification,
  };
}
