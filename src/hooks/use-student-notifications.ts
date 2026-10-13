"use client";

import { useSyncExternalStore } from "react";

import { studentNotifications, type StudentNotification } from "@/lib/student-dashboard-data";
import {
  dismissStudentNotification,
  getStudentNotifications,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
  subscribeStudentNotifications,
} from "@/lib/notifications-store";

// Server snapshot pinned to the literal seed array (not a live localStorage
// read) so the server render and the client's first render agree exactly —
// same hydration-safety reasoning as use-lesson-confirmations.ts.
function getServerSnapshot(): StudentNotification[] {
  return studentNotifications;
}

export function useStudentNotifications() {
  const notifications = useSyncExternalStore(subscribeStudentNotifications, getStudentNotifications, getServerSnapshot);
  return {
    notifications,
    markRead: markStudentNotificationRead,
    markAllRead: markAllStudentNotificationsRead,
    dismiss: dismissStudentNotification,
  };
}
