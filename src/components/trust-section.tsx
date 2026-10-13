import { trustFeatures } from "@/lib/data";

export function TrustSection() {
  return (
    <section className="mx-auto hidden max-w-[1240px] px-4 py-20 sm:px-6 lg:block lg:px-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {trustFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex flex-col items-start gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="font-heading text-base font-semibold text-ensena-ink">
                {feature.title}
              </h3>
              <p className="text-sm text-ensena-muted">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
