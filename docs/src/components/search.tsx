'use client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  TagsList,
  TagsListItem,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { packages } from '@/lib/services/packages.service';

// `staticClient` only applies its own base path to the *default* endpoint; an explicit `from` is used
// verbatim. So this one has to carry the prefix itself.
const searchIndexUrl = '/api/search.json';

/**
 * Search is filtered by the folder a page sits in, which is the same string as the package's slug.
 * The introduction sits above them all and belongs to no package, so it carries no tag and shows up
 * only in an unfiltered search.
 */
const searchTags = packages.map((pkg) => ({ value: pkg.slug, label: pkg.title }));
const tagValues = new Set(searchTags.map((tag) => tag.value));

/**
 * `/docs/expo-devtools/network` -> `expo-devtools`. The docs sit under their own segment now, so
 * the slug is the second one, not the first. Reading the first returned "docs" and matched no tag.
 */
function packageFromPathname(pathname: string): string | undefined {
  const [, first, second] = pathname.split('/');
  const slug = first === 'docs' ? second : first;
  if (!slug) return undefined;
  return tagValues.has(slug) ? slug : undefined;
}

export default function StaticSearchDialog(props: SharedProps) {
  const pathname = usePathname();
  const currentPackage = packageFromPathname(pathname);

  // Opening search inside a package searches that package. Clearing the tag searches everything,
  // which is the right default only when you are not already reading one.
  //
  // Adjusted during render rather than in an effect: an effect would render once with the previous
  // package's tag, then again with this one, and the first of those two renders would run a query.
  const [tag, setTag] = useState(currentPackage);
  const [tagFor, setTagFor] = useState(currentPackage);
  if (tagFor !== currentPackage) {
    setTagFor(currentPackage);
    setTag(currentPackage);
  }

  // `useDocsSearch` keys its effect on `client.deps`, which is a fresh array on every
  // `staticClient()` call — an unmemoized client re-runs the query on every render.
  const client = useMemo(() => staticClient({ from: searchIndexUrl, tag }), [tag]);
  const { search, setSearch, query } = useDocsSearch({ client });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        <SearchDialogFooter>
          <TagsList tag={tag} onTagChange={setTag} allowClear>
            {searchTags.map((item) => (
              <TagsListItem key={item.value} value={item.value}>
                {item.label}
              </TagsListItem>
            ))}
          </TagsList>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
