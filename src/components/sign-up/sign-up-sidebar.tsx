export const signupSteps = [
  { title: "Basic Information", description: "Create your account" },
  { title: "Teaching Profile", description: "Tell students what you teach" },
  { title: "Qualification", description: "Help Ensena verify and match you" },
  { title: "Teaching Setup", description: "Set your rate, availability and bio" },
] as const;

export function SignUpSidebar({ currentStep }: { currentStep: number }) {
  const current = signupSteps[currentStep - 1];
  return (
    <aside className="w-full shrink-0 lg:w-64">
      <h1 className="font-heading text-lg font-semibold text-ensena-ink">Become a Tutor</h1>
      <p className="mt-1 text-sm text-ensena-muted">Create your tutor profile in 4 simple steps</p>
      {current && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ensena-primary">{current.title}</p>
          <p className="mt-0.5 text-xs text-ensena-muted">{current.description}</p>
        </div>
      )}
    </aside>
  );
}
