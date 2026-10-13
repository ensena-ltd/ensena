import Image from "next/image";

const toolbarButtons = [
  "Draw & write",
  "Pen & highlighter",
  "Shapes & text",
  "Upload images",
  "Undo / Redo",
  "Clear board",
  "Multiple pages",
  "Zoom",
];

export function VirtualClassroom() {
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <span className="inline-block rounded-full bg-ensena-primary/10 px-3 py-1 text-xs font-semibold text-ensena-primary">
            VIRTUAL CLASSROOM
          </span>
          <h2 className="mt-3 font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
            Everything you need to teach online.
          </h2>
          <p className="mt-4 text-ensena-muted">
            Teach from your phone or computer with a virtual classroom built for real lessons.
          </p>
          <p className="mt-4 font-heading text-lg font-semibold text-ensena-ink">
            Explain. Demonstrate. Practice together.
          </p>
          <p className="mt-4 text-sm text-ensena-muted">
            You decide when a student can write on the board, so the lesson stays on track.
          </p>
        </div>

        <div className="rounded-3xl border border-ensena-border bg-ensena-surface p-4 shadow-[0_30px_80px_-30px_rgba(17,24,39,0.25)] sm:p-5">
          <div className="flex items-center justify-between rounded-t-xl bg-ensena-ink px-3 py-2">
            <span className="text-xs font-medium text-white">Mathematics · Area of a Triangle</span>
            <div className="flex -space-x-2">
              <div className="relative size-6 overflow-hidden rounded-full border-2 border-ensena-ink">
                <Image src="/teacher-3.jpg.png" alt="Tutor on the whiteboard" fill sizes="24px" className="object-cover" />
              </div>
              <div className="relative size-6 overflow-hidden rounded-full border-2 border-ensena-ink">
                <Image src="/teacher-4.jpg.png" alt="Student on the whiteboard" fill sizes="24px" className="object-cover" />
              </div>
            </div>
          </div>
          <div className="relative flex h-56 items-center justify-center rounded-b-none border-x border-ensena-border bg-ensena-bg-soft px-6 font-mono text-sm text-ensena-ink">
            <div className="text-center">
              <p className="text-xs text-ensena-muted">Area of a Triangle</p>
              <p className="mt-2 text-lg font-semibold">A = ½ b h</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-b-xl border border-t-0 border-ensena-border p-2.5">
            {toolbarButtons.map((tool) => (
              <span key={tool} className="rounded-full border border-ensena-border px-2.5 py-1 text-[10px] font-medium text-ensena-muted">
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
