# Design Guidelines - Lemeille Patrimoine

## Design Approach
**Reference-Based: Luxury Real Estate** - Drawing inspiration from Sotheby's International Realty, Christie's Real Estate, and French luxury agencies like Barnes. The design should communicate trust, sophistication, and expertise in heritage property management.

## Core Design Principles
- **Elevated Professionalism**: Timeless elegance over trendy aesthetics
- **Visual Storytelling**: Properties and services lead through high-quality imagery
- **Trust & Credibility**: Clear information hierarchy, professional typography
- **Geographic Identity**: Subtle French sophistication with regional touches

## Color Palette

### Dark Mode (Primary)
- **Primary Brand**: 215 30% 25% (Deep sophisticated navy-blue)
- **Background**: 220 15% 12% (Rich charcoal)
- **Surface**: 220 12% 18% (Elevated card background)
- **Accent**: 45 80% 55% (Warm gold for CTAs and highlights - use sparingly)
- **Text Primary**: 0 0% 95%
- **Text Secondary**: 220 10% 70%

### Light Mode
- **Primary Brand**: 215 65% 45% (Confident blue)
- **Background**: 0 0% 98% (Soft white)
- **Surface**: 0 0% 100% (Pure white cards)
- **Accent**: 40 75% 50% (Sophisticated gold)
- **Text Primary**: 220 15% 15%
- **Text Secondary**: 220 10% 45%

## Typography

**Font Families** (via Google Fonts):
- **Headings**: 'Playfair Display' (serif) - Elegant, established, luxury
- **Body & UI**: 'Inter' (sans-serif) - Clean, modern, readable

**Scale**:
- Hero Headlines: text-6xl to text-7xl, font-serif, font-bold
- Section Titles: text-4xl to text-5xl, font-serif, font-semibold
- Property Titles: text-2xl to text-3xl, font-serif
- Body Text: text-base to text-lg, font-sans
- Captions/Meta: text-sm, font-sans, text-secondary

## Layout System

**Spacing Primitives**: Use Tailwind units of **4, 6, 8, 12, 16, 24** for consistent rhythm
- Component padding: p-6 to p-8
- Section spacing: py-16 to py-24 (desktop), py-12 (mobile)
- Card gaps: gap-6 to gap-8
- Content max-width: max-w-7xl for full sections, max-w-4xl for content

**Grid Strategy**:
- Property listings: 3-column grid (lg:grid-cols-3, md:grid-cols-2, grid-cols-1)
- Services/Features: 3-column (lg:grid-cols-3)
- Tax programs: 2-column comparison (lg:grid-cols-2)
- Testimonials: 2-column (lg:grid-cols-2)

## Component Library

### Navigation
- Fixed top navigation with logo, main menu, and prominent CTA
- Logo: "LEMEILLE PATRIMOINE" in elegant serif or "LP" monogram
- Transparent on hero, solid background on scroll
- Mobile: Slide-in menu with property categories

### Property Cards
- Large featured image (16:10 aspect ratio)
- Overlay gradient at bottom for text legibility
- Property title, location, price prominently displayed
- Quick stats badges (bedrooms, surface, DPE rating)
- Subtle hover elevation (shadow-lg transition)
- "Voir le bien" CTA button in accent color

### Property Detail Pages
- Full-width hero image gallery with thumbnail navigation
- Lightbox for full-screen image viewing
- Sidebar with key information (price, surface, rooms, DPE)
- Detailed description with rich typography
- Google Maps embed with location
- DPE visualization with color-coded graph
- PDF download button for complete DPE
- Contact form integration

### Services Section
- Category tabs/pills for filtering (Gestion, Conseil, Défiscalisation)
- Service cards with icons (use Heroicons via CDN)
- Icon + Title + Description layout
- Subtle background tint on hover

### Tax Programs (Malraux, MH, Déficit Foncier)
- Feature comparison cards
- Highlight key benefits with checkmarks
- Fiscal advantage percentages in accent color
- "En savoir plus" detailed expansion or modal

### Testimonials
- Client photo (circular avatar), name, location
- 5-star rating display (filled/unfilled stars)
- Quote in italic serif font
- Subtle quotation marks styling

### Admin Interface
- Clean dashboard with card-based metrics
- Data tables for property/program management
- Form layouts with clear validation
- Delete confirmations via modal
- Success/error toast notifications

### Forms
- Contact forms with floating labels
- Input fields with subtle border, focus ring in accent
- Checkbox/radio with custom styling
- Submit buttons in accent color, full-width on mobile

## Images

**Hero Section**: Large, aspirational property image
- Full-width hero showcasing a luxury property (Paris Haussmannian building, Normandy château, or Côte d'Azur villa)
- Height: 80vh with centered overlay text
- Overlay: Dark gradient (bottom to top) for text legibility
- Headline: "Votre Patrimoine Immobilier en Toute Confiance"
- Subheadline: "Gestion • Conseil • Défiscalisation"
- CTA buttons: "Découvrir nos biens" (primary) + "Nos prestations" (outline with blur background)

**Property Galleries**: High-quality real estate photography
- Minimum 5-8 images per property
- Professional architectural photography style
- Show exterior, interior rooms, details, neighborhood

**Services Icons**: Use Heroicons solid variants
- Building icon for property management
- Chart bar icon for financial advisory
- Document text icon for tax optimization

**About/Team**: Professional headshots or office photos in Rouen/Saint-Aygulf

**Trust Elements**: 
- Office locations with subtle map markers
- Professional certifications/memberships badges

## Animations
Use sparingly, only for:
- Smooth scroll-triggered fade-ins for sections (opacity + translateY)
- Image hover scaling (scale-105) on property cards
- Navigation background fade on scroll
- Lightbox open/close transitions

NO scroll-jacking, parallax, or complex animations that distract from content.

## Accessibility & Dark Mode
- Maintain consistent dark mode across all pages and forms
- Sufficient contrast ratios (WCAG AA minimum)
- Focus indicators for keyboard navigation
- Alt text for all property images
- Semantic HTML structure

## Page-Specific Guidelines

**Homepage**: Hero + Featured properties + Services overview + Tax programs teaser + Testimonials + Geographic coverage map + Footer with office info

**Property Listings**: Filter sidebar (location, price range, type) + Grid of property cards + Pagination

**Services Page**: Category selector + Service cards grid + CTA to schedule consultation

**Tax Programs**: Individual pages for each program with detailed benefits, eligibility, examples, case studies

**Contact**: Two-column layout (form + office info with embedded maps for Rouen & Saint-Aygulf)

**Admin**: Login page with secure authentication + Dashboard + CRUD tables for properties/programs/testimonials