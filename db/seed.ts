/**
 * VÉRONA — Deterministic Database Seeding System
 *
 * Populates realistic development/testing datasets across all foundational domains:
 * RBAC (Roles & Permissions), Sample Staff & Customer, Colors, Sizes, Categories,
 * Brands, Products, ProductVariants, Warehouses, Variant Inventory, Collections, and Coupons.
 *
 * NOTE: All data is strictly marked as DEVELOPMENT/TEST DATA.
 * No real credentials or production payment data are created.
 */

import { logger } from "@/lib/logger";
import { connectToDatabase } from "./client";
import {
  CustomerModel,
  StaffModel,
  RoleModel,
  PermissionModel,
  CategoryModel,
  BrandModel,
  ProductModel,
  ProductVariantModel,
  ColorModel,
  SizeAttributeModel,
  WarehouseModel,
  InventoryItemModel,
  FashionCollectionModel,
  CouponModel,
} from "./models";
import {
  Gender,
  ProductStatus,
  ProductVisibility,
  VariantStatus,
  InventoryStatus,
  DiscountType,
  CustomerStatus,
  StaffStatus,
} from "@/constants/status";

export async function runDatabaseSeed(options: { clean?: boolean } = {}): Promise<{
  success: boolean;
  counts: Record<string, number>;
}> {
  await connectToDatabase();
  logger.info("Initializing VÉRONA deterministic development seed process", { options }, "Seed");

  if (options.clean) {
    logger.info("Cleaning existing seedable development records...", {}, "Seed");
    await Promise.all([
      PermissionModel.deleteMany({}),
      RoleModel.deleteMany({}),
      StaffModel.deleteMany({}),
      CustomerModel.deleteMany({ email: /.*@example\.verona\.internal|.*@test\.verona\.internal/ }),
      ColorModel.deleteMany({}),
      SizeAttributeModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      BrandModel.deleteMany({}),
      ProductModel.deleteMany({}),
      ProductVariantModel.deleteMany({}),
      WarehouseModel.deleteMany({}),
      InventoryItemModel.deleteMany({}),
      FashionCollectionModel.deleteMany({}),
      CouponModel.deleteMany({}),
    ]);
  }

  // 1. SEED PERMISSIONS
  const permissionsData = [
    { code: "products.read", name: "Read Products", module: "catalog", description: "View catalog items" },
    { code: "products.create", name: "Create Products", module: "catalog", description: "Create new catalog items" },
    { code: "products.update", name: "Update Products", module: "catalog", description: "Edit catalog items" },
    { code: "products.delete", name: "Delete Products", module: "catalog", description: "Soft delete catalog items" },
    { code: "orders.read", name: "Read Orders", module: "orders", description: "View customer orders" },
    { code: "orders.update", name: "Update Orders", module: "orders", description: "Manage order state transitions" },
    { code: "inventory.read", name: "Read Inventory", module: "inventory", description: "View warehouse inventory" },
    { code: "inventory.update", name: "Update Inventory", module: "inventory", description: "Adjust warehouse inventory" },
    { code: "customers.read", name: "Read Customers", module: "customers", description: "View customer profiles" },
    { code: "customers.update", name: "Update Customers", module: "customers", description: "Manage customer status" },
    { code: "returns.read", name: "Read Returns", module: "returns", description: "View return requests" },
    { code: "returns.update", name: "Update Returns", module: "returns", description: "Process return requests" },
    { code: "refunds.read", name: "Read Refunds", module: "refunds", description: "View refund transactions" },
    { code: "refunds.process", name: "Process Refunds", module: "refunds", description: "Initiate and approve refunds" },
    { code: "marketing.read", name: "Read Marketing", module: "marketing", description: "View campaigns and coupons" },
    { code: "marketing.update", name: "Update Marketing", module: "marketing", description: "Manage marketing campaigns" },
    { code: "analytics.read", name: "Read Analytics", module: "analytics", description: "Access platform analytics" },
    { code: "staff.read", name: "Read Staff", module: "administration", description: "View internal staff" },
    { code: "staff.manage", name: "Manage Staff", module: "administration", description: "Manage internal staff and roles" },
  ];

  await PermissionModel.bulkWrite(
    permissionsData.map((p) => ({
      updateOne: { filter: { code: p.code }, update: { $set: p }, upsert: true },
    }))
  );

  // 2. SEED ROLES
  const rolesData = [
    {
      name: "Super Admin",
      slug: "super-admin",
      description: "Full system control across all operational modules",
      permissions: permissionsData.map((p) => p.code),
      isSystem: true,
      active: true,
    },
    {
      name: "Admin",
      slug: "admin",
      description: "Platform administrator with catalog, order, and customer permissions",
      permissions: [
        "products.read", "products.create", "products.update", "products.delete",
        "orders.read", "orders.update", "inventory.read", "inventory.update",
        "customers.read", "customers.update", "returns.read", "returns.update",
        "refunds.read", "refunds.process", "marketing.read", "marketing.update",
        "analytics.read", "staff.read",
      ],
      isSystem: true,
      active: true,
    },
    {
      name: "Inventory Manager",
      slug: "inventory-manager",
      description: "Warehouse stock management and fulfillment tracking",
      permissions: ["inventory.read", "inventory.update", "products.read", "orders.read"],
      isSystem: false,
      active: true,
    },
    {
      name: "Order Manager",
      slug: "order-manager",
      description: "Customer orders, fulfillment, and returns supervisor",
      permissions: ["orders.read", "orders.update", "returns.read", "returns.update", "customers.read"],
      isSystem: false,
      active: true,
    },
    {
      name: "Support Agent",
      slug: "support-agent",
      description: "Customer service and query resolution agent",
      permissions: ["customers.read", "orders.read", "returns.read"],
      isSystem: false,
      active: true,
    },
    {
      name: "Marketing Manager",
      slug: "marketing-manager",
      description: "Campaign, banner, and coupon administrator",
      permissions: ["marketing.read", "marketing.update", "analytics.read", "products.read"],
      isSystem: false,
      active: true,
    },
    {
      name: "Warehouse Staff",
      slug: "warehouse-staff",
      description: "Fulfillment and stock intake handler",
      permissions: ["inventory.read", "inventory.update"],
      isSystem: false,
      active: true,
    },
  ];

  for (const role of rolesData) {
    await RoleModel.updateOne({ slug: role.slug }, { $set: role }, { upsert: true });
  }

  const superAdminRole = await RoleModel.findOne({ slug: "super-admin" });

  // 3. SEED SAMPLE STAFF & CUSTOMER
  if (superAdminRole) {
    await StaffModel.updateOne(
      { email: "admin@verona.internal" },
      {
        $set: {
          authProviderId: "auth_dev_staff_001",
          email: "admin@verona.internal",
          firstName: "Dev",
          lastName: "Administrator",
          phone: "+919876543210",
          status: StaffStatus.ACTIVE,
          roles: [superAdminRole._id],
        },
      },
      { upsert: true }
    );
  }

  await CustomerModel.updateOne(
    { email: "customer@test.verona.internal" },
    {
      $set: {
        authProviderId: "auth_dev_cust_001",
        email: "customer@test.verona.internal",
        firstName: "Aria",
        lastName: "Sharma",
        displayName: "Aria Sharma",
        phone: "+919820098200",
        gender: Gender.WOMEN,
        status: CustomerStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        preferences: { marketingEmail: true, marketingSms: false, marketingWhatsapp: true },
      },
    },
    { upsert: true }
  );

  // 4. SEED COLORS
  const colorsData = [
    { name: "Obsidian Black", slug: "obsidian-black", hexCode: "#111111", displayOrder: 1, active: true },
    { name: "Ivory Pearl", slug: "ivory-pearl", hexCode: "#F9F6F0", displayOrder: 2, active: true },
    { name: "Royal Navy", slug: "royal-navy", hexCode: "#0A192F", displayOrder: 3, active: true },
    { name: "Olive Earth", slug: "olive-earth", hexCode: "#556B2F", displayOrder: 4, active: true },
    { name: "Crimson Velvet", slug: "crimson-velvet", hexCode: "#800020", displayOrder: 5, active: true },
    { name: "Champagne Gold", slug: "champagne-gold", hexCode: "#D4AF37", displayOrder: 6, active: true },
  ];

  for (const color of colorsData) {
    await ColorModel.updateOne({ slug: color.slug }, { $set: color }, { upsert: true });
  }

  // 5. SEED SIZES
  const sizesData = [
    { code: "XS", name: "Extra Small", category: "CLOTHING_ALPHA", sortOrder: 1, active: true },
    { code: "S", name: "Small", category: "CLOTHING_ALPHA", sortOrder: 2, active: true },
    { code: "M", name: "Medium", category: "CLOTHING_ALPHA", sortOrder: 3, active: true },
    { code: "L", name: "Large", category: "CLOTHING_ALPHA", sortOrder: 4, active: true },
    { code: "XL", name: "Extra Large", category: "CLOTHING_ALPHA", sortOrder: 5, active: true },
    { code: "XXL", name: "Double Extra Large", category: "CLOTHING_ALPHA", sortOrder: 6, active: true },
  ];

  for (const size of sizesData) {
    await SizeAttributeModel.updateOne({ code: size.code }, { $set: size }, { upsert: true });
  }

  // 6. SEED CATEGORIES (Hierarchical: Root -> Subcategories)
  const rootCategories = [
    {
      name: "Women",
      slug: "women",
      gender: Gender.WOMEN,
      sortOrder: 1,
      active: true,
      parentId: null,
      description: "Discover handcrafted couture dresses, heritage silk sarees, and contemporary festive ensembles designed for the modern woman.",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
      banner: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85",
      seo: {
        title: "Women's Couture Collection | VÉRONA",
        description: "Shop luxury women's fashion — silk evening gowns, handwoven sarees, tailored blouses, and contemporary Indian ethnic wear.",
        keywords: ["women's fashion", "couture dresses", "silk sarees", "ethnic wear"],
      },
    },
    {
      name: "Men",
      slug: "men",
      gender: Gender.MEN,
      sortOrder: 2,
      active: true,
      parentId: null,
      description: "Impeccably tailored blazers, Italian linen shirts, and sharp sartorial pieces crafted for the discerning gentleman.",
      image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      banner: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1600&q=85",
      seo: {
        title: "Men's Sartorial Collection | VÉRONA",
        description: "Explore luxury men's fashion — cashmere blazers, linen shirts, tailored trousers, and premium wardrobe essentials.",
        keywords: ["men's fashion", "blazers", "linen shirts", "tailored clothing"],
      },
    },
    {
      name: "Kids",
      slug: "kids",
      gender: Gender.KIDS,
      sortOrder: 3,
      active: true,
      parentId: null,
      description: "Comfort-crafted natural breathable cottons and playful designs for young connoisseurs.",
      image: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80",
      banner: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=1600&q=85",
      seo: {
        title: "Kids' Collection | VÉRONA",
        description: "Premium children's clothing in natural fabrics — organic cotton, breathable linens, and playful designs.",
        keywords: ["kids fashion", "children's clothing", "organic cotton"],
      },
    },
  ];

  const categoryMap = new Map<string, string>();

  for (const root of rootCategories) {
    const doc = await CategoryModel.findOneAndUpdate(
      { slug: root.slug },
      { $set: root },
      { upsert: true, new: true }
    );
    categoryMap.set(root.slug, doc._id.toString());
  }

  const subcategories = [
    {
      name: "Dresses",
      slug: "women-dresses",
      parentSlug: "women",
      gender: Gender.WOMEN,
      sortOrder: 1,
      description: "Flowing silks and sculptured silhouettes tailored for modern celebrations and evening occasions.",
      image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Women's Dresses | VÉRONA",
        description: "Shop luxury evening gowns, cocktail dresses, and contemporary silhouettes in mulberry silk and fine fabrics.",
        keywords: ["evening gowns", "silk dresses", "cocktail dresses"],
      },
    },
    {
      name: "Tops & Blouses",
      slug: "women-tops",
      parentSlug: "women",
      gender: Gender.WOMEN,
      sortOrder: 2,
      description: "Structured shirts, bespoke blouses, and handcrafted cashmere wraps for refined everyday wear.",
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Women's Tops & Blouses | VÉRONA",
        description: "Discover premium blouses, structured silk shirts, and designer tops from luxury fashion houses.",
        keywords: ["women's tops", "silk blouses", "designer shirts"],
      },
    },
    {
      name: "Ethnic Wear",
      slug: "women-ethnic",
      parentSlug: "women",
      gender: Gender.WOMEN,
      sortOrder: 3,
      description: "Handwoven heritage silks accented with delicate metallic zardozi borders and artisan embroidery.",
      image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Women's Ethnic Wear | VÉRONA",
        description: "Traditional Indian ethnic wear — handloom sarees, embroidered kurtas, and festive lehenga sets.",
        keywords: ["ethnic wear", "sarees", "kurtas", "festive wear"],
      },
    },
    {
      name: "Shirts",
      slug: "men-shirts",
      parentSlug: "men",
      gender: Gender.MEN,
      sortOrder: 1,
      description: "Breathable French flax linen and premium cotton shirts with artisanal finishing details.",
      image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Men's Shirts | VÉRONA",
        description: "Premium men's shirts in French linen, Egyptian cotton, and silk blends. Casual and formal styles.",
        keywords: ["men's shirts", "linen shirts", "cotton shirts", "formal shirts"],
      },
    },
    {
      name: "T-Shirts",
      slug: "men-tshirts",
      parentSlug: "men",
      gender: Gender.MEN,
      sortOrder: 2,
      description: "Heavyweight Supima cotton tees, drop-shoulder fits, and relaxed essentials for everyday luxury.",
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Men's T-Shirts | VÉRONA",
        description: "Premium men's t-shirts in Supima cotton and organic blends. Heavyweight, relaxed, and structured fits.",
        keywords: ["men's t-shirts", "supima cotton", "premium tees"],
      },
    },
    {
      name: "Blazers & Suits",
      slug: "men-blazers",
      parentSlug: "men",
      gender: Gender.MEN,
      sortOrder: 3,
      description: "Unstructured bespoke blazers and tailored suits cut from the finest cashmere and wool blends.",
      image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Men's Blazers & Suits | VÉRONA",
        description: "Luxury blazers and tailored suits in cashmere, wool, and Italian fabrics with bespoke finishing.",
        keywords: ["blazers", "suits", "cashmere blazer", "tailored suits"],
      },
    },
    {
      name: "Girls Clothing",
      slug: "kids-girls",
      parentSlug: "kids",
      gender: Gender.KIDS,
      sortOrder: 1,
      description: "Adorable dresses, playful sets, and comfortable organic cotton pieces for girls.",
      image: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Girls' Clothing | VÉRONA Kids",
        description: "Premium girls' clothing in organic cotton and natural fabrics.",
        keywords: ["girls clothing", "kids dresses", "organic cotton"],
      },
    },
    {
      name: "Boys Clothing",
      slug: "kids-boys",
      parentSlug: "kids",
      gender: Gender.KIDS,
      sortOrder: 2,
      description: "Smart casual shirts, comfortable trousers, and versatile outfits for boys.",
      image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Boys' Clothing | VÉRONA Kids",
        description: "Premium boys' clothing in breathable natural fabrics and playful designs.",
        keywords: ["boys clothing", "kids shirts", "boys trousers"],
      },
    },
    {
      name: "Trousers & Denim",
      slug: "men-trousers",
      parentSlug: "men",
      gender: Gender.MEN,
      sortOrder: 4,
      description: "Precision-pleated wool trousers and Japanese raw selvedge denim tailored for modern distinction.",
      image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Men's Trousers & Denim | VÉRONA",
        description: "Tailored trousers, pleated pants, and selvedge jeans in premium Italian and Japanese fabrics.",
        keywords: ["men's trousers", "selvedge jeans", "pleated pants"],
      },
    },
    {
      name: "Jackets & Outerwear",
      slug: "women-jackets",
      parentSlug: "women",
      gender: Gender.WOMEN,
      sortOrder: 4,
      description: "Structured wool capes, trench coats, and artisanal outerwear cut for dramatic silhouettes.",
      image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
      seo: {
        title: "Women's Jackets & Outerwear | VÉRONA",
        description: "Luxury coats, trench coats, and wool jackets for women.",
        keywords: ["women's coats", "wool trench", "luxury outerwear"],
      },
    },
  ];

  for (const sub of subcategories) {
    const parentId = categoryMap.get(sub.parentSlug);
    const doc = await CategoryModel.findOneAndUpdate(
      { slug: sub.slug },
      {
        $set: {
          name: sub.name,
          slug: sub.slug,
          gender: sub.gender,
          parentId,
          sortOrder: sub.sortOrder,
          active: true,
          description: sub.description,
          image: sub.image,
          seo: sub.seo,
        },
      },
      { upsert: true, new: true }
    );
    categoryMap.set(sub.slug, doc._id.toString());
  }

  // 7. SEED BRANDS
  const brandsData = [
    {
      name: "VÉRONA Atelier",
      slug: "verona-atelier",
      description: "Our signature in-house couture fashion line",
      logo: "https://images.unsplash.com/photo-1544441893-675973e31985?w=200",
      active: true,
      sortOrder: 1,
    },
    {
      name: "Aurelia Milano",
      slug: "aurelia-milano",
      description: "Contemporary Italian tailoring & clean silhouettes",
      logo: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200",
      active: true,
      sortOrder: 2,
    },
    {
      name: "Maison Royale",
      slug: "maison-royale",
      description: "Opulent formal wear crafted with bespoke fabrics",
      logo: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200",
      active: true,
      sortOrder: 3,
    },
    {
      name: "Noir & Blanc",
      slug: "noir-et-blanc",
      description: "Minimalist monochrome wardrobe essentials",
      logo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200",
      active: true,
      sortOrder: 4,
    },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandsData) {
    const doc = await BrandModel.findOneAndUpdate(
      { slug: b.slug },
      { $set: b },
      { upsert: true, new: true }
    );
    brandMap.set(b.slug, doc._id.toString());
  }

  // 8. SEED WAREHOUSES
  const warehousesData = [
    {
      name: "Mumbai West Primary Hub",
      code: "WH-MUM-01",
      address: {
        addressLine1: "Plot 42, Logistics Park, Bhiwandi",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pincode: "421302",
      },
      contact: {
        phone: "+912229988776",
        email: "logistics-mum@verona.internal",
        contactPerson: "Rajesh K.",
      },
      active: true,
      operatingStatus: "OPERATIONAL",
    },
    {
      name: "Bengaluru South Distribution Hub",
      code: "WH-BLR-01",
      address: {
        addressLine1: "Industrial Area Phase 2, Electronic City",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        pincode: "560100",
      },
      contact: {
        phone: "+918029988112",
        email: "logistics-blr@verona.internal",
        contactPerson: "Sunil M.",
      },
      active: true,
      operatingStatus: "OPERATIONAL",
    },
  ];

  const warehouseMap = new Map<string, string>();
  for (const wh of warehousesData) {
    const doc = await WarehouseModel.findOneAndUpdate(
      { code: wh.code },
      { $set: wh },
      { upsert: true, new: true }
    );
    warehouseMap.set(wh.code, doc._id.toString());
  }

  // 9. SEED PRODUCTS
  const productsData = [
    {
      name: "Silk Charmeuse Evening Gown",
      slug: "silk-charmeuse-evening-gown",
      description: "An ethereal floor-length evening gown crafted from 100% pure mulberry silk charmeuse with fluid draped neckline.",
      brandSlug: "verona-atelier",
      categorySlugs: ["women", "women-dresses"],
      gender: Gender.WOMEN,
      productType: "Evening Gown",
      fabric: "100% Mulberry Silk",
      fit: "Tailored Slim Fit",
      pattern: "Solid Draped",
      occasion: "Evening / Gala",
      season: "All-Season",
      tags: ["silk", "gown", "evening", "haute-couture"],
      images: [
        { url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800", alt: "Silk Gown Front", isPrimary: true, sortOrder: 1 },
        { url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800", alt: "Silk Gown Back", isPrimary: false, sortOrder: 2 },
      ],
      careInstructions: ["Dry clean only", "Iron on reverse low heat"],
      specifications: [
        { key: "Closure", value: "Concealed side zipper" },
        { key: "Lining", value: "Fully lined with silk crepe" },
      ],
      baseMrp: 1899900,
      sellingPrice: 1499900,
      status: ProductStatus.PUBLISHED,
      featured: true,
      bestseller: true,
      newArrival: false,
    },
    {
      name: "Hand-Tailored Cashmere Blazer",
      slug: "hand-tailored-cashmere-blazer",
      description: "Unstructured bespoke blazer cut from Mongolian 2-ply cashmere. Soft Italian shoulders with natural horn buttons.",
      brandSlug: "aurelia-milano",
      categorySlugs: ["men", "men-blazers"],
      gender: Gender.MEN,
      productType: "Blazer",
      fabric: "100% Mongolian Cashmere",
      fit: "Classic Italian Fit",
      pattern: "Subtle Herringbone",
      occasion: "Formal / Business",
      season: "Autumn / Winter",
      tags: ["cashmere", "blazer", "italian", "luxury"],
      images: [
        { url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800", alt: "Cashmere Blazer Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Professional dry clean only"],
      specifications: [
        { key: "Buttons", value: "Genuine horn buttons" },
        { key: "Vent", value: "Double back vent" },
      ],
      baseMrp: 3200000,
      sellingPrice: 2499900,
      status: ProductStatus.PUBLISHED,
      featured: true,
      bestseller: false,
      newArrival: true,
    },
    {
      name: "Relaxed Linen Resort Shirt",
      slug: "relaxed-linen-resort-shirt",
      description: "Breathable French flax linen shirt tailored with a relaxed camp collar and Mother of Pearl buttons.",
      brandSlug: "noir-et-blanc",
      categorySlugs: ["men", "men-shirts"],
      gender: Gender.MEN,
      productType: "Shirt",
      fabric: "100% French Linen",
      fit: "Relaxed Fit",
      pattern: "Solid",
      occasion: "Resort / Casual",
      season: "Summer",
      tags: ["linen", "shirt", "summer", "relaxed"],
      images: [
        { url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", alt: "Linen Shirt Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Machine wash gentle 30°C", "Hang dry in shade"],
      specifications: [
        { key: "Collar", value: "Camp collar" },
        { key: "Buttons", value: "Mother of Pearl" },
      ],
      baseMrp: 499900,
      sellingPrice: 349900,
      status: ProductStatus.PUBLISHED,
      featured: false,
      bestseller: true,
      newArrival: true,
    },
    {
      name: "Architectural Pleated Midi Skirt",
      slug: "architectural-pleated-midi-skirt",
      description: "Sunburst pleats falling into a sharp A-line profile with elasticated metallic waistband.",
      brandSlug: "maison-royale",
      categorySlugs: ["women", "women-dresses"],
      gender: Gender.WOMEN,
      productType: "Skirt",
      fabric: "Fine Crepe Blend",
      fit: "A-Line",
      pattern: "Sunburst Pleats",
      occasion: "Cocktail / Festive",
      season: "All-Season",
      tags: ["skirt", "pleated", "midi", "festive"],
      images: [
        { url: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800", alt: "Pleated Skirt Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Hand wash cold", "Do not iron pleats directly"],
      specifications: [
        { key: "Length", value: "Midi 78cm" },
        { key: "Waist", value: "Elasticated high-rise" },
      ],
      baseMrp: 899900,
      sellingPrice: 649900,
      status: ProductStatus.PUBLISHED,
      featured: false,
      bestseller: false,
      newArrival: false,
    },
    {
      name: "Heavyweight Supima Cotton Tee",
      slug: "heavyweight-supima-cotton-tee",
      description: "280 GSM long-staple Supima cotton t-shirt with ribbed crew neck and relaxed drop-shoulder cut.",
      brandSlug: "noir-et-blanc",
      categorySlugs: ["men", "men-tshirts"],
      gender: Gender.MEN,
      productType: "T-Shirt",
      fabric: "100% American Supima Cotton",
      fit: "Relaxed Drop-Shoulder",
      pattern: "Solid",
      occasion: "Casual / Everyday",
      season: "All-Season",
      tags: ["cotton", "t-shirt", "supima", "minimalist"],
      images: [
        { url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800", alt: "Supima Tee Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Machine wash cold", "Tumble dry low"],
      specifications: [
        { key: "Fabric Weight", value: "280 GSM" },
        { key: "Neckline", value: "Ribbed Crew" },
      ],
      baseMrp: 299900,
      sellingPrice: 219900,
      status: ProductStatus.PUBLISHED,
      featured: false,
      bestseller: true,
      newArrival: true,
    },
    {
      name: "Raw Selvedge Tapered Jeans",
      slug: "raw-selvedge-tapered-jeans",
      description: "14oz Japanese Kuroki mill raw selvedge denim. Shuttle-loom woven with signature red-line selvedge ID.",
      brandSlug: "aurelia-milano",
      categorySlugs: ["men", "men-trousers"],
      gender: Gender.MEN,
      productType: "Jeans",
      fabric: "14oz Japanese Raw Selvedge Denim",
      fit: "Slim Tapered",
      pattern: "Indigo Raw",
      occasion: "Casual",
      season: "All-Season",
      tags: ["denim", "selvedge", "japanese", "raw-denim"],
      images: [
        { url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800", alt: "Selvedge Jeans Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Wear raw for 6 months before first soak", "Cold hand wash inside out"],
      specifications: [
        { key: "Mill Origin", value: "Kuroki Mills, Okayama" },
        { key: "Hardware", value: "Custom solid copper rivets" },
      ],
      baseMrp: 999900,
      sellingPrice: 749900,
      status: ProductStatus.PUBLISHED,
      featured: true,
      bestseller: false,
      newArrival: false,
    },
    {
      name: "Handloom Chanderi Silk Saree",
      slug: "handloom-chanderi-silk-saree",
      description: "Tissue silk Chanderi handwoven by master artisans featuring intricate pure gold zardozi borders and butti motifs.",
      brandSlug: "verona-atelier",
      categorySlugs: ["women", "women-ethnic"],
      gender: Gender.WOMEN,
      productType: "Saree",
      fabric: "Handloom Chanderi Silk",
      fit: "Traditional Drape (6.5m)",
      pattern: "Zardozi Floral Butti",
      occasion: "Festive / Wedding",
      season: "All-Season",
      tags: ["saree", "handloom", "chanderi", "festive", "zardozi"],
      images: [
        { url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800", alt: "Chanderi Saree Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Dry clean only", "Store folded in muslin cloth"],
      specifications: [
        { key: "Weave Technique", value: "Handloom Eknaliya" },
        { key: "Blouse Piece", value: "Unstitched 80cm included" },
      ],
      baseMrp: 2899900,
      sellingPrice: 2299900,
      status: ProductStatus.PUBLISHED,
      featured: true,
      bestseller: true,
      newArrival: false,
    },
    {
      name: "Embroidered Anarkali Suit Set",
      slug: "embroidered-anarkali-suit-set",
      description: "Regal floor-length Anarkali ensemble crafted in mulberry georgette with delicate marodi thread embroidery and organza dupatta.",
      brandSlug: "maison-royale",
      categorySlugs: ["women", "women-ethnic"],
      gender: Gender.WOMEN,
      productType: "Ethnic Set",
      fabric: "Mulberry Georgette & Silk Organza",
      fit: "Flared Anarkali Silhouette",
      pattern: "Artisanal Marodi Embroidery",
      occasion: "Festive / Celebration",
      season: "All-Season",
      tags: ["anarkali", "ethnic", "festive", "embroidery"],
      images: [
        { url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800", alt: "Anarkali Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Professional dry clean only"],
      specifications: [
        { key: "Set Includes", value: "Kurta, Churidar & Dupatta" },
        { key: "Flair", value: "4.5 meters circular flare" },
      ],
      baseMrp: 1899900,
      sellingPrice: 1499900,
      status: ProductStatus.PUBLISHED,
      featured: false,
      bestseller: false,
      newArrival: true,
    },
    {
      name: "Cashmere Wrap Collar Sweater",
      slug: "cashmere-wrap-collar-sweater",
      description: "Luxuriously soft oversized knit spun from featherweight Himalayan cashmere with an asymmetrical drape neckline.",
      brandSlug: "aurelia-milano",
      categorySlugs: ["women", "women-tops"],
      gender: Gender.WOMEN,
      productType: "Sweater",
      fabric: "100% Himalayan Cashmere",
      fit: "Relaxed Drape",
      pattern: "Fine Gauge Knit",
      occasion: "Casual / Travel",
      season: "Autumn / Winter",
      tags: ["cashmere", "sweater", "knitwear", "luxury"],
      images: [
        { url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800", alt: "Cashmere Sweater Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Hand wash in cold water with wool detergent", "Dry flat"],
      specifications: [
        { key: "Gauge", value: "12-gauge 2-ply" },
        { key: "Origin", value: "Inner Mongolia" },
      ],
      baseMrp: 1599900,
      sellingPrice: 1199900,
      status: ProductStatus.PUBLISHED,
      featured: false,
      bestseller: true,
      newArrival: false,
    },
    {
      name: "Double-Breasted Crepe Trench",
      slug: "double-breasted-crepe-trench",
      description: "Tailored Italian fluid crepe trench with storm flaps, belted waist, and horn buckle hardware.",
      brandSlug: "verona-atelier",
      categorySlugs: ["women", "women-jackets"],
      gender: Gender.WOMEN,
      productType: "Trench Coat",
      fabric: "Italian Triacetate Crepe",
      fit: "Tailored Double-Breasted",
      pattern: "Solid",
      occasion: "Outerwear / Executive",
      season: "Autumn / Spring",
      tags: ["trench", "coat", "outerwear", "tailored"],
      images: [
        { url: "https://images.unsplash.com/photo-1544441893-675973e31985?w=800", alt: "Crepe Trench Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Dry clean only"],
      specifications: [
        { key: "Length", value: "115cm mid-calf" },
        { key: "Buckles", value: "Leather-wrapped hardware" },
      ],
      baseMrp: 2499900,
      sellingPrice: 1999900,
      status: ProductStatus.PUBLISHED,
      featured: true,
      bestseller: false,
      newArrival: true,
    },
    {
      name: "Organic Cotton Tier Girls Dress",
      slug: "organic-cotton-tier-girls-dress",
      description: "GOTS-certified breathable organic cotton voile with tiered gathered skirt and hand-smocked bodice.",
      brandSlug: "verona-atelier",
      categorySlugs: ["kids", "kids-girls"],
      gender: Gender.KIDS,
      productType: "Dress",
      fabric: "100% GOTS Certified Organic Cotton",
      fit: "Comfort Flare",
      pattern: "Pastel Meadow Print",
      occasion: "Casual / Party",
      season: "Summer",
      tags: ["kids", "organic", "cotton", "dress"],
      images: [
        { url: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800", alt: "Girls Dress Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Machine wash gentle 30°C", "Warm iron"],
      specifications: [
        { key: "Certification", value: "GOTS Certified Organic" },
        { key: "Closure", value: "Mother of Pearl back buttons" },
      ],
      baseMrp: 449900,
      sellingPrice: 329900,
      status: ProductStatus.PUBLISHED,
      featured: false,
      bestseller: true,
      newArrival: true,
    },
    {
      name: "Linen Mandarin Collar Boys Shirt",
      slug: "linen-mandarin-collar-boys-shirt",
      description: "Soft European flax linen shirt featuring neat mandarin band collar and roll-up button sleeve tabs.",
      brandSlug: "noir-et-blanc",
      categorySlugs: ["kids", "kids-boys"],
      gender: Gender.KIDS,
      productType: "Shirt",
      fabric: "100% European Flax Linen",
      fit: "Classic Fit",
      pattern: "Solid",
      occasion: "Smart Casual",
      season: "Summer",
      tags: ["kids", "boys", "linen", "shirt"],
      images: [
        { url: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800", alt: "Boys Shirt Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Machine wash 40°C", "Hang dry"],
      specifications: [
        { key: "Collar", value: "Mandarin Band" },
        { key: "Sleeves", value: "Convertible roll-up with tab" },
      ],
      baseMrp: 399900,
      sellingPrice: 289900,
      status: ProductStatus.PUBLISHED,
      featured: false,
      bestseller: false,
      newArrival: true,
    },
    {
      name: "Italian Wool Single-Breasted Jacket",
      slug: "italian-wool-single-breasted-jacket",
      description: "Super 130s Vitale Barberis Canonico virgin wool jacket with half-canvas construction and notched lapels.",
      brandSlug: "verona-atelier",
      categorySlugs: ["men", "men-blazers"],
      gender: Gender.MEN,
      productType: "Jacket",
      fabric: "100% Super 130s Virgin Wool",
      fit: "Modern Sartorial Fit",
      pattern: "Micro-Houndstooth",
      occasion: "Business / Evening",
      season: "Autumn / Winter",
      tags: ["wool", "jacket", "italian", "bespoke"],
      images: [
        { url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800", alt: "Wool Jacket Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Professional dry clean only"],
      specifications: [
        { key: "Construction", value: "Half-canvas interior" },
        { key: "Lining", value: "Cupro Bemberg lining" },
      ],
      baseMrp: 3499900,
      sellingPrice: 2699900,
      status: ProductStatus.PUBLISHED,
      featured: true,
      bestseller: false,
      newArrival: false,
    },
    {
      name: "Pima Cotton Minimalist Hoodie",
      slug: "pima-cotton-minimalist-hoodie",
      description: "420 GSM French Terry knit from Peruvian Pima cotton. Clean unbranded lines with double-layered structured hood.",
      brandSlug: "noir-et-blanc",
      categorySlugs: ["men", "men-tshirts"],
      gender: Gender.MEN,
      productType: "Hoodie",
      fabric: "100% Peruvian Pima Cotton French Terry",
      fit: "Relaxed Boxy Fit",
      pattern: "Solid",
      occasion: "Lounge / Casual",
      season: "All-Season",
      tags: ["hoodie", "pima-cotton", "streetwear", "minimalist"],
      images: [
        { url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800", alt: "Pima Hoodie Front", isPrimary: true, sortOrder: 1 },
      ],
      careInstructions: ["Machine wash cold", "Dry flat"],
      specifications: [
        { key: "Knit Type", value: "420 GSM French Terry" },
        { key: "Pockets", value: "Concealed side seam pockets" },
      ],
      baseMrp: 599900,
      sellingPrice: 449900,
      status: ProductStatus.PUBLISHED,
      featured: false,
      bestseller: true,
      newArrival: false,
    },
  ];

  let variantCount = 0;
  let inventoryCount = 0;
  const productIds: string[] = [];

  for (const prod of productsData) {
    const brandId = brandMap.get(prod.brandSlug)!;
    const categoryIds = prod.categorySlugs.map((slug) => categoryMap.get(slug)!).filter(Boolean);

    const productDoc = await ProductModel.findOneAndUpdate(
      { slug: prod.slug },
      {
        $set: {
          name: prod.name,
          slug: prod.slug,
          description: prod.description,
          brandId,
          categoryIds,
          gender: prod.gender,
          productType: prod.productType,
          fabric: prod.fabric,
          fit: prod.fit,
          pattern: prod.pattern,
          occasion: prod.occasion,
          season: prod.season,
          tags: prod.tags,
          images: prod.images,
          careInstructions: prod.careInstructions,
          specifications: prod.specifications,
          status: prod.status,
          visibility: ProductVisibility.PUBLIC,
          featured: prod.featured,
          bestseller: prod.bestseller,
          newArrival: prod.newArrival,
        },
      },
      { upsert: true, new: true }
    );

    productIds.push(productDoc._id.toString());

    // 10. SEED PRODUCT VARIANTS WITH DIVERGENT COMBINATIONS (Phase 12 Matrix)
    type SeedVariantDef = {
      color: { name: string; slug: string; hexCode: string; secondaryHexCode?: string };
      sizes: string[];
      priceOverride?: { mrp: number; sellingPrice: number };
      inactiveSizes?: string[];
      variantImages?: string[];
    };

    let variantDefinitions: SeedVariantDef[];

    if (prod.slug === "heavyweight-supima-cotton-tee") {
      variantDefinitions = [
        {
          color: { name: "Obsidian Black", slug: "obsidian-black", hexCode: "#111111" },
          sizes: ["S", "M", "L", "XL"],
          variantImages: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"],
        },
        {
          color: { name: "Ivory Pearl", slug: "ivory-pearl", hexCode: "#F9F6F0" },
          // Missing S: tests invalid combination (Ivory Pearl + S)
          sizes: ["M", "L", "XL"],
          variantImages: ["https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800"],
        },
        {
          color: { name: "Sage Green", slug: "sage-green", hexCode: "#8A9A86" },
          // Missing XL: tests invalid combination (Sage Green + XL)
          sizes: ["S", "M", "L"],
          variantImages: ["https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800"],
        },
      ];
    } else if (prod.slug === "raw-selvedge-tapered-jeans") {
      // Numeric sizes & Single-color product
      variantDefinitions = [
        {
          color: { name: "Raw Indigo", slug: "raw-indigo", hexCode: "#1B2A4A" },
          sizes: ["30", "32", "34", "36"],
          variantImages: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=800"],
        },
      ];
    } else if (prod.slug === "handloom-chanderi-silk-saree") {
      // One Size product
      variantDefinitions = [
        {
          color: { name: "Royal Gold", slug: "royal-gold", hexCode: "#D4AF37", secondaryHexCode: "#F9F6F0" },
          sizes: ["ONE_SIZE"],
          variantImages: [prod.images[0]?.url || ""],
        },
        {
          color: { name: "Crimson Silk", slug: "crimson-silk", hexCode: "#8B0000" },
          sizes: ["ONE_SIZE"],
          variantImages: [prod.images[0]?.url || ""],
        },
      ];
    } else if (prod.slug === "italian-wool-single-breasted-jacket") {
      // Variant-specific media & inactive variant test
      variantDefinitions = [
        {
          color: { name: "Micro Houndstooth", slug: "micro-houndstooth", hexCode: "#2B2B2B", secondaryHexCode: "#E8E8E8" },
          sizes: ["S", "M", "L", "XL"],
          variantImages: ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800"],
        },
        {
          color: { name: "Midnight Navy", slug: "midnight-navy", hexCode: "#001F3F" },
          sizes: ["M", "L", "XL"],
          inactiveSizes: ["XL"], // Inactive variant test
          variantImages: ["https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800"],
        },
      ];
    } else {
      // Default diversified combinations
      variantDefinitions = [
        {
          color: { name: "Obsidian Black", slug: "obsidian-black", hexCode: "#111111" },
          sizes: ["S", "M", "L"],
          variantImages: [prod.images[0]?.url || ""],
        },
        {
          color: { name: "Ivory Pearl", slug: "ivory-pearl", hexCode: "#F9F6F0" },
          sizes: ["M", "L"], // Missing S
          variantImages: [prod.images[0]?.url || ""],
        },
      ];
    }

    for (const vDef of variantDefinitions) {
      for (const size of vDef.sizes) {
        const isInactive = vDef.inactiveSizes?.includes(size) ?? false;
        const sku = `VER-${prod.slug.slice(0, 3).toUpperCase()}-${vDef.color.slug.slice(0, 3).toUpperCase()}-${size}`;
        const baseMrp = vDef.priceOverride ? vDef.priceOverride.mrp : prod.baseMrp;
        const sellingPrice = vDef.priceOverride ? vDef.priceOverride.sellingPrice : prod.sellingPrice;

        const variantDoc = await ProductVariantModel.findOneAndUpdate(
          { sku },
          {
            $set: {
              productId: productDoc._id,
              sku,
              color: vDef.color,
              size,
              variantImages: vDef.variantImages || [prod.images[0]?.url || ""],
              priceOverride: !!vDef.priceOverride,
              mrp: baseMrp,
              sellingPrice,
              status: isInactive ? VariantStatus.INACTIVE : VariantStatus.ACTIVE,
              active: !isInactive,
            },
          },
          { upsert: true, new: true }
        );
        variantCount++;

        // 11. SEED INVENTORY (Variant distributed in WH-MUM-01 & WH-BLR-01)
        const whMumId = warehouseMap.get("WH-MUM-01")!;
        const whBlrId = warehouseMap.get("WH-BLR-01")!;

        // Out of stock test on Ivory Pearl L
        const isOutOfStockTest = size === "L" && vDef.color.slug === "ivory-pearl";
        const availableQty = isOutOfStockTest || isInactive ? 0 : 25;
        const invStatus = isOutOfStockTest || isInactive ? InventoryStatus.OUT_OF_STOCK : InventoryStatus.IN_STOCK;

        await InventoryItemModel.findOneAndUpdate(
          { warehouseId: whMumId, variantId: variantDoc._id },
          {
            $set: {
              warehouseId: whMumId,
              variantId: variantDoc._id,
              availableQuantity: availableQty,
              reservedQuantity: 0,
              damagedQuantity: 0,
              incomingQuantity: 10,
              reorderLevel: 5,
              status: invStatus,
            },
          },
          { upsert: true }
        );
        inventoryCount++;

        await InventoryItemModel.findOneAndUpdate(
          { warehouseId: whBlrId, variantId: variantDoc._id },
          {
            $set: {
              warehouseId: whBlrId,
              variantId: variantDoc._id,
              availableQuantity: isOutOfStockTest || isInactive ? 0 : 15,
              reservedQuantity: 0,
              damagedQuantity: 0,
              incomingQuantity: 5,
              reorderLevel: 5,
              status: invStatus,
            },
          },
          { upsert: true }
        );
        inventoryCount++;
      }
    }

  }

  // 12. SEED FASHION COLLECTIONS
  const womenCatId = categoryMap.get("women");
  const menCatId = categoryMap.get("men");
  const womenDressesCatId = categoryMap.get("women-dresses");
  const menBlazersId = categoryMap.get("men-blazers");
  const womenEthnicId = categoryMap.get("women-ethnic");
  const menShirtsId = categoryMap.get("men-shirts");

  const collectionsData = [
    {
      name: "The Noir Collection",
      slug: "the-noir-collection",
      description: "Monochromatic precision and deep midnight textures. A curated edit of obsidian-toned garments featuring sculpted silhouettes, textured weaves, and understated dramatic elegance.",
      heroImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
      banner: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=85",
      active: true,
      productIds,
      categoryIds: [womenCatId, menCatId, womenDressesCatId].filter(Boolean),
      sortOrder: 1,
      seo: {
        title: "The Noir Collection | VÉRONA",
        description: "Explore monochromatic luxury — obsidian evening wear, midnight textures, and sculpted silhouettes.",
        keywords: ["noir collection", "black fashion", "monochrome luxury"],
      },
    },
    {
      name: "Summer Atelier 2026",
      slug: "summer-atelier-2026",
      description: "Breathable silks, French flax, and sun-washed tones. Designed for warm-weather elegance with effortless Mediterranean-inspired draping and resort silhouettes.",
      heroImage: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=85",
      banner: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=85",
      active: true,
      productIds: [productIds[0], productIds[2], productIds[4], productIds[11]].filter(Boolean),
      categoryIds: [menCatId, menShirtsId].filter(Boolean),
      sortOrder: 2,
      seo: {
        title: "Summer Atelier 2026 | VÉRONA",
        description: "Resort wear and summer fashion — linen shirts, silk dresses, and lightweight luxury for warm weather.",
        keywords: ["summer fashion", "resort wear", "linen collection"],
      },
    },
    {
      name: "Heritage Festive Edit",
      slug: "heritage-festive-edit",
      description: "Celebrating India's finest textile heritage — handwoven Chanderi tissue silks, intricate zardozi embroidery, and ceremonial ensembles crafted by fourth-generation artisan weavers.",
      heroImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85",
      banner: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
      active: true,
      productIds: [productIds[0], productIds[3], productIds[6], productIds[7]].filter(Boolean),
      categoryIds: [womenCatId, womenEthnicId].filter(Boolean),
      sortOrder: 3,
      seo: {
        title: "Heritage Festive Edit | VÉRONA",
        description: "Traditional Indian festive wear — handloom sarees, zardozi kurtas, and ceremonial ensembles.",
        keywords: ["festive collection", "Indian heritage", "handloom sarees", "zardozi"],
      },
    },
    {
      name: "The Boardroom Edit",
      slug: "the-boardroom-edit",
      description: "Impeccably tailored power pieces for the modern executive. Structured blazers, precision-cut trousers, and silk-blend shirts that command presence in every professional setting.",
      heroImage: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
      banner: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=85",
      active: true,
      productIds: [productIds[1], productIds[2], productIds[5], productIds[12]].filter(Boolean),
      categoryIds: [menCatId, menBlazersId, menShirtsId].filter(Boolean),
      sortOrder: 4,
      seo: {
        title: "The Boardroom Edit | VÉRONA",
        description: "Executive fashion — tailored blazers, structured suits, and premium formal wear for professionals.",
        keywords: ["formal wear", "business fashion", "tailored suits", "executive style"],
      },
    },
  ];

  for (const col of collectionsData) {
    const colDoc = await FashionCollectionModel.findOneAndUpdate(
      { slug: col.slug },
      { $set: col },
      { upsert: true, new: true }
    );
    if (colDoc && colDoc.productIds && colDoc.productIds.length > 0) {
      await ProductModel.updateMany(
        { _id: { $in: colDoc.productIds } },
        { $addToSet: { collectionIds: colDoc._id } }
      );
    }
  }

  // 13. SEED COUPONS
  const couponsData = [
    {
      code: "WELCOME10",
      type: DiscountType.PERCENTAGE,
      value: 10, // 10%
      minCartValue: 200000, // ₹2,000.00
      maxDiscountAmount: 100000, // ₹1,000.00
      usageLimit: 1000,
      perCustomerUsageLimit: 1,
      startAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      active: true,
      stackable: false,
    },
    {
      code: "VERONA500",
      type: DiscountType.FIXED_AMOUNT,
      value: 50000, // ₹500.00
      minCartValue: 500000, // ₹5,000.00
      usageLimit: 500,
      perCustomerUsageLimit: 1,
      startAt: new Date(),
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      active: true,
      stackable: false,
    },
  ];

  for (const c of couponsData) {
    await CouponModel.updateOne({ code: c.code }, { $set: c }, { upsert: true });
  }

  const counts = {
    permissions: permissionsData.length,
    roles: rolesData.length,
    colors: colorsData.length,
    sizes: sizesData.length,
    categories: rootCategories.length + subcategories.length,
    brands: brandsData.length,
    products: productsData.length,
    variants: variantCount,
    warehouses: warehousesData.length,
    inventoryItems: inventoryCount,
    collections: collectionsData.length,
    coupons: couponsData.length,
  };

  logger.info("VÉRONA deterministic database seeding completed successfully", counts, "Seed");
  return { success: true, counts };
}
