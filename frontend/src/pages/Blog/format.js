/** A post's date as the cards and the article print it (`Oct 1, 2026`); empty when unknown. */
export const formatBlogDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
