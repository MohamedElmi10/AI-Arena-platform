// Site footer (T-017). Carries the honest non-affiliation / trademark notice so
// the Azure wordmark attribution across the app can't be read as endorsement.
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-neutral-200 pt-6 pb-10 text-xs leading-relaxed text-neutral-500">
      <p className="max-w-3xl">
        Microsoft, Azure, and related product names are trademarks of the
        Microsoft group of companies. AI Arena is an independent portfolio by
        Mohamed Elmi and is <span className="font-medium">not affiliated with,
        sponsored by, or endorsed by Microsoft</span>. Product names are used
        only to describe the technology each demo is built on.
      </p>
    </footer>
  );
}
