/** The one heading style every landing section uses: left-aligned, the title and an optional line. */
export function SectionHeading({ id, title, body }: { id: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <h2
        id={id}
        className="text-[clamp(1.75rem,1.2rem+2vw,2.5rem)] leading-tight font-semibold tracking-[-0.03em] text-balance"
      >
        {title}
      </h2>
      {body && <p className="mt-4 leading-relaxed text-fd-muted-foreground text-pretty">{body}</p>}
    </div>
  );
}
