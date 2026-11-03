import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getMDXComponents } from '@/components/mdx';
import type { Post } from '@/lib/source';
import { formatDate } from '@/lib/utils/format-date.util';

export function BlogPost({ post }: { post: Post }) {
  const MDX = post.data.body;

  return (
    <main className="mx-auto w-full max-w-[44rem] flex-1 px-5 pt-10 pb-24 md:pt-14">
      <Link
        href="/blog/"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
      >
        <ArrowLeft className="size-4" />
        Blog
      </Link>
      <header className="mt-10 border-b pb-8">
        <p className="text-sm text-fd-muted-foreground">
          <time dateTime={post.data.date}>{formatDate(new Date(`${post.data.date}T00:00:00`))}</time>,
          by {post.data.author}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,1.4rem+2vw,3rem)] leading-tight font-semibold tracking-[-0.03em] text-balance">
          {post.data.title}
        </h1>
        <p className="mt-4 text-lg text-fd-muted-foreground text-pretty">{post.data.description}</p>
      </header>
      {post.data.image && (
        // The site is a static export with no image optimiser, so next/image would add nothing here.
        // oxlint-disable-next-line nextjs/no-img-element
        <img src={post.data.image} alt="" className="mt-8 w-full rounded-lg border" />
      )}
      <article className="prose mt-8">
        <MDX components={getMDXComponents()} />
      </article>
    </main>
  );
}
