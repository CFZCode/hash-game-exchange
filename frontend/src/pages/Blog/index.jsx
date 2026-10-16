import React from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../../components/shared/Pagination';
import Skeleton from '../../components/shared/Skeleton';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import { getBlogFeed } from '../../services/blog';
import { useResource } from '../../hooks/useResource';
import { formatBlogDate } from './format';
import './Blog.css';

/* `/blog` — the site's own blog.
 *
 * A DELIBERATE DEPARTURE, on the user's request (see .claude/skills/hash-ui-fidelity, "Deliberate
 * departures"): bc.game's Blog is an external site (blog.bc.game) with no page in this UI to copy,
 * so this page is this build's own, assembled from the site's primitives — the Promotions page's
 * heading, `tabs-title` strip and card grid, `Pagination`, `Skeleton` and `EmptyPlaceholder` — so it
 * reads as native. Its shape follows blog.bc.game's: category tabs over a grid of cover cards, each
 * opening an article page (`./Post.jsx`).
 *
 * Posts are written in the site admin (Content → Blogs) and the page is switched by the OWNER's
 * `blog` feature (services/gates.js). With the feature off the route redirects home; a refusal that
 * still gets through (403 NOT_ENTITLED) reads as no posts and draws the empty state below. */

function BlogCard({ post }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-fourth/10 bg-alw_white sm:rounded-2xl dark:bg-card_dark"
    >
      <div className="blog-cover aspect-video w-full overflow-hidden bg-layer5">
        {post.image && <img className="size-full object-cover transition-transform duration-300 group-hover:scale-105" alt="" src={post.image} loading="lazy" />}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {post.category && (
          <span className="mb-2 flex h-[22px] w-fit items-center rounded-md bg-white_alpha5 px-2 text-[10px] font-semibold uppercase text-secondary">
            {post.category}
          </span>
        )}
        <div className="line-clamp-2 text-base font-extrabold leading-6 text-primary">{post.title}</div>
        {post.summary && <div className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-tertiary">{post.summary}</div>}
        <div className="mt-auto pt-3 text-xs font-normal text-tertiary">{formatBlogDate(post.date)}</div>
      </div>
    </Link>
  );
}

const GRID = 'mt-3 grid grid-cols-1 gap-2 sm:gap-x-4 sm:gap-y-8 md:grid-cols-2 lg:grid-cols-3';

export default function Blog() {
  const [category, setCategory] = React.useState('');
  const [page, setPage] = React.useState(1);

  const read = React.useCallback(() => getBlogFeed({ page, category }), [page, category]);
  const { data, loading } = useResource(read);

  const posts = data?.posts ?? [];
  const pages = data?.pages ?? 1;
  /* Kept across reads, so the strip does not blink empty while a tab's page loads. */
  const [known, setKnown] = React.useState([]);
  const fresh = data?.categories;
  if (fresh && fresh.join('\u0000') !== known.join('\u0000')) setKnown(fresh);
  const tabs = [{ id: '', label: 'All' }, ...known.map((c) => ({ id: c, label: c }))];

  /* Measured, as on /promotions/promotion: these tabs are as wide as their labels. */
  const listRef = React.useRef(null);
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const group = list?.querySelector('.tabs-btn-group');
    const active = group?.querySelector('[aria-selected="true"]');
    if (!list || !group || !active) return;
    list.style.setProperty('--tabs-width', `${active.getBoundingClientRect().width}px`);
    list.style.setProperty('--tabs-indicator-position', `${active.getBoundingClientRect().left - group.getBoundingClientRect().left}px`);
  }, [category, tabs.length]);

  const selectTab = (id) => {
    setCategory(id);
    setPage(1);
  };

  return (
    <div className="bonus-scope @container px-4 sm:px-0">
      <div className="pb-4 pt-4 sm:pt-4">
        <header className="mb-4 text-base font-extrabold text-primary lg:text-lg">Blog</header>

        <div className="bonus-scope relative sm:pb-10">
          {tabs.length > 1 && (
            <div
              ref={listRef}
              role="tablist"
              data-type="indicator"
              className="scroll-x tabs-title hide-scroll h-11 rounded-none border-b border-fourth/5 !bg-transparent [&_.tabs-btn-group]:gap-8 [&_.tabs-btn]:max-w-fit [&_.tabs-btn]:!bg-transparent [&_.tabs-btn]:px-0 [&_.tabs-indicator]:bg-secondary"
            >
              <div className="tabs-btn-group">
                {tabs.map((t) => (
                  <button
                    key={t.id || 'all'}
                    role="tab"
                    type="button"
                    {...(t.id === category ? { 'aria-selected': 'true' } : {})}
                    className="tabs-btn btn-like"
                    onClick={() => selectTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="tabs-indicator test-indicator-tab" />
            </div>
          )}

          <div className="tabs-content !bg-transparent">
            {loading ? (
              <div className={GRID}>
                {Array.from({ length: 6 }, (unused, i) => (
                  <Skeleton key={`skeleton-${i}`} className="block h-72 rounded-xl" radius={0}>
                    <div className="size-full" />
                  </Skeleton>
                ))}
              </div>
            ) : posts.length ? (
              <>
                <div className={GRID}>
                  {posts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
                {pages > 1 && (
                  <div className="flex justify-center pt-4">
                    <Pagination page={page} pages={pages} onChange={setPage} loading={loading} />
                  </div>
                )}
              </>
            ) : (
              <EmptyPlaceholder className="text-secondary" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
