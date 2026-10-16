import React from 'react';
import { Link, useParams } from 'react-router-dom';
import Skeleton from '../../components/shared/Skeleton';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import PageCard from '../../components/shared/PageCard';
import { getBlogPost, sanitizeBlogHtml } from '../../services/blog';
import { useResource } from '../../hooks/useResource';
import { formatBlogDate } from './format';
import './Blog.css';

/* `/blog/:slug` — one article. This build's own page (see ./index.jsx): a back link, the cover,
 * the category chip, title and date, then the body inside the site's `PageCard`.
 *
 * The body is staff-written HTML from the site admin, so it is SANITISED before it is drawn
 * (`sanitizeBlogHtml`: scripts, styles, frames, forms, `on*` handlers and `javascript:` URLs are
 * stripped, unknown tags unwrapped). An unknown slug, a draft, or the blog being off all read as
 * "no post" and draw the site's empty state. */

const ChevronIcon = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

export default function BlogPost() {
  const { slug = '' } = useParams();
  const read = React.useCallback(() => getBlogPost(slug), [slug]);
  const { data: post, loading } = useResource(read);
  const html = React.useMemo(() => sanitizeBlogHtml(post?.content), [post]);

  return (
    <div className="px-4 sm:px-0">
      <div className="pb-8 pt-4">
        <Link to="/blog" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-primary">
          <ChevronIcon className="icon size-4 fill-current" />
          <span>Blog</span>
        </Link>

        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="block aspect-[21/9] w-full rounded-xl" radius={0}>
              <div className="size-full" />
            </Skeleton>
            <Skeleton className="block h-64 w-full rounded-xl" radius={0}>
              <div className="size-full" />
            </Skeleton>
          </div>
        ) : !post ? (
          <EmptyPlaceholder className="text-secondary" />
        ) : (
          <article>
            {post.image && (
              <div className="mb-4 aspect-[21/9] w-full overflow-hidden rounded-xl bg-layer5">
                <img className="size-full object-cover" alt="" src={post.image} />
              </div>
            )}
            <PageCard className="py-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {post.category && (
                  <span className="flex h-[22px] items-center rounded-md bg-white_alpha5 px-2 text-[10px] font-semibold uppercase text-secondary">
                    {post.category}
                  </span>
                )}
                <span className="text-xs font-normal text-tertiary">{formatBlogDate(post.date)}</span>
              </div>
              <h1 className="text-xl font-extrabold leading-8 text-primary lg:text-2xl">{post.title}</h1>
              {post.summary && <p className="mt-2 text-sm font-semibold leading-5 text-secondary">{post.summary}</p>}
              <div className="blog-content mt-6 select-text text-sm font-semibold leading-6 text-secondary" dangerouslySetInnerHTML={{ __html: html }} />
            </PageCard>
          </article>
        )}
      </div>
    </div>
  );
}
