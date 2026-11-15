# College ReadyAI public site

## Run locally

Install the dependencies in `package.json`, then run `npm run dev`. Set `NEXT_PUBLIC_SITE_URL` to the production domain before deploying so canonical metadata, the sitemap, robots file and Organization JSON-LD use the real address.

## Design and implementation

The site uses the supplied white mark without changing its colour or shape. The landing page follows the supplied composition reference with a centered blue hero, layered illustrative product cards, a factual overview row and feature cards. The feature section is a swipeable, scroll-snapping carousel with previous and next controls. Pricing and FAQ use the site's blue palette and Bricolage Grotesque display stack, with plan limits on each pricing card. Primary navigation uses same-page anchors so the main sections scroll into view; section spacing is compact and responsive. The footer follows the supplied newsletter-panel and three-column navigation composition. The layout uses the requested blue, navy and light canvas palette, mobile navigation, responsive content and reduced-motion support. The sticky header uses a translucent blur with reduced-transparency and high-contrast fallbacks; controls provide press feedback on pointer-down. Typography falls back to platform system fonts until the selected display and body font files are supplied. The study path and feature panels are clearly labelled illustrative previews; they are not presented as live product screenshots. Site copy and product facts are maintained in `content/site.js`.

The page map includes Home, How it works, Features, For parents, For schools, Pricing, About, FAQ, Contact, eight legal drafts, Sign up, Log in, 404 and Offline. The newsletter, sign-up, login, contact and waitlist screens are front-end previews only; newsletter emails are not sent or stored. Connect approved app and form destinations before launch. Cookie choices are stored locally. No third-party scripts, analytics, remote fonts, maps or embeds are loaded.

## Open placeholders

The `placeholders` object in `content/site.js` collects the production URL, exportable horizontal logo lockup, approved product screenshots, company name, address, email, phone, real team biographies, app URL, school contact destination, verifiable guardian approval flow, form backend and legal review. The chosen Bricolage Grotesque and Plus Jakarta Sans font files are not included yet; the site uses the platform system stack until they are provided.

## Claims kept out

No user counts, ratings, testimonials, rankings, outcome guarantees, improvement percentages, affiliations, certifications, uptime figures or claims that paid plans and coming-soon features are available today are included. No uncertain product capability was added beyond the facts in the brief.

## Validation notes

The latest source passed Next.js compile mode. A full production build completed once, while later full builds hit a Windows sandbox `EPERM` while creating nested page output. A generated-HTML check passed for one h1 per prerendered page, image alt attributes and no cross-origin asset URLs; a source syntax and selected color-contrast check also passed. The local browser could not reach the dev server, and the shell was denied loopback socket access, so an axe scan, 320–1440 px browser overflow pass and live request trace could not run in this environment. The source includes keyboard focus styling, a skip link, Escape menu handling with focus return, native form labels, age/consent controls and reduced-motion handling, but those still need a browser audit before launch.
