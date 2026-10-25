import { Link } from 'react-router-dom';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';

/* The catch-all's page: any path the route table does not know. Built from the site's own empty
   state (theme-aware art) and brand button, inside the normal MainLayout chrome. */
export default function NotFound() {
  return (
    <div className="center min-h-[60vh] flex-col px-4 py-10 text-center">
      <EmptyPlaceholder className="py-0">{null}</EmptyPlaceholder>
      <h1 className="mt-4 text-6xl font-extrabold text-brand">404</h1>
      <h2 className="mt-2 text-xl font-bold text-primary">Page not found</h2>
      <p className="mt-2 text-sm text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link to="/" className="button button-brand button-m mt-6 min-w-40 px-6">
        Back to Home
      </Link>
    </div>
  );
}
