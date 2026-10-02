import { Icon } from '@/components/icon';
import { content } from '@/lib/services/content.service';

export function Principles() {
  return (
    <section className="px-5 py-24">
      <div className="reveal mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-tight font-semibold tracking-tight text-balance">
            {content.principles.title}
          </h2>
          <p className="mt-4 text-fd-muted-foreground text-pretty">{content.principles.body}</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {content.principles.items.map((item) => (
            <div key={item.title} className="rounded-lg border bg-fd-card p-6">
              <Icon name={item.icon} className="size-5 text-fd-primary" />
              <h3 className="mt-4 mb-1.5 text-[1.0625rem] font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-fd-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
