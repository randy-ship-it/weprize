export function DraftBanner() {
  return (
    <div
      className="sticky top-0 z-50 bg-amber-400/95 text-amber-950 text-center text-xs sm:text-sm font-semibold px-3 py-2.5 shadow backdrop-blur"
      role="status"
    >
      Draft preview · not a public launch. No custom domain. No CAPTCHA autofill. Payments waitlist stub. Birch ads soft-link only.
    </div>
  )
}
