import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getReleases } from '@/lib/services/blog-entries.service';
import { documented } from '@/lib/services/packages.service';
import { getPosts } from '@/lib/source';
import { formatDate } from '@/lib/utils/format-date.util';

/** The blog's index: every post, newest first, then the way to the release notes. */
export function BlogIndex() {
  const posts = getPosts();
  const count = getReleases().length;
  // Release notes live in each library's docs now, so the button goes to the only one that ships.
  // With more than one there is no single page to send people to, so it falls back to the index.
  const href = documented.length === 1 ? `${documented[0].docsHref}changelog/` : '/docs/';
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-20">
      <h1 className="text-[clamp(2rem,1.4rem+2vw,3rem)] leading-tight font-semibold tracking-[-0.03em]">Blog</h1>
      <p className="mt-4 text-fd-muted-foreground text-pretty">
        Writing about the libraries and how they are built.
      </p>
      {posts.length === 0 ? (
        <p className="mt-12 text-fd-muted-foreground">Nothing written yet.</p>
      ) : (
        <ol className="mt-12 border-t">
          {posts.map((post) => (
            <li key={post.url} className="grid gap-x-8 gap-y-2 border-b py-8 sm:grid-cols-[8rem_1fr]">
              <time dateTime={post.data.date} className="pt-1 text-sm text-fd-muted-foreground tabular-nums">
                {formatDate(new Date(`${post.data.date}T00:00:00`))}
              </time>
              <div>
                <h2 className="text-xl leading-snug font-semibold tracking-[-0.01em] text-balance">
                  <Link href={post.url} className="transition-colors hover:text-fd-primary">
                    {post.data.title}
                  </Link>
                </h2>
                <p className="mt-2 text-fd-muted-foreground text-pretty">{post.data.description}</p>
                <p className="mt-3 text-sm text-fd-muted-foreground">By {post.data.author}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-fd-card p-6">
        <p className="text-fd-muted-foreground">Release notes for every version are in the changelog.</p>
        <Link
          href={href}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fd-primary px-5 text-sm font-medium text-fd-primary-foreground"
        >
          Read the changelog
          <span className="rounded-full bg-fd-primary-foreground/15 px-2 py-0.5 text-xs tabular-nums">{count}</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </main>
  );
}
