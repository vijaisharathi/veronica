/**
 * VÉRONA — Centralized Navigation Configuration
 *
 * Strongly-typed presentation configuration for desktop header,
 * mega menu, mobile navigation drawer, search overlay, and footer.
 */

import { ROUTES } from "./routes";

export interface NavLinkItem {
  label: string;
  href: string;
  isNew?: boolean;
  isSale?: boolean;
  badge?: string;
}

export interface MegaMenuSection {
  title: string;
  items: NavLinkItem[];
}

export interface FeaturedEditorial {
  title: string;
  caption: string;
  href: string;
  src: string;
  tag: string;
}

export interface MegaMenuConfig {
  sections: MegaMenuSection[];
  featured?: FeaturedEditorial;
}

export interface PrimaryNavItem {
  id: string;
  name: string;
  slug: string;
  href: string;
  isHighlight?: boolean;
  isSale?: boolean;
  megaMenu: MegaMenuConfig;
}

export interface AnnouncementItem {
  id: string;
  text: string;
  highlightText?: string;
}

export const ANNOUNCEMENT_CONFIG: {
  enabled: boolean;
  items: AnnouncementItem[];
} = {
  enabled: true,
  items: [
    {
      id: "announcement-1",
      text: "THE ATELIER PREVIEW • COMPLIMENTARY COURIER & LUXURY PACKAGING ON ORDERS OVER ₹5,000",
      highlightText: "THE ATELIER PREVIEW",
    },
    {
      id: "announcement-2",
      text: "BESPOKE STYLING APPOINTMENTS NOW OPEN IN MUMBAI, NEW DELHI & BENGALURU",
      highlightText: "BESPOKE APPOINTMENTS",
    },
  ],
};

export const PRIMARY_NAVIGATION: PrimaryNavItem[] = [
  {
    id: "men",
    name: "Men",
    slug: "men",
    href: ROUTES.MEN,
    megaMenu: {
      sections: [
        {
          title: "Clothing",
          items: [
            { label: "Linen & Structured Shirts", href: `${ROUTES.SHOP}?category=shirts&gender=men` },
            { label: "Handcrafted Kurtas", href: `${ROUTES.SHOP}?category=kurtas&gender=men`, isNew: true },
            { label: "Tailored Blazers & Nehru Jackets", href: `${ROUTES.SHOP}?category=blazers&gender=men` },
            { label: "Pleated & Casual Trousers", href: `${ROUTES.SHOP}?category=trousers&gender=men` },
            { label: "Supima Cotton T-Shirts", href: `${ROUTES.SHOP}?category=t-shirts&gender=men` },
            { label: "Cashmere & Merino Knitwear", href: `${ROUTES.SHOP}?category=knitwear&gender=men` },
          ],
        },
        {
          title: "Shop By",
          items: [
            { label: "New Season Arrivals", href: ROUTES.NEW_ARRIVALS, isNew: true },
            { label: "Bestselling Silhouettes", href: `${ROUTES.SHOP}?tag=bestsellers&gender=men` },
            { label: "Wedding & Festive Edit", href: `${ROUTES.SHOP}?tag=festive&gender=men` },
            { label: "Curated Reductions", href: ROUTES.SALE, isSale: true },
          ],
        },
        {
          title: "Collections",
          items: [
            { label: "The Italian Linen Edit", href: `${ROUTES.SHOP}?collection=italian-linen` },
            { label: "Raw Silk Heritage Series", href: `${ROUTES.SHOP}?collection=raw-silk` },
            { label: "Atelier Resortwear", href: `${ROUTES.SHOP}?collection=resortwear` },
          ],
        },
      ],
      featured: {
        title: "The Savile Line",
        caption: "Precision Italian linen and hand-canvassed formal tailoring.",
        href: `${ROUTES.SHOP}?collection=savile-line`,
        src: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&q=80&w=800",
        tag: "Seasonal Spotlight",
      },
    },
  },
  {
    id: "women",
    name: "Women",
    slug: "women",
    href: ROUTES.WOMEN,
    megaMenu: {
      sections: [
        {
          title: "Clothing",
          items: [
            { label: "Haute Couture Dresses", href: `${ROUTES.SHOP}?category=dresses&gender=women`, isNew: true },
            { label: "Chanderi & Organza Sarees", href: `${ROUTES.SHOP}?category=sarees&gender=women` },
            { label: "Raw Silk Kurta Ensembles", href: `${ROUTES.SHOP}?category=kurtas&gender=women` },
            { label: "Tailored Blouses & Shirts", href: `${ROUTES.SHOP}?category=tops&gender=women` },
            { label: "Wide-Leg Trousers & Culottes", href: `${ROUTES.SHOP}?category=trousers&gender=women` },
            { label: "Cashmere Stoles & Capes", href: `${ROUTES.SHOP}?category=outerwear&gender=women` },
          ],
        },
        {
          title: "Shop By",
          items: [
            { label: "New Season Arrivals", href: ROUTES.NEW_ARRIVALS, isNew: true },
            { label: "Editorial Runway Pieces", href: `${ROUTES.SHOP}?tag=runway&gender=women` },
            { label: "Atelier Eveningwear", href: `${ROUTES.SHOP}?tag=evening&gender=women` },
            { label: "Private Archive Reductions", href: ROUTES.SALE, isSale: true },
          ],
        },
        {
          title: "Collections",
          items: [
            { label: "Nocturne Gala Collection", href: `${ROUTES.SHOP}?collection=nocturne` },
            { label: "Varanasi Silk Masterworks", href: `${ROUTES.SHOP}?collection=varanasi-silk` },
            { label: "Monochrome Essentials", href: `${ROUTES.SHOP}?collection=monochrome` },
          ],
        },
      ],
      featured: {
        title: "Nocturne Edition",
        caption: "Flowing silks and sculptured velvet for evening soirees.",
        href: `${ROUTES.SHOP}?collection=nocturne`,
        src: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
        tag: "Editorial Showcase",
      },
    },
  },
  {
    id: "kids",
    name: "Kids",
    slug: "kids",
    href: ROUTES.KIDS,
    megaMenu: {
      sections: [
        {
          title: "Junior Boys",
          items: [
            { label: "Mini Linen Shirts", href: `${ROUTES.SHOP}?category=boys-shirts&gender=kids` },
            { label: "Festive Kurta Pyjamas", href: `${ROUTES.SHOP}?category=boys-festive&gender=kids`, isNew: true },
            { label: "Chino Shorts & Trousers", href: `${ROUTES.SHOP}?category=boys-bottoms&gender=kids` },
          ],
        },
        {
          title: "Junior Girls",
          items: [
            { label: "Silk Embroidered Frocks", href: `${ROUTES.SHOP}?category=girls-dresses&gender=kids`, isNew: true },
            { label: "Festive Lehenga Sets", href: `${ROUTES.SHOP}?category=girls-festive&gender=kids` },
            { label: "Organic Cotton Separates", href: `${ROUTES.SHOP}?category=girls-casual&gender=kids` },
          ],
        },
        {
          title: "Occasions",
          items: [
            { label: "Festive Celebrations", href: `${ROUTES.SHOP}?tag=kids-festive` },
            { label: "Ceremonial Wear", href: `${ROUTES.SHOP}?tag=kids-ceremony` },
            { label: "Special Offers", href: ROUTES.SALE, isSale: true },
          ],
        },
      ],
      featured: {
        title: "Junior Elegance",
        caption: "Natural fibers and gentle artisanal stitching crafted for young connoisseurs.",
        href: ROUTES.KIDS,
        src: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&q=80&w=800",
        tag: "Atelier Kids",
      },
    },
  },
  {
    id: "new-arrivals",
    name: "New Arrivals",
    slug: "new-arrivals",
    href: ROUTES.NEW_ARRIVALS,
    isHighlight: true,
    megaMenu: {
      sections: [
        {
          title: "Latest Drops",
          items: [
            { label: "Autumn/Winter Haute Edit", href: `${ROUTES.SHOP}?tag=aw-edit`, isNew: true },
            { label: "Hand-Embroidered Festive Drop", href: `${ROUTES.SHOP}?tag=festive-drop`, isNew: true },
            { label: "Signature Linen Series 2026", href: `${ROUTES.SHOP}?tag=linen-2026`, isNew: true },
          ],
        },
        {
          title: "Curated Edits",
          items: [
            { label: "The Luxury Formalwear Capsule", href: `${ROUTES.SHOP}?collection=luxury-formals` },
            { label: "Pure Mulberry Silk Releases", href: `${ROUTES.SHOP}?collection=mulberry-silk` },
            { label: "Atelier Resort Drop", href: `${ROUTES.SHOP}?collection=resort-drop` },
          ],
        },
      ],
    },
  },
  {
    id: "sale",
    name: "Sale",
    slug: "sale",
    href: ROUTES.SALE,
    isSale: true,
    megaMenu: {
      sections: [
        {
          title: "Seasonal Reductions",
          items: [
            { label: "Up to 40% Off — Men's Tailoring", href: `${ROUTES.SHOP}?sale=true&gender=men`, isSale: true },
            { label: "Up to 50% Off — Women's Couture", href: `${ROUTES.SHOP}?sale=true&gender=women`, isSale: true },
            { label: "Private Archive Reductions", href: `${ROUTES.SHOP}?sale=true&tag=archive`, isSale: true },
          ],
        },
        {
          title: "Shop By Discount",
          items: [
            { label: "30% Off Curated Edit", href: `${ROUTES.SHOP}?discount=30`, isSale: true },
            { label: "40% Off Selected Styles", href: `${ROUTES.SHOP}?discount=40`, isSale: true },
            { label: "50% Off Final Quantities", href: `${ROUTES.SHOP}?discount=50`, isSale: true },
          ],
        },
      ],
    },
  },
];

export const SEARCH_SUGGESTIONS = {
  recent: ["Italian Linen Blazers", "Raw Silk Kurtas", "Evening Dresses", "Cashmere Stoles"],
  trending: [
    "Italian Double-Breasted",
    "Chanderi Silk Saree",
    "Tailored Linen Trousers",
    "Mulberry Silk Blouse",
    "Supima Cotton Shirt",
  ],
  popularCategories: [
    { label: "Men's Shirts", href: `${ROUTES.SHOP}?category=shirts&gender=men` },
    { label: "Women's Dresses", href: `${ROUTES.SHOP}?category=dresses&gender=women` },
    { label: "Ethnic Kurtas", href: `${ROUTES.SHOP}?category=kurtas` },
    { label: "Tailored Blazers", href: `${ROUTES.SHOP}?category=blazers` },
  ],
};

export interface FooterLinkItem {
  label: string;
  href: string;
  isSale?: boolean;
}

export interface FooterSection {
  title: string;
  links: FooterLinkItem[];
}

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Online Shopping",
    links: [
      { label: "Men's Atelier", href: ROUTES.MEN },
      { label: "Women's Couture", href: ROUTES.WOMEN },
      { label: "Junior Elegance", href: ROUTES.KIDS },
      { label: "New Season Drops", href: ROUTES.NEW_ARRIVALS },
      { label: "Curated Reductions", href: ROUTES.SALE, isSale: true },
    ],
  },
  {
    title: "Customer Concierge",
    links: [
      { label: "Client Account", href: ROUTES.ACCOUNT },
      { label: "Saved Selections (Wishlist)", href: ROUTES.WISHLIST },
      { label: "Recently Viewed Garments", href: ROUTES.ACCOUNT_RECENTLY_VIEWED },
      { label: "Shopping Bag", href: ROUTES.CART },
      { label: "Size Guide & Bespoke Measurements", href: ROUTES.STATES },
      { label: "Shipping, Returns & Delivery", href: ROUTES.STATES },
    ],
  },
  {
    title: "The Maison",
    links: [
      { label: "The VÉRONA Heritage Story", href: ROUTES.STATES },
      { label: "Artisanal Craftsmanship", href: ROUTES.STATES },
      { label: "Sustainable Silk & Linen Sourcing", href: ROUTES.STATES },
      { label: "Careers at VÉRONA", href: ROUTES.STATES },
    ],
  },
  {
    title: "Legal & Integrity",
    links: [
      { label: "Terms & Conditions", href: ROUTES.STATES },
      { label: "Privacy Policy", href: ROUTES.STATES },
      { label: "Security & Encryption Standard", href: ROUTES.STATES },
    ],
  },
];
