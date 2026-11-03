import Link from 'next/link';
import { AiUsagePanel } from '@/components/ai-usage-panel';
import { InstallChip } from '@/components/copy-button';
import { content } from '@/lib/services/content.service';
import { Prose } from '@/components/prose';

/** The problem an agent has with a phone, the commands that answer it, and the skills. */
export function AgentSection() {
  const { agent } = content;

  return (
    <section aria-labelledby="agent-title" className="border-t px-5 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-20">
        <div>
          <h2
            id="agent-title"
            className="text-center text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] leading-tight font-semibold tracking-[-0.03em] text-balance lg:text-start"
          >
            {agent.title}
          </h2>
          <p className="mt-6 max-w-[62ch] border-s-2 ps-4 text-[1.0625rem] leading-relaxed text-fd-muted-foreground text-pretty">
            {agent.scene}
          </p>
          <p className="mt-5 max-w-[62ch] text-[1.0625rem] leading-relaxed text-pretty">{agent.answer}</p>

          <ol className="mt-10 space-y-6">
            {agent.steps.map((step, i) => (
              <li key={step.command} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
                <span aria-hidden="true" className="pt-px font-mono text-sm text-fd-primary tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <code className="font-mono text-[0.8125rem] font-medium [overflow-wrap:anywhere]">
                    {step.command}
                  </code>
                  <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-fd-muted-foreground">
                    <Prose text={step.text} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:pt-3">
          <AiUsagePanel />
          <h3 className="mt-7 text-[1.0625rem] font-semibold tracking-tight">{agent.usage.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">{agent.usage.body}</p>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-6xl rounded-xl border bg-fd-card p-6 sm:p-8">
        <h3 className="text-[1.0625rem] font-semibold tracking-tight">{agent.skills.title}</h3>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-fd-muted-foreground">{agent.skills.body}</p>
        <InstallChip command={agent.skills.command} label="Copy the skills command" />
        <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {agent.links.map((link) => (
            <Link key={link.href} href={link.href} className="font-medium text-fd-primary underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
        </p>
      </div>
    </section>
  );
}
