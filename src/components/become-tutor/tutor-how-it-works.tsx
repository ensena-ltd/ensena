const steps = [
  {
    n: "01",
    title: "CREATE YOUR PROFILE",
    desc: "Tell students what you teach, your experience and your availability.",
  },
  {
    n: "02",
    title: "GET DISCOVERED",
    desc: "Students find you through subjects, academic levels, exams, languages and research areas.",
  },
  {
    n: "03",
    title: "TEACH & GROW",
    desc: "Manage your lessons, students and earnings through Ensena.",
  },
];

export function TutorHowItWorks() {
  return (
    <section id="how-it-works" className="bg-ensena-bg-soft py-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
          How It Works
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="text-center">
              <p className="font-heading text-3xl font-semibold text-ensena-primary/25">{step.n}</p>
              <p className="mt-2 text-sm font-semibold tracking-wide text-ensena-ink">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ensena-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
