/**
 * VÉRONA — Centralized Homepage Presentation Configuration
 *
 * Provides strongly-typed presentation data for the luxury fashion discovery experience.
 * All internal links strictly reference centralized ROUTES.
 * NOTE: This is presentation/demo data only. No database queries are performed in Phase 07.
 */

import { ROUTES } from "@/config/routes";
import { HomepageData } from "@/types/homepage";

export const HOMEPAGE_DATA: HomepageData = {
  hero: {
    id: "hero-ss26",
    eyebrow: "Runway Drop • Spring / Summer 2026",
    title: "Everyday.",
    titleAccent: "Elevated.",
    description:
      "An architectural balance of raw textures, structured tailoring, and fluid mulberry silks. Curated for the modern connoisseur.",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85",
    mobileImage:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85",
    primaryCta: {
      label: "Shop Women",
      href: ROUTES.WOMEN,
    },
    secondaryCta: {
      label: "Shop Men",
      href: ROUTES.MEN,
    },
  },

  categories: [
    {
      id: "cat-women",
      name: "Women's Couture",
      slug: "women",
      image:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
      itemCount: 680,
      tagline: "Fluid silks, sculpted evening gowns, and contemporary edits.",
    },
    {
      id: "cat-men",
      name: "Men's Sartorial",
      slug: "men",
      image:
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      itemCount: 420,
      tagline: "Tailored blazers, Italian linens, and sharp silhouettes.",
    },
    {
      id: "cat-heritage",
      name: "Heritage Weaves",
      slug: "heritage",
      image:
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
      itemCount: 290,
      tagline: "Artisan weave sarees, hand-zari kurtas, and festive ensembles.",
    },
    {
      id: "cat-casual",
      name: "Casual Luxury",
      slug: "casual",
      image:
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80",
      itemCount: 510,
      tagline: "Relaxed supima cotton tees, heavyweight hoodies, and chinos.",
    },
    {
      id: "cat-accessories",
      name: "Artisan Adornments",
      slug: "accessories",
      image:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
      itemCount: 175,
      tagline: "Top-grain calfskin leather, timeless timepieces, and accents.",
    },
    {
      id: "cat-kids",
      name: "Junior Elegance",
      slug: "kids",
      image:
        "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80",
      itemCount: 190,
      tagline: "Comfort-crafted natural breathable cottons for young connoisseurs.",
    },
  ],

  trendingProducts: [
    {
      id: "prod-trend-1",
      slug: "verona-asymmetric-silk-evening-dress",
      brand: "VÉRONA COUTURE",
      title: "Asymmetric Draped Mulberry Silk Dress",
      currentPrice: 12499,
      mrp: 19999,
      discountPercent: 37,
      rating: 4.9,
      ratingCount: 89,
      primaryImage:
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
      hoverImage:
        "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",
      category: "dresses",
      gender: "women",
      sizes: ["XS", "S", "M", "L"],
      colors: [
        { name: "Noir Black", hex: "#111111" },
        { name: "Burgundy Wine", hex: "#5C1D24" },
      ],
      isNew: true,
      inStock: true,
      tag: "RUNWAY EDIT",
    },
    {
      id: "prod-trend-2",
      slug: "verona-signature-linen-blazer",
      brand: "VÉRONA ATELIER",
      title: "Double-Breasted Italian Flax Blazer",
      currentPrice: 8999,
      mrp: 14999,
      discountPercent: 40,
      rating: 4.8,
      ratingCount: 142,
      primaryImage:
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
      hoverImage:
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      category: "blazers",
      gender: "men",
      sizes: ["38", "40", "42", "44"],
      colors: [
        { name: "Oatmeal Beige", hex: "#D8C7B5" },
        { name: "Midnight Navy", hex: "#1A2536" },
      ],
      isNew: true,
      inStock: true,
      tag: "TRENDING",
    },
    {
      id: "prod-trend-3",
      slug: "verona-architectural-leather-crossbody-bag",
      brand: "VÉRONA LEATHER",
      title: "Structured Calfskin Flap Crossbody Bag",
      currentPrice: 14499,
      mrp: 21999,
      discountPercent: 34,
      rating: 4.9,
      ratingCount: 52,
      primaryImage:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
      hoverImage:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
      category: "bags",
      gender: "women",
      sizes: ["ONE SIZE"],
      colors: [
        { name: "Cognac Tan", hex: "#8A4926" },
        { name: "Onyx Black", hex: "#0E0E0E" },
      ],
      isNew: true,
      inStock: true,
      tag: "HANDCRAFTED",
    },
    {
      id: "prod-trend-4",
      slug: "verona-pleated-wide-leg-trousers",
      brand: "VÉRONA ATELIER",
      title: "High-Rise Double Pleated Wool Blend Trousers",
      currentPrice: 5499,
      mrp: 8999,
      discountPercent: 38,
      rating: 4.65,
      ratingCount: 112,
      primaryImage:
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
      hoverImage:
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80",
      category: "trousers",
      gender: "men",
      sizes: ["30", "32", "34", "36"],
      colors: [
        { name: "Charcoal Melange", hex: "#363636" },
        { name: "Camel", hex: "#C19A6B" },
      ],
      isNew: false,
      inStock: true,
    },
  ],

  newArrivals: [
    {
      id: "prod-new-1",
      slug: "verona-zari-handloom-chanderi-saree",
      brand: "VÉRONA HERITAGE",
      title: "Handwoven Chanderi Tissue Silk Saree",
      currentPrice: 16999,
      mrp: 24999,
      discountPercent: 32,
      rating: 4.95,
      ratingCount: 64,
      primaryImage:
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
      hoverImage:
        "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
      category: "sarees",
      gender: "women",
      sizes: ["FREE SIZE"],
      colors: [
        { name: "Champagne Gold", hex: "#D4AF37" },
        { name: "Rose Quartz", hex: "#AA6C78" },
      ],
      isNew: true,
      inStock: true,
      tag: "NEW",
    },
    {
      id: "prod-new-2",
      slug: "verona-embroidered-raw-silk-kurta-set",
      brand: "VÉRONA HERITAGE",
      title: "Hand-Embroidered Chanderi Kurta Churidar Set",
      currentPrice: 9499,
      mrp: 14999,
      discountPercent: 36,
      rating: 4.88,
      ratingCount: 78,
      primaryImage:
        "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80",
      hoverImage:
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      category: "kurtas",
      gender: "men",
      sizes: ["38", "40", "42", "44"],
      colors: [
        { name: "Ivory Ecru", hex: "#F3EDE2" },
        { name: "Sage Mist", hex: "#9EAB9D" },
      ],
      isNew: true,
      inStock: true,
      tag: "JUST IN",
    },
    {
      id: "prod-new-3",
      slug: "verona-cashmere-mock-neck-sweater",
      brand: "VÉRONA ATELIER",
      title: "100% Mongolian Cashmere Mock-Neck Knit",
      currentPrice: 11999,
      mrp: 17999,
      discountPercent: 33,
      rating: 4.92,
      ratingCount: 95,
      primaryImage:
        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80",
      hoverImage:
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80",
      category: "knitwear",
      gender: "women",
      sizes: ["XS", "S", "M", "L"],
      colors: [
        { name: "Butter Cream", hex: "#EFEBD9" },
        { name: "Espresso", hex: "#3A2E2B" },
      ],
      isNew: true,
      inStock: false,
      tag: "SOLD OUT",
    },
    {
      id: "prod-new-4",
      slug: "verona-supima-heavyweight-relaxed-tee",
      brand: "VÉRONA ESSENTIALS",
      title: "280 GSM Supima Cotton Drop-Shoulder Tee",
      currentPrice: 1999,
      mrp: 3499,
      discountPercent: 42,
      rating: 4.7,
      ratingCount: 310,
      primaryImage:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
      hoverImage:
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80",
      category: "t-shirts",
      gender: "unisex",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: [
        { name: "Alabaster White", hex: "#F8F8F6" },
        { name: "Pitch Black", hex: "#0A0A0A" },
      ],
      isNew: true,
      inStock: true,
      tag: "LATEST",
    },
  ],

  featuredCollection: {
    id: "col-aegean",
    title: "THE AEGEAN MONOCHROME",
    subtitle: "Spring / Summer Edition",
    tagline:
      "Sculpted draping meets effortless breathable linens. An ode to timeless Mediterranean understated elegance designed for balmy tropical evenings.",
    image:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=85",
    ctaText: "Explore The Lookbook",
    ctaLink: ROUTES.NEW_ARRIVALS,
  },

  collectionGrid: [
    {
      id: "col-tile-1",
      title: "Streetwear Atelier",
      tagline: "Boxy heavyweight fits and utilitarian details",
      image:
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
      href: ROUTES.MEN,
      itemCountLabel: "38 Styles",
    },
    {
      id: "col-tile-2",
      title: "The Office Edit",
      tagline: "Impeccably tailored suits, silks, and trousers",
      image:
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      href: ROUTES.WOMEN,
      itemCountLabel: "54 Styles",
    },
    {
      id: "col-tile-3",
      title: "Weekend Fits",
      tagline: "Relaxed washed linens and resort silhouettes",
      image:
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80",
      href: ROUTES.MEN,
      itemCountLabel: "42 Styles",
    },
    {
      id: "col-tile-4",
      title: "Festive Splendor",
      tagline: "Zari embroidery and handloom heritage couture",
      image:
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
      href: ROUTES.WOMEN,
      itemCountLabel: "29 Styles",
    },
  ],

  popularPicks: [
    {
      id: "prod-popular-1",
      slug: "verona-signature-linen-blazer",
      brand: "VÉRONA ATELIER",
      title: "Double-Breasted Italian Flax Blazer",
      currentPrice: 8999,
      mrp: 14999,
      discountPercent: 40,
      rating: 4.8,
      ratingCount: 142,
      primaryImage:
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
      category: "blazers",
      gender: "men",
      sizes: ["38", "40", "42", "44"],
      colors: [{ name: "Oatmeal Beige", hex: "#D8C7B5" }],
      inStock: true,
      tag: "BESTSELLER",
    },
    {
      id: "prod-popular-2",
      slug: "verona-supima-heavyweight-relaxed-tee",
      brand: "VÉRONA ESSENTIALS",
      title: "280 GSM Supima Cotton Drop-Shoulder Tee",
      currentPrice: 1999,
      mrp: 3499,
      discountPercent: 42,
      rating: 4.7,
      ratingCount: 310,
      primaryImage:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
      category: "t-shirts",
      gender: "unisex",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: [{ name: "Alabaster White", hex: "#F8F8F6" }],
      inStock: true,
      tag: "BESTSELLER",
    },
    {
      id: "prod-popular-3",
      slug: "verona-asymmetric-silk-evening-dress",
      brand: "VÉRONA COUTURE",
      title: "Asymmetric Draped Mulberry Silk Dress",
      currentPrice: 12499,
      mrp: 19999,
      discountPercent: 37,
      rating: 4.9,
      ratingCount: 89,
      primaryImage:
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
      category: "dresses",
      gender: "women",
      sizes: ["XS", "S", "M", "L"],
      colors: [{ name: "Noir Black", hex: "#111111" }],
      inStock: true,
      tag: "BESTSELLER",
    },
    {
      id: "prod-popular-4",
      slug: "verona-architectural-leather-crossbody-bag",
      brand: "VÉRONA LEATHER",
      title: "Structured Calfskin Flap Crossbody Bag",
      currentPrice: 14499,
      mrp: 21999,
      discountPercent: 34,
      rating: 4.9,
      ratingCount: 52,
      primaryImage:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
      category: "bags",
      gender: "women",
      sizes: ["ONE SIZE"],
      colors: [{ name: "Cognac Tan", hex: "#8A4926" }],
      inStock: true,
      tag: "BESTSELLER",
    },
  ],

  promotion: {
    id: "promo-private-archive",
    badge: "Privileged Access",
    title: "The Mid-Season Private Archive",
    description:
      "Enjoy complimentary garment tailoring and up to 50% off selected runway silhouettes.",
    ctaText: "Explore Sale Archive",
    ctaHref: ROUTES.SALE,
    discountNote: "Up to 50% Off Selected Styles",
  },

  editorialStories: [
    {
      id: "story-1",
      eyebrow: "Sartorial Architecture",
      title: "Layering for the High-Energy City",
      description:
        "How unstructured flax jackets and breathable silk knits create effortless silhouette transitions from noon meetings to twilight aperitifs.",
      image:
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      readTime: "4 min read",
      href: ROUTES.NEW_ARRIVALS,
      author: "VÉRONA Editorial Desk",
    },
    {
      id: "story-2",
      eyebrow: "Fabric Origins",
      title: "The Return of Hand-Loomed Zari",
      description:
        "Exploring our partnership with fourth-generation master weavers in Chanderi reviving historic tissue weaves for contemporary occasions.",
      image:
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
      readTime: "6 min read",
      href: ROUTES.NEW_ARRIVALS,
      author: "Heritage Atelier",
    },
    {
      id: "story-3",
      eyebrow: "Modern Uniform",
      title: "The New Neutral Palette",
      description:
        "Why raw ecru, warm alabaster, and washed olive form the foundational chromatic palette of the mindful 2026 wardrobe.",
      image:
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
      readTime: "3 min read",
      href: ROUTES.NEW_ARRIVALS,
      author: "Creative Direction",
    },
  ],

  styleCategories: [
    {
      id: "style-minimal",
      name: "Minimalist",
      descriptor: "Clean lines and understated neutral palettes",
      image:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
      href: ROUTES.WOMEN,
      tag: "ICONIC",
    },
    {
      id: "style-street",
      name: "Street Couture",
      descriptor: "Relaxed drops, tactile weaves, and raw edges",
      image:
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80",
      href: ROUTES.MEN,
    },
    {
      id: "style-smart-casual",
      name: "Smart Casual",
      descriptor: "Deconstructed tailoring meets soft linens",
      image:
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80",
      href: ROUTES.MEN,
      tag: "POPULAR",
    },
    {
      id: "style-festive",
      name: "Festive Splendor",
      descriptor: "Zari, brocades, and ceremonial finery",
      image:
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
      href: ROUTES.WOMEN,
    },
    {
      id: "style-everyday",
      name: "Everyday Staples",
      descriptor: "Supima cottons, breathable trousers, and knits",
      image:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
      href: ROUTES.MEN,
    },
  ],

  trustBenefits: [
    {
      id: "benefit-returns",
      title: "Easy 15-Day Returns",
      description: "Hassle-free doorstep pickup with prompt store credit or refunds.",
      iconName: "returns",
    },
    {
      id: "benefit-security",
      title: "100% Secure Payments",
      description: "Bank-grade encrypted checkout with UPI, Cards, and Net Banking.",
      iconName: "shield",
    },
    {
      id: "benefit-delivery",
      title: "Express Nationwide Delivery",
      description: "Direct atelier dispatch with end-to-end discreet tracking.",
      iconName: "truck",
    },
    {
      id: "benefit-craft",
      title: "Certified Artisanal Quality",
      description: "Pure natural fibres and hand-inspected finishing on every piece.",
      iconName: "sparkles",
    },
    {
      id: "benefit-support",
      title: "Dedicated Client Concierge",
      description: "Styling consultations and personalized assistance 7 days a week.",
      iconName: "headphones",
    },
  ],
};
