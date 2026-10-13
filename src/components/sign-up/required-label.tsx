export function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-ensena-ink">
      {children} <span className="text-ensena-primary">*</span>
    </span>
  );
}

export function OptionalLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-ensena-ink">
      {children} <span className="font-normal text-ensena-muted">· Optional</span>
    </span>
  );
}
