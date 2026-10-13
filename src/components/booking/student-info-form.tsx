import { Mail, Phone, User } from "lucide-react";

import { Input } from "@/components/ui/input";

export interface StudentInfoValues {
  fullName: string;
  email: string;
  phone: string;
}

// Pre-filled from the logged-in student's account so they never have to
// re-enter information Ensena already has, per the reference design.
export function studentInfoDefaults(name: string): StudentInfoValues {
  const firstName = name.split(" ")[0].toLowerCase();
  const lastName = name.split(" ").slice(1).join("").toLowerCase();
  return {
    fullName: name,
    email: `${firstName}${lastName}@gmail.com`,
    phone: "801 234 5678",
  };
}

export function StudentInfoForm({
  values,
  onChange,
}: {
  values: StudentInfoValues;
  onChange: (values: StudentInfoValues) => void;
}) {
  return (
    <div className="rounded-2xl border border-ensena-border p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Student information</h2>
      <p className="mt-1 text-xs text-ensena-muted">This is the information we will use for your booking and receipts.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-ensena-muted">Full name</label>
          <div className="mt-1 flex h-11 items-center gap-2 rounded-xl border border-ensena-border px-3">
            <User className="size-4 shrink-0 text-ensena-muted" />
            <Input
              value={values.fullName}
              onChange={(e) => onChange({ ...values, fullName: e.target.value })}
              className="h-auto border-0 p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ensena-muted">Email address</label>
          <div className="mt-1 flex h-11 items-center gap-2 rounded-xl border border-ensena-border px-3">
            <Mail className="size-4 shrink-0 text-ensena-muted" />
            <Input
              type="email"
              value={values.email}
              onChange={(e) => onChange({ ...values, email: e.target.value })}
              className="h-auto border-0 p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 sm:w-1/2 sm:pr-2">
        <label className="text-xs font-medium text-ensena-muted">Phone number</label>
        <div className="mt-1 flex h-11 items-center gap-2 rounded-xl border border-ensena-border px-3">
          <Phone className="size-4 shrink-0 text-ensena-muted" />
          <span className="shrink-0 text-sm text-ensena-ink">🇳🇬 +234</span>
          <Input
            type="tel"
            value={values.phone}
            onChange={(e) => onChange({ ...values, phone: e.target.value })}
            className="h-auto border-0 p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  );
}
