import Image from "next/image";
import { Calendar, MessageSquare, PhoneCall, Radio, Video, Wallet2 } from "lucide-react";

const items = [
  { icon: PhoneCall, label: "Teach from your phone" },
  { icon: Video, label: "Join your virtual classroom" },
  { icon: MessageSquare, label: "Message students" },
  { icon: Calendar, label: "Manage your schedule" },
  { icon: Radio, label: "Manage lessons" },
  { icon: Wallet2, label: "Track your earnings" },
];

export function PhoneFirstTeaching() {
  return (
    <section className="bg-ensena-bg-soft py-20">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="order-2 flex justify-center lg:order-1">
          <div className="relative w-56 rounded-[2.5rem] border-4 border-ensena-ink bg-ensena-ink p-2 shadow-2xl">
            <div className="overflow-hidden rounded-[2rem] bg-white">
              <div className="flex items-center justify-between bg-ensena-ink px-3 py-2">
                <span className="text-[10px] font-medium text-white">Mathematics · SS2</span>
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-semibold text-white">End</span>
              </div>
              <div className="flex h-64 flex-col justify-center gap-2 bg-white px-4 font-mono text-sm text-ensena-ink">
                <p>2x + 5 = 15</p>
                <p>2x = 15 - 5</p>
                <p>2x = 10</p>
                <p className="font-semibold text-ensena-primary">x = 5</p>
              </div>
              <div className="flex items-center gap-2 border-t border-ensena-border p-2.5">
                <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
                  <Image src="/teacher-2.jpg.png" alt="Tutor teaching from her phone" fill sizes="32px" className="object-cover" />
                </div>
                <span className="text-[10px] text-ensena-muted">Live · Sarah K.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <span className="inline-block rounded-full bg-ensena-primary/10 px-3 py-1 text-xs font-semibold text-ensena-primary">
            TEACH ANYWHERE
          </span>
          <h2 className="mt-3 font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
            Your phone can be your classroom.
          </h2>
          <p className="mt-4 text-ensena-muted">
            No laptop? No problem. Teach, meet students, manage lessons and stay connected directly
            from your phone.
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm text-ensena-ink">
                <item.icon className="size-4 shrink-0 text-ensena-primary" /> {item.label}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-ensena-muted">
            Your phone, your schedule and your knowledge are enough to get started.
          </p>
        </div>
      </div>
    </section>
  );
}
