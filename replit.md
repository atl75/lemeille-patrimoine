# Lemeille Patrimoine - Luxury Real Estate Platform

## Overview

Lemeille Patrimoine is a luxury real estate platform operated by Novus Capital, specializing in high-end property transactions in Paris, Normandy, and the French Riviera. The platform provides detailed property listings, including energy ratings (DPE) and tax optimization programs (Malraux, Monument Historique). It serves public users browsing properties and administrative users managing content via a secure dashboard. The project aims to capture the high-end real estate market with a sophisticated online presence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend & Backend Architecture

**Technology Stack:**
- **Framework**: Next.js 14.2.4 (App Router) with TypeScript
- **React**: 18.2.0
- **Styling**: Tailwind CSS with a custom luxury real estate design system
- **PDF Generation**: pdf-lib
- **Database ORM**: Drizzle ORM with PostgreSQL

**Design System:**
Inspired by Sotheby's International Realty and French agencies like Barnes, the design emphasizes:
- **Typography**: Serif fonts (Playfair Display) for headings, sans-serif (Inter) for body.
- **Color Palette**: Navy-blue (#1F3B2C), gold (#B89C6D) accents, and cream (#F4F1EB) background.
- **Imagery**: High-quality, image-first approach for property listings.
- **Consistency**: Uniform spacing and elevation using Tailwind utilities.

**Core Features & Pages:**
- **Public Pages**: Home, Property Listings (with dynamic sector pages, filtering, and sold properties view), Property Details, Patrimoine (with interactive simulator with CRM integration and SEO-optimized content), Programs, Reviews (integrated with Google reviews), Contact, Legal pages, Property Estimation.
- **Admin Interface**: 
  - Dashboard (/admin)
  - Content Management (/admin/contenu) with full CRUD for:
    - Properties (/admin/contenu/biens) - includes:
      - **ImageUploader component** with drag-and-drop, multi-file selection, and URL management
      - **DocumentUploader & MultiDocumentUploader** for PDF documents (Base64 storage)
      - **AI Document Analysis** via ChatGPT (GPT-4o) to auto-fill property details from mandate/estimation/DPE documents
      - **Cadastral Parcel Search** via French government APIs (API Adresse + API Carto Cadastre) with automatic surface calculation using @turf/turf
      - **Owner Management** - Add multiple owners (individuals or companies) with automatic SIREN lookup via API Recherche d'Entreprises (data.gouv.fr)
      - **Notary Management** - Add seller and buyer notary information with duplication option (manual entry)
      - **Financial Calculator** - Automatic calculation of FAI (Fees Agency Included) from net seller amount and commission (supports both percentage and absolute value with automatic conversion)
      - **Property Reading View** with full details, images, DPE, and downloadable/viewable documents
    - Programs (/admin/contenu/programmes)
    - Reviews (/admin/contenu/avis)
  - CRM (/admin/crm - active) - lead management with detailed analytics
  - KPI tracking (/admin/kpi - active)
- **API Endpoints**: RESTful API for CRUD operations on properties, programs, reviews, leads, and authentication. Includes dynamic PDF generation for property brochures. GET /api/leads returns all leads, POST /api/leads creates new leads (supports both FormData and JSON).
- **Email Notifications**: Automated email system via Resend API that sends HTML-formatted reports to arthur.lemeille@lemeillepatrimoine.com for:
  - **Estimation Requests**: Includes property details (address, type, surface, DPE, condition, amenities) and contact information
  - **Contact Form Submissions**: Includes sender info (name, email, phone, topic) and message content
- **PatrimoineSimulator**: Interactive calculator on /patrimoine page that captures user inputs (price, loan, rent, taxes, fiscal regime) and calculated results (mensualité, cash-flow, économie fiscale), then sends full simulation data to CRM via /api/leads with structured meta field.
- **EstimationForm**: Property valuation tool on /immobilier/estimation that calculates indicative prices based on 8 sector benchmarks (€/m²), property characteristics (type, surface, rooms, condition, DPE), and location-specific adjustments (floor, elevator, exterior spaces, parking, sea view). Sends complete property data and estimation results to CRM via /api/leads.
- **ContactForm**: Contact form on /contact page that captures user inquiries (name, email, phone, topic, message), saves to CRM, and triggers automated email notification.
- **CRM Page**: Lists all leads with real-time statistics (total, new leads, sources), displays full lead details including simulator/estimation data in expandable sections, sorted by date (newest first).
- **KPI Page**: Analytics dashboard showing total leads, monthly evolution, growth percentage, and detailed breakdowns by source, topic, and status.

**Authentication & Security:**
- Admin routes are protected by JWT middleware.
- Session secret and admin password are managed via environment variables.
- Cookie-based token storage for admin sessions.

**Data Models:**
- **Properties**: Stores property details, location, pricing, images, features, map configuration, cadastral reference (with automatic surface calculation via @turf/turf), DPE data (utilizing JSONB for flexible data structures), sold status, financial information (net seller amount, commission in % or €, FAI auto-calculated), owners (array of individuals or companies with SIREN autocomplete), notaries (seller and buyer with manual entry and duplication option), and 8 administrative documents (titleDeed, dpeDocument, propertyTax, mandate, estimation for all properties + propertyRules, chargesStatement, agMinutes array for apartments). Properties marked as sold (sold: true) display separately with grayscale images, non-clickable cards, and "Nous consulter" pricing.
- **Owners**: Each property can have multiple owners (individuals or companies). Owners store: type (INDIVIDUAL/COMPANY), name, SIREN (required for companies via API Recherche d'Entreprises), email, phone, and address.
- **Notaries**: Each property can have seller and buyer notary information. Notaries store: officeName, notaryName, address, city, postalCode, phone, and email. Admin can duplicate seller notary to buyer notary with one click.
- **Programs**: Tax optimization schemes.
- **Reviews**: Client testimonials.
- **Leads**: Contact form submissions.

**Sold Properties Feature:**
- Toggle buttons on /immobilier to switch between "Biens en vente" and "Biens vendus"
- Sold properties are filtered separately and never mixed with available properties
- Sold property cards display:
  - Grayscale image with 60% opacity
  - "VENDU" badge in top-right corner
  - Non-clickable card (div instead of link)
  - "Nous consulter" instead of actual price
  - Reduced opacity on all text content

### Build & Deployment System

- **Development Mode**: Next.js dev server with Fast Refresh, runs on port 3000.
- **Production Mode**: Next.js production build, optimized for performance.
- **Deployment**: Configured for Cloud Run compatibility, handling `PORT` environment variable and binding to `0.0.0.0`. Requires `node scripts/start.js` for execution.

## External Dependencies

### Required Services

**PostgreSQL Database:**
- Provisioned via Neon serverless.
- Connection string specified in `DATABASE_URL` environment variable.
- Drizzle Kit used for migrations and schema management.

**Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: JWT signing secret.
- `ADMIN_PASSWORD`: Admin login password.
- `NEXT_PUBLIC_SITE_URL`: Site URL for SEO.
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps Embed API key.
- `GOOGLE_PLACES_API_KEY`: For live Google reviews.
- `GOOGLE_PLACE_ID`: For live Google reviews.

### Third-Party Integrations

**Google Maps Embed API:**
- Used for visualizing property locations with configurable precision and zoom levels.

**Google Fonts:**
- `Playfair Display` (serif) and `Inter` (sans-serif) are automatically loaded by Next.js.

**Google Places API:**
- Integrates Google Reviews, with a fallback to local JSON data if the API is unavailable.

**Replit AI Integrations (OpenAI):**
- Uses GPT-4o for document analysis and property data extraction
- No API key required - uses Replit's managed OpenAI integration
- Charges billed to Replit credits
- Analyzes mandate, estimation, and DPE documents to auto-fill property forms

**French Government APIs:**
- **API Adresse** (api-adresse.data.gouv.fr): Geocoding addresses to coordinates and INSEE codes
- **API Carto Cadastre** (apicarto.ign.fr): Retrieving cadastral parcel references using point geometry intersection
  - Uses `geom` parameter with Point geometry to find the exact parcel containing the address coordinates
  - Automatically calculates land surface area (landSize) using @turf/turf library from parcel geometry
  - Endpoint: /api/cadastre for automated cadastral parcel lookup
- **API Recherche d'Entreprises** (recherche-entreprises.api.gouv.fr): Company search with SIREN autocomplete
  - Free API without authentication required
  - Provides company name, SIREN, address, activity, and active status
  - Endpoint: /api/companies for company autocomplete in owner management
- All APIs are free and require no authentication

**Image Hosting:**
- Supports external image URLs and a local `public/uploads` directory.

## Quality Assurance & Audit Tools

**Site Audit System (scripts/audit-site.sh):**
- Comprehensive audit tool for SEO, accessibility, performance, and broken links
- Components:
  - **Crawling**: Linkinator-based discovery (max 60 pages, depth 3)
  - **SEO Analysis**: Title, meta description, canonical, H1, Open Graph, JSON-LD, favicon, image alt text
  - **Accessibility**: axe-core testing on 20 pages with WCAG compliance checks
  - **Performance**: Lighthouse mobile & desktop on 5 key pages
  - **Broken Links**: CSV export of 404s and invalid links
- Dependencies: puppeteer, @axe-core/puppeteer, linkinator, cheerio, lighthouse
- System requirements: Chromium (installed via Nix) with X11 libraries
- Execution: `bash scripts/audit-site.sh` (5-10 min runtime)
- Results in `audit/` directory with HTML/JSON/CSV reports

**Audit Analysis Tool (scripts/analyze-audit.mjs):**
- Post-audit analysis to generate actionable insights
- Generates:
  - **AUDIT-SUMMARY.md**: Executive summary with key metrics
  - **AUDIT-TASKS.csv**: Prioritized task list (P0/P1/P2) with 562 items
  - **audit-digest.json**: Machine-readable digest for programmatic use
- Execution: `node scripts/analyze-audit.mjs audit`
- Note: Filters needed to exclude Next.js static assets (_next, .css, .js, .woff2) from SEO warnings

**Latest Audit Results (2025-11-10):**
- 60 pages scanned, 2 broken links (logo-dark.png - 400 error) - **FIXED**
- 39 accessibility violations across 12 pages (mostly JS/CSS bundle warnings)
- Desktop performance: All pages ✅ | Mobile performance: Needs Lighthouse preset fix
- SEO: Real HTML pages have proper metadata; 44 "errors" are Next.js assets (false positives)

**SEO Improvements Completed (2025-11-10):**
- **P0 Critical**: Fixed broken logo-dark.png references (replaced with /logo.png in GoogleReviews, immobilier, secteurs pages)
- **Metadata Enhancement**: Added comprehensive metadata (title, description, canonical URLs, Open Graph) to all pages:
  - Homepage (via app/layout.tsx)
  - /immobilier, /patrimoine, /programmes, /contact (via layout), /avis
  - Legal pages: /mentions-legales, /bareme-honoraires, /confidentialite, /cookies, /politique-de-confidentialite
- **JSON-LD Schema**: Enhanced OrganizationSchema with:
  - Complete business information (RealEstateAgent type)
  - Geographic coordinates for both offices (Rouen, Fréjus)
  - Full postal addresses and contact points
  - Services catalog (transactions, patrimoine, défiscalisation)
  - Structured logo and image data
- **Image Accessibility**: Fixed image alt attributes (GoogleReviews logo images now have descriptive alt text)
- **Technical SEO**: Verified lang="fr", favicon, and meta viewport are properly declared in root layout

**Performance Optimization Completed (2025-11-10):**
- **Google Analytics Optimization**: Eliminated 709ms JavaScript blocking time on mobile
  - Replaced manual GA initialization (requestIdleCallback) with Next.js Script component
  - Strategy: `lazyOnload` - loads GA only after page load event
  - Removed redundant AnalyticsProvider.initGA() call
  - Kept useAnalytics() hook for page view and visit tracking
  - Files modified: app/layout.tsx, components/AnalyticsProvider.tsx, lib/analytics.ts
  - **Production Results (Verified via PageSpeed Insights)**:
    - Homepage Mobile: 80 → **98** (+18 points, TBT: 805ms → 32ms)
    - Patrimoine Mobile: 74 → **96** (+22 points, TBT: ~800ms → 35ms)
    - Contact Mobile: 78 → **95** (+17 points, TBT: ~700ms → 78ms)
    - Desktop: **100** (perfect score maintained across all pages)
    - TBT reduction: **96%** (average 800ms → 48ms)
    - All Core Web Vitals: **Green** (LCP <2.5s, FCP <1.8s, CLS 0.000)
  - Status: ✅ **DEPLOYED & VERIFIED** - Site now in top 2% of web performance

**JavaScript Bundle Optimization (2025-11-10):**
- **Dynamic Imports**: Implemented lazy loading for non-critical components
  - GoogleReviews (homepage): Loads after initial render, reduces bundle size
  - Lightbox (PropertyGallery): Loads on-demand when user clicks images
  - Files modified: app/page.tsx, components/PropertyGallery.tsx
- **Code Cleanup**: Removed unused FeatureIcons.tsx component
  - Eliminated 17 unused lucide-react icon imports
  - Reduced bundle bloat and improved maintainability
- **Expected Impact**: 10-15 KiB reduction in unused JavaScript
- Status: ✅ **IMPLEMENTED** - Awaiting republication for production testing