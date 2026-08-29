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
import { useEffect, useMemo, useState } from 'react';
import { searchTags } from '@/lib/packages';

// Empty on the current deployment, which serves from a domain root. It is built by hand anyway
// because fumadocs reads its own base path from `import.meta.env.BASE_URL`, a Vite convention Next
// does not set — so the day the site moves under a subpath, this would silently fetch the index from
// the wrong origin and every search would come back empty.
const searchIndexUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/search.json`;

const tagValues = new Set(searchTags.map((tag) => tag.value));

/** `/docs/expo-devtools/network` → `expo-devtools`. `usePathname` already excludes the base path. */
function packageFromPathname(pathname: string): string | undefined {
  const [, docs, slug] = pathname.split('/');
  if (docs !== 'docs' || !slug) return undefined;
  return tagValues.has(slug) ? slug : undefined;
}

export default function StaticSearchDialog(props: SharedProps) {
  const pathname = usePathname();
  const currentPackage = packageFromPathname(pathname);

  // Opening search inside a package searches that package. Clearing the tag searches everything,
  // which is the right default only when you are not already reading one.
  const [tag, setTag] = useState(currentPackage);
  useEffect(() => {
    setTag(currentPackage);
  }, [currentPackage]);

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
