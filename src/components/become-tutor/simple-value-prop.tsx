import { Users2, Video, Wallet2 } from "lucide-react";

const items = [
  {
    icon: Users2,
    title: "FIND STUDENTS",
    desc: "Get discovered by students looking for what you teach.",
  },
  {
    icon: Video,
    title: "TEACH YOUR WAY",
    desc: "Offer private lessons or create group classes.",
  },
  {
    icon: Wallet2,
    title: "GET PAID",
    desc: "Manage bookings, lessons and earnings from one place.",
  },
];

export function SimpleValueProp() {
  return (
    <section className="bg-ensena-bg-soft py-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
          You teach. Ensena handles the rest.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-white text-ensena-primary shadow-sm">
                <item.icon className="size-5" strokeWidth={1.75} />
              </span>
              <p className="mt-4 text-xs font-semibold tracking-wide text-ensena-ink">{item.title}</p>
              <p className="mt-1.5 max-w-[220px] text-sm leading-relaxed text-ensena-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
