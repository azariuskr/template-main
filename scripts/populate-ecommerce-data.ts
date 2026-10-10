#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import {
  CMS_SECTION_KEYS,
  CMS_SEED_DEFAULTS,
} from "../src/components/admin/cms/cms-constants";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

if (!process.env.DATABASE_URL) {
  console.error("[blocker] DATABASE_URL is not set (.env.local/.env).");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const stats = {
  created: {} as Record<string, number>,
  updated: {} as Record<string, number>,
  blockers: [] as string[],
};

function bump(bucket: "created" | "updated", key: string) {
  stats[bucket][key] = (stats[bucket][key] ?? 0) + 1;
}

const now = new Date();

async function upsertBrand(slug: string, name: string, description: string) {
  const found = await sql<{ id: string }[]>`select id from brand where slug = ${slug} limit 1`;
  if (found.length) {
    await sql`update brand set name = ${name}, description = ${description}, is_active = true, updated_at = now() where id = ${found[0].id}`;
    bump("updated", "brand");
    return found[0].id;
  }
  const inserted = await sql<{ id: string }[]>`
    insert into brand (name, slug, description, is_active, sort_order)
    values (${name}, ${slug}, ${description}, true, 0)
    returning id
  `;
  bump("created", "brand");
  return inserted[0].id;
}

async function upsertCategory(slug: string, name: string, description: string, parentId: string | null) {
  const found = await sql<{ id: string }[]>`select id from category where slug = ${slug} limit 1`;
  if (found.length) {
    await sql`update category set name = ${name}, description = ${description}, parent_id = ${parentId}, is_active = true, updated_at = now() where id = ${found[0].id}`;
    bump("updated", "category");
    return found[0].id;
  }
  const inserted = await sql<{ id: string }[]>`
    insert into category (name, slug, description, parent_id, is_active, sort_order)
    values (${name}, ${slug}, ${description}, ${parentId}, true, 0)
    returning id
  `;
  bump("created", "category");
  return inserted[0].id;
}

async function upsertColor(name: string, hex: string, sortOrder: number) {
  const found = await sql<{ id: string }[]>`select id from product_color where name = ${name} limit 1`;
  if (found.length) {
    await sql`update product_color set hex_code = ${hex}, sort_order = ${sortOrder} where id = ${found[0].id}`;
    bump("updated", "product_color");
    return found[0].id;
  }
  const inserted = await sql<{ id: string }[]>`
    insert into product_color (name, hex_code, sort_order)
    values (${name}, ${hex}, ${sortOrder})
    returning id
  `;
  bump("created", "product_color");
  return inserted[0].id;
}

async function upsertSize(name: string, sizeCategory: string, sortOrder: number) {
  const found = await sql<{ id: string }[]>`select id from product_size where name = ${name} and size_category = ${sizeCategory} limit 1`;
  if (found.length) {
    await sql`update product_size set sort_order = ${sortOrder} where id = ${found[0].id}`;
    bump("updated", "product_size");
    return found[0].id;
  }
  const inserted = await sql<{ id: string }[]>`
    insert into product_size (name, size_category, sort_order)
    values (${name}, ${sizeCategory}, ${sortOrder})
    returning id
  `;
  bump("created", "product_size");
  return inserted[0].id;
}

async function upsertUser(userId: string, name: string, email: string) {
  const found = await sql<{ id: string }[]>`select id from "user" where id = ${userId} limit 1`;
  if (found.length) {
    await sql`update "user" set name = ${name}, email = ${email}, email_verified = true, role = 'user', updated_at = now() where id = ${userId}`;
    bump("updated", "user");
  } else {
    await sql`
      insert into "user" (id, name, email, email_verified, role, created_at, updated_at)
      values (${userId}, ${name}, ${email}, true, 'user', now(), now())
    `;
    bump("created", "user");
  }

  const accountId = `demo-account-${userId}`;
  const accountExists = await sql<{ id: string }[]>`select id from account where id = ${accountId} limit 1`;
  if (accountExists.length) {
    await sql`update account set account_id = ${email}, provider_id = 'credential', password = 'demo-password-not-for-login', updated_at = now() where id = ${accountId}`;
    bump("updated", "account");
  } else {
    await sql`
      insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
      values (${accountId}, ${email}, 'credential', ${userId}, 'demo-password-not-for-login', now(), now())
    `;
    bump("created", "account");
  }
}

async function upsertProduct(input: {
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  salePrice: number | null;
  brandId: string;
  categoryId: string;
  tags: string[];
  isFeatured?: boolean;
}) {
  const found = await sql<{ id: string }[]>`select id from product where slug = ${input.slug} limit 1`;
  if (found.length) {
    await sql`
      update product
      set name = ${input.name},
          description = ${input.description},
          short_description = ${input.shortDescription},
          base_price = ${input.basePrice},
          sale_price = ${input.salePrice},
          status = 'active',
          is_featured = ${input.isFeatured ?? false},
          tags = ${input.tags},
          brand_id = ${input.brandId},
          category_id = ${input.categoryId},
          published_at = coalesce(published_at, now()),
          updated_at = now()
      where id = ${found[0].id}
    `;
    bump("updated", "product");
    return found[0].id;
  }

  const inserted = await sql<{ id: string }[]>`
    insert into product (
      name, slug, description, short_description,
      base_price, sale_price, status, is_featured, tags,
      brand_id, category_id, published_at
    )
    values (
      ${input.name}, ${input.slug}, ${input.description}, ${input.shortDescription},
      ${input.basePrice}, ${input.salePrice}, 'active', ${input.isFeatured ?? false}, ${input.tags},
      ${input.brandId}, ${input.categoryId}, now()
    )
    returning id
  `;
  bump("created", "product");
  return inserted[0].id;
}

async function upsertVariant(input: {
  productId: string;
  sku: string;
  colorId: string;
  sizeId: string;
  stock: number;
  price: number | null;
}) {
  const found = await sql<{ id: string }[]>`select id from product_variant where sku = ${input.sku} limit 1`;
  if (found.length) {
    await sql`
      update product_variant
      set product_id = ${input.productId}, color_id = ${input.colorId}, size_id = ${input.sizeId},
          stock = ${input.stock}, reserved_stock = 0, price = ${input.price}, is_active = true, updated_at = now()
      where id = ${found[0].id}
    `;
    bump("updated", "product_variant");
    return found[0].id;
  }

  const inserted = await sql<{ id: string }[]>`
    insert into product_variant (product_id, sku, color_id, size_id, stock, reserved_stock, price, is_active)
    values (${input.productId}, ${input.sku}, ${input.colorId}, ${input.sizeId}, ${input.stock}, 0, ${input.price}, true)
    returning id
  `;
  bump("created", "product_variant");
  return inserted[0].id;
}

async function syncProductStock(productId: string) {
  await sql`
    update product
    set total_stock = coalesce((select sum(stock) from product_variant where product_id = ${productId}), 0),
        updated_at = now()
    where id = ${productId}
  `;
}

async function upsertOrder(input: {
  orderNumber: string;
  userId: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
  shippingCost: number;
  tax: number;
  items: Array<{ variantId: string; productName: string; variantSku: string; variantOptions: string; quantity: number; unitPrice: number }>;
}) {
  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = subtotal + input.shippingCost + input.tax;

  const found = await sql<{ id: string }[]>`select id from "order" where order_number = ${input.orderNumber} limit 1`;
  let orderId: string;
  if (found.length) {
    orderId = found[0].id;
    await sql`
      update "order"
      set user_id = ${input.userId}, status = ${input.status}, subtotal = ${subtotal}, discount = 0,
          shipping_cost = ${input.shippingCost}, tax = ${input.tax}, total = ${total},
          shipping_address = ${JSON.stringify({ firstName: "Demo", lastName: "Customer", street1: "42 Demo Street", city: "Sofia", postalCode: "1000", country: "BG" })}::json,
          billing_address = ${JSON.stringify({ firstName: "Demo", lastName: "Customer", street1: "42 Demo Street", city: "Sofia", postalCode: "1000", country: "BG" })}::json,
          updated_at = now()
      where id = ${orderId}
    `;
    await sql`delete from order_item where order_id = ${orderId}`;
    bump("updated", "order");
  } else {
    const inserted = await sql<{ id: string }[]>`
      insert into "order" (
        order_number, user_id, status, subtotal, discount, shipping_cost, tax, total,
        shipping_address, billing_address, created_at, updated_at
      ) values (
        ${input.orderNumber}, ${input.userId}, ${input.status}, ${subtotal}, 0, ${input.shippingCost}, ${input.tax}, ${total},
        ${JSON.stringify({ firstName: "Demo", lastName: "Customer", street1: "42 Demo Street", city: "Sofia", postalCode: "1000", country: "BG" })}::json,
        ${JSON.stringify({ firstName: "Demo", lastName: "Customer", street1: "42 Demo Street", city: "Sofia", postalCode: "1000", country: "BG" })}::json,
        now(), now()
      )
      returning id
    `;
    orderId = inserted[0].id;
    bump("created", "order");
  }

  for (const item of input.items) {
    await sql`
      insert into order_item (order_id, variant_id, product_name, variant_sku, variant_options, quantity, unit_price, total_price)
      values (${orderId}, ${item.variantId}, ${item.productName}, ${item.variantSku}, ${item.variantOptions}, ${item.quantity}, ${item.unitPrice}, ${item.unitPrice * item.quantity})
    `;
  }
  bump(found.length ? "updated" : "created", "order_item_batch");

  const paymentExists = await sql<{ id: string }[]>`select id from payment where order_id = ${orderId} limit 1`;
  if (paymentExists.length) {
    await sql`
      update payment
      set provider = 'stripe', provider_payment_id = ${`pi_${input.orderNumber.toLowerCase()}`}, status = 'completed', amount = ${total}, currency = 'usd', paid_at = now(), updated_at = now()
      where id = ${paymentExists[0].id}
    `;
    bump("updated", "payment");
  } else {
    await sql`
      insert into payment (order_id, provider, provider_payment_id, status, amount, currency, metadata, paid_at, created_at, updated_at)
      values (${orderId}, 'stripe', ${`pi_${input.orderNumber.toLowerCase()}`}, 'completed', ${total}, 'usd', '{}'::json, now(), now(), now())
    `;
    bump("created", "payment");
  }
}

async function upsertCmsProfile(slug: string, name: string) {
  const found = await sql<{ id: string }[]>`select id from cms_profile where slug = ${slug} limit 1`;
  if (found.length) {
    await sql`update cms_profile set name = ${name}, status = 'active', is_default = true, updated_at = now() where id = ${found[0].id}`;
    bump("updated", "cms_profile");
    return found[0].id;
  }

  await sql`update cms_profile set is_default = false where is_default = true`;
  const inserted = await sql<{ id: string }[]>`
    insert into cms_profile (name, slug, description, is_default, status)
    values (${name}, ${slug}, 'Default CMS profile for storefront demo content.', true, 'active')
    returning id
  `;
  bump("created", "cms_profile");
  return inserted[0].id;
}

async function upsertCmsLocale(input: {
  code: string;
  language: string;
  region: string | null;
  displayName: string;
  fallbackCode: string | null;
  isDefault: boolean;
  sortOrder: number;
}) {
  const found = await sql<{ id: string }[]>`select id from cms_locale where code = ${input.code} limit 1`;
  if (found.length) {
    await sql`
      update cms_locale
      set language = ${input.language},
          region = ${input.region},
          display_name = ${input.displayName},
          fallback_code = ${input.fallbackCode},
          is_default = ${input.isDefault},
          is_active = true,
          sort_order = ${input.sortOrder},
          updated_at = now()
      where id = ${found[0].id}
    `;
    bump("updated", "cms_locale");
    return;
  }

  await sql`
    insert into cms_locale (code, language, region, display_name, fallback_code, is_default, is_active, sort_order)
    values (${input.code}, ${input.language}, ${input.region}, ${input.displayName}, ${input.fallbackCode}, ${input.isDefault}, true, ${input.sortOrder})
  `;
  bump("created", "cms_locale");
}

async function upsertCmsSection(profileId: string, key: string, type: string, sortOrder: number) {
  const found = await sql<{ id: string }[]>`
    select id from cms_section where profile_id = ${profileId} and key = ${key} limit 1
  `;
  if (found.length) {
    await sql`
      update cms_section
      set type = ${type}, is_enabled = true, sort_order = ${sortOrder}, updated_at = now()
      where id = ${found[0].id}
    `;
    bump("updated", "cms_section");
    return found[0].id;
  }

  const inserted = await sql<{ id: string }[]>`
    insert into cms_section (profile_id, key, type, is_enabled, sort_order, schema_version)
    values (${profileId}, ${key}, ${type}, true, ${sortOrder}, 1)
    returning id
  `;
  bump("created", "cms_section");
  return inserted[0].id;
}

async function upsertCmsTranslation(sectionId: string, localeCode: "en" | "bg", payload: { title: string; subtitle: string; content: Record<string, unknown> }) {
  const found = await sql<{ id: string; title: string | null; subtitle: string | null; content: Record<string, unknown> | null; seo: Record<string, unknown> | null; is_published: boolean }[]>`
    select id, title, subtitle, content, seo, is_published
    from cms_section_translation
    where section_id = ${sectionId} and locale_code = ${localeCode}
    limit 1
  `;

  if (!found.length) {
    await sql`
      insert into cms_section_translation (section_id, locale_code, title, subtitle, content, seo, is_published, published_at)
      values (${sectionId}, ${localeCode}, ${payload.title}, ${payload.subtitle}, ${sql.json(payload.content as never)}, '{}'::jsonb, true, now())
    `;
    bump("created", "cms_section_translation");
    return;
  }

  const row = found[0];
  const hasTitle = typeof row.title === "string" && row.title.trim().length > 0;
  const hasSubtitle = typeof row.subtitle === "string" && row.subtitle.trim().length > 0;
  const hasContent = row.content && Object.keys(row.content).length > 0;
  const nextTitle = hasTitle ? row.title : payload.title;
  const nextSubtitle = hasSubtitle ? row.subtitle : payload.subtitle;
  const nextContent = hasContent ? row.content : payload.content;

  const shouldUpdate =
    !hasTitle ||
    !hasSubtitle ||
    !hasContent ||
    !row.is_published ||
    !row.seo;

  if (shouldUpdate) {
    await sql`
      update cms_section_translation
      set title = ${nextTitle},
          subtitle = ${nextSubtitle},
          content = ${sql.json((nextContent ?? {}) as never)},
          seo = coalesce(seo, '{}'::jsonb),
          is_published = true,
          published_at = coalesce(published_at, now()),
          updated_at = now()
      where id = ${row.id}
    `;
    bump("updated", "cms_section_translation");
  }
}

async function seedCmsContent() {
  const profileId = await upsertCmsProfile("default", "Default");

  await sql`update cms_locale set is_default = false where is_default = true and code <> 'bg-BG'`;
  await upsertCmsLocale({ code: "bg-BG", language: "bg", region: "BG", displayName: "Bulgarian (Bulgaria)", fallbackCode: "bg", isDefault: true, sortOrder: 1 });
  await upsertCmsLocale({ code: "bg", language: "bg", region: null, displayName: "Bulgarian", fallbackCode: "en", isDefault: false, sortOrder: 2 });
  await upsertCmsLocale({ code: "en", language: "en", region: null, displayName: "English", fallbackCode: null, isDefault: false, sortOrder: 3 });

  let sortOrder = 1;
  for (const sectionDef of CMS_SECTION_KEYS) {
    const sectionId = await upsertCmsSection(profileId, sectionDef.key, sectionDef.type, sortOrder++);

    const defaults = CMS_SEED_DEFAULTS[sectionDef.key] ?? {
      en: { title: sectionDef.key, subtitle: "", content: {} },
      bg: { title: sectionDef.key, subtitle: "", content: {} },
    };

    await upsertCmsTranslation(sectionId, "en", defaults.en);
    await upsertCmsTranslation(sectionId, "bg", defaults.bg);
  }
}

type VariantInfo = {
  id: string;
  productName: string;
  options: string;
  unitPrice: number;
};

async function main() {
  try {
    const brandNorth = await upsertBrand("north-thread", "North Thread", "Urban technical wear built for all-day movement.");
    const brandTerra = await upsertBrand("terra-studio", "Terra Studio", "Minimal essentials with durable natural fabrics.");
    const brandAero = await upsertBrand("aero-knit", "Aero Knit", "Performance-first knitwear with modern silhouettes.");

    const apparel = await upsertCategory("apparel", "Apparel", "Clothing and layers for everyday wear.", null);
    const tops = await upsertCategory("tops", "Tops", "Shirts, tees, and lightweight layers.", apparel);
    const outerwear = await upsertCategory("outerwear", "Outerwear", "Jackets and weather-ready layers.", apparel);
    const bottoms = await upsertCategory("bottoms", "Bottoms", "Pants and shorts for work, travel, and downtime.", apparel);
    const accessories = await upsertCategory("accessories", "Accessories", "Bags, caps, and carry essentials.", null);

    const colorRefs = {
      black: { id: await upsertColor("Black", "#111111", 1), name: "Black" },
      navy: { id: await upsertColor("Navy", "#1F2A44", 2), name: "Navy" },
      olive: { id: await upsertColor("Olive", "#5A6B3E", 3), name: "Olive" },
      sand: { id: await upsertColor("Sand", "#D6C7A1", 4), name: "Sand" },
      charcoal: { id: await upsertColor("Charcoal", "#36404A", 5), name: "Charcoal" },
      rust: { id: await upsertColor("Rust", "#A24A2E", 6), name: "Rust" },
      stone: { id: await upsertColor("Stone", "#C9C3B8", 7), name: "Stone" },
      moss: { id: await upsertColor("Moss", "#4E5B43", 8), name: "Moss" },
      glacier: { id: await upsertColor("Glacier", "#B8CFD9", 9), name: "Glacier" },
    };

    const sizeRefs = {
      xs: { id: await upsertSize("XS", "clothing", 0), name: "XS" },
      s: { id: await upsertSize("S", "clothing", 1), name: "S" },
      m: { id: await upsertSize("M", "clothing", 2), name: "M" },
      l: { id: await upsertSize("L", "clothing", 3), name: "L" },
      xl: { id: await upsertSize("XL", "clothing", 4), name: "XL" },
      xxl: { id: await upsertSize("XXL", "clothing", 5), name: "XXL" },
      one: { id: await upsertSize("One Size", "one_size", 1), name: "One Size" },
    };

    await upsertUser("demo-user-alex", "Alex Marinov", "alex.demo@example.com");
    await upsertUser("demo-user-mila", "Mila Petrova", "mila.demo@example.com");
    await upsertUser("demo-user-ivo", "Ivo Dimitrov", "ivo.demo@example.com");
    await upsertUser("demo-user-raya", "Raya Koleva", "raya.demo@example.com");
    await upsertUser("demo-user-niko", "Niko Stoyanov", "niko.demo@example.com");
    await upsertUser("demo-user-elena", "Elena Georgieva", "elena.demo@example.com");
    await upsertUser("demo-user-dani", "Dani Hristov", "dani.demo@example.com");
    await upsertUser("demo-user-petar", "Petar Ivanov", "petar.demo@example.com");
    await upsertUser("demo-user-yana", "Yana Todorova", "yana.demo@example.com");
    await upsertUser("demo-user-teo", "Teo Nikolov", "teo.demo@example.com");
    await upsertUser("demo-user-lora", "Lora Velinova", "lora.demo@example.com");
    await upsertUser("demo-user-boris", "Boris Rusev", "boris.demo@example.com");

    const products = [
      {
        key: "commuter-tee",
        name: "Commuter Performance Tee",
        basePrice: 3900,
        row: await upsertProduct({
          slug: "commuter-performance-tee",
          name: "Commuter Performance Tee",
          description: "Moisture-wicking commuter tee designed for city rides and desk days.",
          shortDescription: "Breathable technical tee",
          basePrice: 3900,
          salePrice: 3200,
          brandId: brandNorth,
          categoryId: tops,
          tags: ["breathable", "commute", "technical"],
          isFeatured: true,
        }),
        variants: [
          { sku: "NT-CTEE-BLK-S", color: colorRefs.black, size: sizeRefs.s, stock: 22, price: 3200 },
          { sku: "NT-CTEE-BLK-M", color: colorRefs.black, size: sizeRefs.m, stock: 29, price: 3200 },
          { sku: "NT-CTEE-NVY-M", color: colorRefs.navy, size: sizeRefs.m, stock: 18, price: 3200 },
          { sku: "NT-CTEE-NVY-L", color: colorRefs.navy, size: sizeRefs.l, stock: 14, price: 3200 },
        ],
      },
      {
        key: "trail-overshirt",
        name: "Trail Overshirt",
        basePrice: 8900,
        row: await upsertProduct({
          slug: "trail-overshirt",
          name: "Trail Overshirt",
          description: "Mid-weight overshirt with reinforced seams and four utility pockets.",
          shortDescription: "Layer-friendly utility overshirt",
          basePrice: 8900,
          salePrice: null,
          brandId: brandTerra,
          categoryId: outerwear,
          tags: ["utility", "layering", "durable"],
          isFeatured: true,
        }),
        variants: [
          { sku: "TS-TOVR-OLV-M", color: colorRefs.olive, size: sizeRefs.m, stock: 11, price: null },
          { sku: "TS-TOVR-OLV-L", color: colorRefs.olive, size: sizeRefs.l, stock: 7, price: null },
          { sku: "TS-TOVR-SND-M", color: colorRefs.sand, size: sizeRefs.m, stock: 9, price: null },
          { sku: "TS-TOVR-SND-XL", color: colorRefs.sand, size: sizeRefs.xl, stock: 5, price: null },
        ],
      },
      {
        key: "jetstream-jogger",
        name: "Jetstream Travel Jogger",
        basePrice: 7600,
        row: await upsertProduct({
          slug: "jetstream-travel-jogger",
          name: "Jetstream Travel Jogger",
          description: "Stretch woven joggers with hidden zipper pockets and wrinkle-resistant finish.",
          shortDescription: "Travel-ready technical joggers",
          basePrice: 7600,
          salePrice: 6900,
          brandId: brandAero,
          categoryId: bottoms,
          tags: ["travel", "stretch", "wrinkle-resistant"],
          isFeatured: false,
        }),
        variants: [
          { sku: "AK-JJOG-CHR-M", color: colorRefs.charcoal, size: sizeRefs.m, stock: 15, price: 6900 },
          { sku: "AK-JJOG-CHR-L", color: colorRefs.charcoal, size: sizeRefs.l, stock: 10, price: 6900 },
          { sku: "AK-JJOG-NVY-M", color: colorRefs.navy, size: sizeRefs.m, stock: 8, price: 6900 },
          { sku: "AK-JJOG-NVY-XL", color: colorRefs.navy, size: sizeRefs.xl, stock: 6, price: 6900 },
        ],
      },
      {
        key: "field-shell",
        name: "All-Weather Field Shell",
        basePrice: 12900,
        row: await upsertProduct({
          slug: "all-weather-field-shell",
          name: "All-Weather Field Shell",
          description: "3-layer shell jacket with taped seams, packable hood, and storm cuffs.",
          shortDescription: "Waterproof shell for daily weather",
          basePrice: 12900,
          salePrice: null,
          brandId: brandNorth,
          categoryId: outerwear,
          tags: ["waterproof", "shell", "commute"],
          isFeatured: true,
        }),
        variants: [
          { sku: "NT-FSHL-BLK-M", color: colorRefs.black, size: sizeRefs.m, stock: 6, price: null },
          { sku: "NT-FSHL-BLK-L", color: colorRefs.black, size: sizeRefs.l, stock: 5, price: null },
          { sku: "NT-FSHL-RST-M", color: colorRefs.rust, size: sizeRefs.m, stock: 4, price: null },
          { sku: "NT-FSHL-RST-XL", color: colorRefs.rust, size: sizeRefs.xl, stock: 3, price: null },
        ],
      },
      {
        key: "city-pack-cap",
        name: "City Pack Cap",
        basePrice: 2900,
        row: await upsertProduct({
          slug: "city-pack-cap",
          name: "City Pack Cap",
          description: "Packable 5-panel cap with lightweight brim and reflective rear tab.",
          shortDescription: "Packable cap with reflective details",
          basePrice: 2900,
          salePrice: null,
          brandId: brandTerra,
          categoryId: accessories,
          tags: ["accessories", "packable", "reflective"],
          isFeatured: false,
        }),
        variants: [
          { sku: "TS-CPAC-OLV-OS", color: colorRefs.olive, size: sizeRefs.one, stock: 20, price: null },
          { sku: "TS-CPAC-SND-OS", color: colorRefs.sand, size: sizeRefs.one, stock: 16, price: null },
          { sku: "TS-CPAC-BLK-OS", color: colorRefs.black, size: sizeRefs.one, stock: 18, price: null },
        ],
      },
      {
        key: "merino-base-layer",
        name: "Merino Transit Base Layer",
        basePrice: 6400,
        row: await upsertProduct({
          slug: "merino-transit-base-layer",
          name: "Merino Transit Base Layer",
          description: "Fine merino base layer that regulates temperature during commutes and travel.",
          shortDescription: "Soft merino layer for all seasons",
          basePrice: 6400,
          salePrice: 5900,
          brandId: brandAero,
          categoryId: tops,
          tags: ["merino", "base-layer", "travel"],
          isFeatured: true,
        }),
        variants: [
          { sku: "AK-MBLR-CHR-XS", color: colorRefs.charcoal, size: sizeRefs.xs, stock: 12, price: 5900 },
          { sku: "AK-MBLR-CHR-M", color: colorRefs.charcoal, size: sizeRefs.m, stock: 17, price: 5900 },
          { sku: "AK-MBLR-GLC-L", color: colorRefs.glacier, size: sizeRefs.l, stock: 13, price: 5900 },
          { sku: "AK-MBLR-GLC-XL", color: colorRefs.glacier, size: sizeRefs.xl, stock: 9, price: 5900 },
        ],
      },
      {
        key: "summit-quilted-vest",
        name: "Summit Quilted Vest",
        basePrice: 9800,
        row: await upsertProduct({
          slug: "summit-quilted-vest",
          name: "Summit Quilted Vest",
          description: "Insulated snap-front vest with recycled fill and breathable side panels.",
          shortDescription: "Light insulated vest",
          basePrice: 9800,
          salePrice: null,
          brandId: brandNorth,
          categoryId: outerwear,
          tags: ["insulated", "layering", "recycled"],
          isFeatured: false,
        }),
        variants: [
          { sku: "NT-SQVT-BLK-M", color: colorRefs.black, size: sizeRefs.m, stock: 10, price: null },
          { sku: "NT-SQVT-MOS-L", color: colorRefs.moss, size: sizeRefs.l, stock: 8, price: null },
          { sku: "NT-SQVT-MOS-XL", color: colorRefs.moss, size: sizeRefs.xl, stock: 7, price: null },
          { sku: "NT-SQVT-STN-XXL", color: colorRefs.stone, size: sizeRefs.xxl, stock: 4, price: null },
        ],
      },
      {
        key: "transit-weekender",
        name: "Transit Weekender Duffel",
        basePrice: 11900,
        row: await upsertProduct({
          slug: "transit-weekender-duffel",
          name: "Transit Weekender Duffel",
          description: "42L weather-resistant duffel with shoe tunnel, laptop sleeve, and detachable strap.",
          shortDescription: "Carry-on ready weekender bag",
          basePrice: 11900,
          salePrice: 9900,
          brandId: brandTerra,
          categoryId: accessories,
          tags: ["duffel", "travel", "carry-on"],
          isFeatured: true,
        }),
        variants: [
          { sku: "TS-TWDF-BLK-OS", color: colorRefs.black, size: sizeRefs.one, stock: 11, price: 9900 },
          { sku: "TS-TWDF-OLV-OS", color: colorRefs.olive, size: sizeRefs.one, stock: 9, price: 9900 },
          { sku: "TS-TWDF-STN-OS", color: colorRefs.stone, size: sizeRefs.one, stock: 6, price: 9900 },
        ],
      },
      {
        key: "nomad-grid-hoodie",
        name: "Nomad Grid Hoodie",
        basePrice: 8400,
        row: await upsertProduct({
          slug: "nomad-grid-hoodie",
          name: "Nomad Grid Hoodie",
          description: "Thermal grid-fleece hoodie with a streamlined cut for transit and trail layering.",
          shortDescription: "Breathable grid-fleece hoodie",
          basePrice: 8400,
          salePrice: 7600,
          brandId: brandAero,
          categoryId: tops,
          tags: ["hoodie", "grid-fleece", "layering"],
          isFeatured: true,
        }),
        variants: [
          { sku: "AK-NGHD-CHR-S", color: colorRefs.charcoal, size: sizeRefs.s, stock: 12, price: 7600 },
          { sku: "AK-NGHD-CHR-M", color: colorRefs.charcoal, size: sizeRefs.m, stock: 15, price: 7600 },
          { sku: "AK-NGHD-MOS-L", color: colorRefs.moss, size: sizeRefs.l, stock: 10, price: 7600 },
          { sku: "AK-NGHD-MOS-XL", color: colorRefs.moss, size: sizeRefs.xl, stock: 7, price: 7600 },
        ],
      },
      {
        key: "harbor-chino-short",
        name: "Harbor Chino Short",
        basePrice: 5200,
        row: await upsertProduct({
          slug: "harbor-chino-short",
          name: "Harbor Chino Short",
          description: "Quick-dry chino shorts with stretch waistband and secure zip back pocket.",
          shortDescription: "Versatile quick-dry chino short",
          basePrice: 5200,
          salePrice: null,
          brandId: brandTerra,
          categoryId: bottoms,
          tags: ["shorts", "quick-dry", "summer"],
          isFeatured: false,
        }),
        variants: [
          { sku: "TS-HCSH-SND-M", color: colorRefs.sand, size: sizeRefs.m, stock: 19, price: null },
          { sku: "TS-HCSH-SND-L", color: colorRefs.sand, size: sizeRefs.l, stock: 14, price: null },
          { sku: "TS-HCSH-NVY-M", color: colorRefs.navy, size: sizeRefs.m, stock: 13, price: null },
          { sku: "TS-HCSH-NVY-XL", color: colorRefs.navy, size: sizeRefs.xl, stock: 9, price: null },
        ],
      },
      {
        key: "drift-knit-polo",
        name: "Drift Knit Polo",
        basePrice: 6100,
        row: await upsertProduct({
          slug: "drift-knit-polo",
          name: "Drift Knit Polo",
          description: "Fine-gauge knit polo with anti-odor treatment and wrinkle-control weave.",
          shortDescription: "Smart knit polo for travel days",
          basePrice: 6100,
          salePrice: 5400,
          brandId: brandNorth,
          categoryId: tops,
          tags: ["polo", "knit", "anti-odor"],
          isFeatured: false,
        }),
        variants: [
          { sku: "NT-DKPO-STN-S", color: colorRefs.stone, size: sizeRefs.s, stock: 16, price: 5400 },
          { sku: "NT-DKPO-STN-M", color: colorRefs.stone, size: sizeRefs.m, stock: 21, price: 5400 },
          { sku: "NT-DKPO-GLC-L", color: colorRefs.glacier, size: sizeRefs.l, stock: 12, price: 5400 },
          { sku: "NT-DKPO-GLC-XL", color: colorRefs.glacier, size: sizeRefs.xl, stock: 8, price: 5400 },
        ],
      },
      {
        key: "metro-sling-pack",
        name: "Metro Sling Pack",
        basePrice: 4700,
        row: await upsertProduct({
          slug: "metro-sling-pack",
          name: "Metro Sling Pack",
          description: "Compact 6L crossbody sling with organizer panel and hidden passport sleeve.",
          shortDescription: "Compact urban sling bag",
          basePrice: 4700,
          salePrice: null,
          brandId: brandAero,
          categoryId: accessories,
          tags: ["sling", "everyday-carry", "travel"],
          isFeatured: true,
        }),
        variants: [
          { sku: "AK-MSLG-BLK-OS", color: colorRefs.black, size: sizeRefs.one, stock: 24, price: null },
          { sku: "AK-MSLG-OLV-OS", color: colorRefs.olive, size: sizeRefs.one, stock: 18, price: null },
          { sku: "AK-MSLG-CHR-OS", color: colorRefs.charcoal, size: sizeRefs.one, stock: 15, price: null },
        ],
      },
      {
        key: "alpine-softshell-pant",
        name: "Alpine Softshell Pant",
        basePrice: 9300,
        row: await upsertProduct({
          slug: "alpine-softshell-pant",
          name: "Alpine Softshell Pant",
          description: "Abrasion-resistant softshell pants with articulated knees and weather-shedding DWR finish.",
          shortDescription: "Durable softshell pant for mixed weather",
          basePrice: 9300,
          salePrice: 8600,
          brandId: brandNorth,
          categoryId: bottoms,
          tags: ["softshell", "hiking", "durable"],
          isFeatured: true,
        }),
        variants: [
          { sku: "NT-ASPT-CHR-M", color: colorRefs.charcoal, size: sizeRefs.m, stock: 13, price: 8600 },
          { sku: "NT-ASPT-CHR-L", color: colorRefs.charcoal, size: sizeRefs.l, stock: 11, price: 8600 },
          { sku: "NT-ASPT-BLK-L", color: colorRefs.black, size: sizeRefs.l, stock: 9, price: 8600 },
          { sku: "NT-ASPT-BLK-XL", color: colorRefs.black, size: sizeRefs.xl, stock: 7, price: 8600 },
        ],
      },
      {
        key: "coastline-linen-shirt",
        name: "Coastline Linen Shirt",
        basePrice: 5800,
        row: await upsertProduct({
          slug: "coastline-linen-shirt",
          name: "Coastline Linen Shirt",
          description: "Breathable linen blend shirt with roll-tab sleeves for warm city days.",
          shortDescription: "Light linen blend shirt",
          basePrice: 5800,
          salePrice: null,
          brandId: brandTerra,
          categoryId: tops,
          tags: ["linen", "summer", "breathable"],
          isFeatured: false,
        }),
        variants: [
          { sku: "TS-CLSH-STN-S", color: colorRefs.stone, size: sizeRefs.s, stock: 17, price: null },
          { sku: "TS-CLSH-STN-M", color: colorRefs.stone, size: sizeRefs.m, stock: 19, price: null },
          { sku: "TS-CLSH-GLC-M", color: colorRefs.glacier, size: sizeRefs.m, stock: 14, price: null },
          { sku: "TS-CLSH-GLC-L", color: colorRefs.glacier, size: sizeRefs.l, stock: 12, price: null },
        ],
      },
      {
        key: "voyager-tech-parka",
        name: "Voyager Tech Parka",
        basePrice: 15600,
        row: await upsertProduct({
          slug: "voyager-tech-parka",
          name: "Voyager Tech Parka",
          description: "Insulated technical parka with modular hood and storm-proof pocket construction.",
          shortDescription: "Premium insulated technical parka",
          basePrice: 15600,
          salePrice: 14200,
          brandId: brandAero,
          categoryId: outerwear,
          tags: ["parka", "insulated", "winter"],
          isFeatured: true,
        }),
        variants: [
          { sku: "AK-VTPK-NVY-M", color: colorRefs.navy, size: sizeRefs.m, stock: 6, price: 14200 },
          { sku: "AK-VTPK-NVY-L", color: colorRefs.navy, size: sizeRefs.l, stock: 5, price: 14200 },
          { sku: "AK-VTPK-BLK-L", color: colorRefs.black, size: sizeRefs.l, stock: 4, price: 14200 },
          { sku: "AK-VTPK-BLK-XL", color: colorRefs.black, size: sizeRefs.xl, stock: 3, price: 14200 },
        ],
      },
      {
        key: "ridge-trail-sock",
        name: "Ridge Trail Sock 3-Pack",
        basePrice: 2400,
        row: await upsertProduct({
          slug: "ridge-trail-sock-3-pack",
          name: "Ridge Trail Sock 3-Pack",
          description: "Cushioned merino-blend socks in a 3-pack designed for all-day comfort.",
          shortDescription: "Merino-blend trail sock set",
          basePrice: 2400,
          salePrice: null,
          brandId: brandNorth,
          categoryId: accessories,
          tags: ["socks", "merino", "essentials"],
          isFeatured: false,
        }),
        variants: [
          { sku: "NT-RTSK-CHR-S", color: colorRefs.charcoal, size: sizeRefs.s, stock: 28, price: null },
          { sku: "NT-RTSK-CHR-M", color: colorRefs.charcoal, size: sizeRefs.m, stock: 30, price: null },
          { sku: "NT-RTSK-MOS-M", color: colorRefs.moss, size: sizeRefs.m, stock: 22, price: null },
          { sku: "NT-RTSK-MOS-L", color: colorRefs.moss, size: sizeRefs.l, stock: 18, price: null },
        ],
      },
    ];

    const variantMap = new Map<string, VariantInfo>();

    for (const p of products) {
      for (const v of p.variants) {
        const id = await upsertVariant({
          productId: p.row,
          sku: v.sku,
          colorId: v.color.id,
          sizeId: v.size.id,
          stock: v.stock,
          price: v.price,
        });
        variantMap.set(v.sku, {
          id,
          productName: p.name,
          options: `${v.color.name} / ${v.size.name}`,
          unitPrice: v.price ?? p.basePrice,
        });
      }
      await syncProductStock(p.row);
    }

    await upsertOrder({
      orderNumber: "DEMO-10001",
      userId: "demo-user-alex",
      status: "processing",
      shippingCost: 700,
      tax: 980,
      items: [
        { variantId: variantMap.get("NT-CTEE-BLK-M")!.id, productName: variantMap.get("NT-CTEE-BLK-M")!.productName, variantSku: "NT-CTEE-BLK-M", variantOptions: variantMap.get("NT-CTEE-BLK-M")!.options, quantity: 2, unitPrice: variantMap.get("NT-CTEE-BLK-M")!.unitPrice },
        { variantId: variantMap.get("TS-TOVR-OLV-M")!.id, productName: variantMap.get("TS-TOVR-OLV-M")!.productName, variantSku: "TS-TOVR-OLV-M", variantOptions: variantMap.get("TS-TOVR-OLV-M")!.options, quantity: 1, unitPrice: variantMap.get("TS-TOVR-OLV-M")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10002",
      userId: "demo-user-mila",
      status: "delivered",
      shippingCost: 500,
      tax: 640,
      items: [
        { variantId: variantMap.get("TS-TOVR-SND-M")!.id, productName: variantMap.get("TS-TOVR-SND-M")!.productName, variantSku: "TS-TOVR-SND-M", variantOptions: variantMap.get("TS-TOVR-SND-M")!.options, quantity: 1, unitPrice: variantMap.get("TS-TOVR-SND-M")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10003",
      userId: "demo-user-ivo",
      status: "confirmed",
      shippingCost: 700,
      tax: 910,
      items: [
        { variantId: variantMap.get("AK-JJOG-CHR-L")!.id, productName: variantMap.get("AK-JJOG-CHR-L")!.productName, variantSku: "AK-JJOG-CHR-L", variantOptions: variantMap.get("AK-JJOG-CHR-L")!.options, quantity: 1, unitPrice: variantMap.get("AK-JJOG-CHR-L")!.unitPrice },
        { variantId: variantMap.get("TS-CPAC-BLK-OS")!.id, productName: variantMap.get("TS-CPAC-BLK-OS")!.productName, variantSku: "TS-CPAC-BLK-OS", variantOptions: variantMap.get("TS-CPAC-BLK-OS")!.options, quantity: 1, unitPrice: variantMap.get("TS-CPAC-BLK-OS")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10004",
      userId: "demo-user-raya",
      status: "shipped",
      shippingCost: 800,
      tax: 1450,
      items: [
        { variantId: variantMap.get("NT-FSHL-BLK-M")!.id, productName: variantMap.get("NT-FSHL-BLK-M")!.productName, variantSku: "NT-FSHL-BLK-M", variantOptions: variantMap.get("NT-FSHL-BLK-M")!.options, quantity: 1, unitPrice: variantMap.get("NT-FSHL-BLK-M")!.unitPrice },
        { variantId: variantMap.get("NT-CTEE-NVY-L")!.id, productName: variantMap.get("NT-CTEE-NVY-L")!.productName, variantSku: "NT-CTEE-NVY-L", variantOptions: variantMap.get("NT-CTEE-NVY-L")!.options, quantity: 1, unitPrice: variantMap.get("NT-CTEE-NVY-L")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10005",
      userId: "demo-user-alex",
      status: "pending",
      shippingCost: 500,
      tax: 560,
      items: [
        { variantId: variantMap.get("TS-CPAC-OLV-OS")!.id, productName: variantMap.get("TS-CPAC-OLV-OS")!.productName, variantSku: "TS-CPAC-OLV-OS", variantOptions: variantMap.get("TS-CPAC-OLV-OS")!.options, quantity: 2, unitPrice: variantMap.get("TS-CPAC-OLV-OS")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10006",
      userId: "demo-user-niko",
      status: "processing",
      shippingCost: 700,
      tax: 1240,
      items: [
        { variantId: variantMap.get("TS-TWDF-BLK-OS")!.id, productName: variantMap.get("TS-TWDF-BLK-OS")!.productName, variantSku: "TS-TWDF-BLK-OS", variantOptions: variantMap.get("TS-TWDF-BLK-OS")!.options, quantity: 1, unitPrice: variantMap.get("TS-TWDF-BLK-OS")!.unitPrice },
        { variantId: variantMap.get("AK-MBLR-CHR-M")!.id, productName: variantMap.get("AK-MBLR-CHR-M")!.productName, variantSku: "AK-MBLR-CHR-M", variantOptions: variantMap.get("AK-MBLR-CHR-M")!.options, quantity: 1, unitPrice: variantMap.get("AK-MBLR-CHR-M")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10007",
      userId: "demo-user-elena",
      status: "confirmed",
      shippingCost: 700,
      tax: 1090,
      items: [
        { variantId: variantMap.get("NT-SQVT-MOS-L")!.id, productName: variantMap.get("NT-SQVT-MOS-L")!.productName, variantSku: "NT-SQVT-MOS-L", variantOptions: variantMap.get("NT-SQVT-MOS-L")!.options, quantity: 1, unitPrice: variantMap.get("NT-SQVT-MOS-L")!.unitPrice },
        { variantId: variantMap.get("AK-MBLR-GLC-L")!.id, productName: variantMap.get("AK-MBLR-GLC-L")!.productName, variantSku: "AK-MBLR-GLC-L", variantOptions: variantMap.get("AK-MBLR-GLC-L")!.options, quantity: 1, unitPrice: variantMap.get("AK-MBLR-GLC-L")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10008",
      userId: "demo-user-dani",
      status: "delivered",
      shippingCost: 500,
      tax: 1320,
      items: [
        { variantId: variantMap.get("TS-TWDF-OLV-OS")!.id, productName: variantMap.get("TS-TWDF-OLV-OS")!.productName, variantSku: "TS-TWDF-OLV-OS", variantOptions: variantMap.get("TS-TWDF-OLV-OS")!.options, quantity: 1, unitPrice: variantMap.get("TS-TWDF-OLV-OS")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10009",
      userId: "demo-user-mila",
      status: "shipped",
      shippingCost: 700,
      tax: 970,
      items: [
        { variantId: variantMap.get("AK-MBLR-CHR-XS")!.id, productName: variantMap.get("AK-MBLR-CHR-XS")!.productName, variantSku: "AK-MBLR-CHR-XS", variantOptions: variantMap.get("AK-MBLR-CHR-XS")!.options, quantity: 1, unitPrice: variantMap.get("AK-MBLR-CHR-XS")!.unitPrice },
        { variantId: variantMap.get("TS-CPAC-SND-OS")!.id, productName: variantMap.get("TS-CPAC-SND-OS")!.productName, variantSku: "TS-CPAC-SND-OS", variantOptions: variantMap.get("TS-CPAC-SND-OS")!.options, quantity: 1, unitPrice: variantMap.get("TS-CPAC-SND-OS")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10010",
      userId: "demo-user-raya",
      status: "pending",
      shippingCost: 700,
      tax: 1820,
      items: [
        { variantId: variantMap.get("NT-FSHL-RST-XL")!.id, productName: variantMap.get("NT-FSHL-RST-XL")!.productName, variantSku: "NT-FSHL-RST-XL", variantOptions: variantMap.get("NT-FSHL-RST-XL")!.options, quantity: 1, unitPrice: variantMap.get("NT-FSHL-RST-XL")!.unitPrice },
        { variantId: variantMap.get("TS-TWDF-STN-OS")!.id, productName: variantMap.get("TS-TWDF-STN-OS")!.productName, variantSku: "TS-TWDF-STN-OS", variantOptions: variantMap.get("TS-TWDF-STN-OS")!.options, quantity: 1, unitPrice: variantMap.get("TS-TWDF-STN-OS")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10011",
      userId: "demo-user-petar",
      status: "processing",
      shippingCost: 700,
      tax: 1210,
      items: [
        { variantId: variantMap.get("AK-NGHD-CHR-M")!.id, productName: variantMap.get("AK-NGHD-CHR-M")!.productName, variantSku: "AK-NGHD-CHR-M", variantOptions: variantMap.get("AK-NGHD-CHR-M")!.options, quantity: 1, unitPrice: variantMap.get("AK-NGHD-CHR-M")!.unitPrice },
        { variantId: variantMap.get("AK-MSLG-BLK-OS")!.id, productName: variantMap.get("AK-MSLG-BLK-OS")!.productName, variantSku: "AK-MSLG-BLK-OS", variantOptions: variantMap.get("AK-MSLG-BLK-OS")!.options, quantity: 1, unitPrice: variantMap.get("AK-MSLG-BLK-OS")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10012",
      userId: "demo-user-yana",
      status: "confirmed",
      shippingCost: 500,
      tax: 700,
      items: [
        { variantId: variantMap.get("TS-HCSH-SND-M")!.id, productName: variantMap.get("TS-HCSH-SND-M")!.productName, variantSku: "TS-HCSH-SND-M", variantOptions: variantMap.get("TS-HCSH-SND-M")!.options, quantity: 1, unitPrice: variantMap.get("TS-HCSH-SND-M")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10013",
      userId: "demo-user-elena",
      status: "delivered",
      shippingCost: 700,
      tax: 1180,
      items: [
        { variantId: variantMap.get("NT-DKPO-STN-M")!.id, productName: variantMap.get("NT-DKPO-STN-M")!.productName, variantSku: "NT-DKPO-STN-M", variantOptions: variantMap.get("NT-DKPO-STN-M")!.options, quantity: 2, unitPrice: variantMap.get("NT-DKPO-STN-M")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10014",
      userId: "demo-user-niko",
      status: "shipped",
      shippingCost: 700,
      tax: 1660,
      items: [
        { variantId: variantMap.get("NT-FSHL-BLK-L")!.id, productName: variantMap.get("NT-FSHL-BLK-L")!.productName, variantSku: "NT-FSHL-BLK-L", variantOptions: variantMap.get("NT-FSHL-BLK-L")!.options, quantity: 1, unitPrice: variantMap.get("NT-FSHL-BLK-L")!.unitPrice },
        { variantId: variantMap.get("AK-MSLG-OLV-OS")!.id, productName: variantMap.get("AK-MSLG-OLV-OS")!.productName, variantSku: "AK-MSLG-OLV-OS", variantOptions: variantMap.get("AK-MSLG-OLV-OS")!.options, quantity: 1, unitPrice: variantMap.get("AK-MSLG-OLV-OS")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10015",
      userId: "demo-user-teo",
      status: "processing",
      shippingCost: 700,
      tax: 1940,
      items: [
        { variantId: variantMap.get("AK-VTPK-NVY-M")!.id, productName: variantMap.get("AK-VTPK-NVY-M")!.productName, variantSku: "AK-VTPK-NVY-M", variantOptions: variantMap.get("AK-VTPK-NVY-M")!.options, quantity: 1, unitPrice: variantMap.get("AK-VTPK-NVY-M")!.unitPrice },
        { variantId: variantMap.get("NT-RTSK-CHR-M")!.id, productName: variantMap.get("NT-RTSK-CHR-M")!.productName, variantSku: "NT-RTSK-CHR-M", variantOptions: variantMap.get("NT-RTSK-CHR-M")!.options, quantity: 2, unitPrice: variantMap.get("NT-RTSK-CHR-M")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10016",
      userId: "demo-user-lora",
      status: "pending",
      shippingCost: 500,
      tax: 870,
      items: [
        { variantId: variantMap.get("TS-CLSH-GLC-M")!.id, productName: variantMap.get("TS-CLSH-GLC-M")!.productName, variantSku: "TS-CLSH-GLC-M", variantOptions: variantMap.get("TS-CLSH-GLC-M")!.options, quantity: 1, unitPrice: variantMap.get("TS-CLSH-GLC-M")!.unitPrice },
        { variantId: variantMap.get("TS-HCSH-NVY-M")!.id, productName: variantMap.get("TS-HCSH-NVY-M")!.productName, variantSku: "TS-HCSH-NVY-M", variantOptions: variantMap.get("TS-HCSH-NVY-M")!.options, quantity: 1, unitPrice: variantMap.get("TS-HCSH-NVY-M")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10017",
      userId: "demo-user-boris",
      status: "confirmed",
      shippingCost: 700,
      tax: 1220,
      items: [
        { variantId: variantMap.get("NT-ASPT-CHR-L")!.id, productName: variantMap.get("NT-ASPT-CHR-L")!.productName, variantSku: "NT-ASPT-CHR-L", variantOptions: variantMap.get("NT-ASPT-CHR-L")!.options, quantity: 1, unitPrice: variantMap.get("NT-ASPT-CHR-L")!.unitPrice },
        { variantId: variantMap.get("AK-MSLG-CHR-OS")!.id, productName: variantMap.get("AK-MSLG-CHR-OS")!.productName, variantSku: "AK-MSLG-CHR-OS", variantOptions: variantMap.get("AK-MSLG-CHR-OS")!.options, quantity: 1, unitPrice: variantMap.get("AK-MSLG-CHR-OS")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10018",
      userId: "demo-user-yana",
      status: "delivered",
      shippingCost: 500,
      tax: 820,
      items: [
        { variantId: variantMap.get("TS-CLSH-STN-M")!.id, productName: variantMap.get("TS-CLSH-STN-M")!.productName, variantSku: "TS-CLSH-STN-M", variantOptions: variantMap.get("TS-CLSH-STN-M")!.options, quantity: 1, unitPrice: variantMap.get("TS-CLSH-STN-M")!.unitPrice },
        { variantId: variantMap.get("NT-RTSK-MOS-M")!.id, productName: variantMap.get("NT-RTSK-MOS-M")!.productName, variantSku: "NT-RTSK-MOS-M", variantOptions: variantMap.get("NT-RTSK-MOS-M")!.options, quantity: 1, unitPrice: variantMap.get("NT-RTSK-MOS-M")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10019",
      userId: "demo-user-petar",
      status: "shipped",
      shippingCost: 700,
      tax: 1810,
      items: [
        { variantId: variantMap.get("AK-VTPK-BLK-L")!.id, productName: variantMap.get("AK-VTPK-BLK-L")!.productName, variantSku: "AK-VTPK-BLK-L", variantOptions: variantMap.get("AK-VTPK-BLK-L")!.options, quantity: 1, unitPrice: variantMap.get("AK-VTPK-BLK-L")!.unitPrice },
        { variantId: variantMap.get("NT-RTSK-CHR-S")!.id, productName: variantMap.get("NT-RTSK-CHR-S")!.productName, variantSku: "NT-RTSK-CHR-S", variantOptions: variantMap.get("NT-RTSK-CHR-S")!.options, quantity: 1, unitPrice: variantMap.get("NT-RTSK-CHR-S")!.unitPrice },
      ],
    });

    await upsertOrder({
      orderNumber: "DEMO-10020",
      userId: "demo-user-alex",
      status: "processing",
      shippingCost: 700,
      tax: 1280,
      items: [
        { variantId: variantMap.get("NT-ASPT-BLK-L")!.id, productName: variantMap.get("NT-ASPT-BLK-L")!.productName, variantSku: "NT-ASPT-BLK-L", variantOptions: variantMap.get("NT-ASPT-BLK-L")!.options, quantity: 1, unitPrice: variantMap.get("NT-ASPT-BLK-L")!.unitPrice },
        { variantId: variantMap.get("TS-CLSH-STN-S")!.id, productName: variantMap.get("TS-CLSH-STN-S")!.productName, variantSku: "TS-CLSH-STN-S", variantOptions: variantMap.get("TS-CLSH-STN-S")!.options, quantity: 1, unitPrice: variantMap.get("TS-CLSH-STN-S")!.unitPrice },
      ],
    });

    await seedCmsContent();

    const out = {
      timestamp: now.toISOString(),
      ...stats,
    };
    console.log("Ecommerce population completed.");
    console.log(JSON.stringify(out, null, 2));
  } catch (error) {
    stats.blockers.push(error instanceof Error ? error.message : String(error));
    console.error("[blocker] ecommerce population failed");
    console.error(error);
    process.exitCode = 1;
  } finally {
    const logDir = path.resolve("logs");
    fs.mkdirSync(logDir, { recursive: true });
    const out = {
      timestamp: now.toISOString(),
      ...stats,
    };
    fs.writeFileSync(path.join(logDir, "ecommerce-population.latest.json"), JSON.stringify(out, null, 2));
    fs.writeFileSync(path.join(logDir, `ecommerce-population.${now.toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(out, null, 2));

    await sql.end();
  }
}

void main();
