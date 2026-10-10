/**
 * CMS Constants
 *
 * Shared types, theme defaults, and configuration for the CMS module.
 * KinderZone theme values must match storefront.css defaults.
 */

export type CmsLocale = "en" | "bg";

export type CmsSectionType = "hero" | "banner" | "feature_grid" | "rich_text" | "faq" | "custom";

export const CMS_SECTION_TYPES: CmsSectionType[] = [
	"custom",
	"hero",
	"banner",
	"feature_grid",
	"rich_text",
	"faq",
];

export type ThemeDraft = {
	primary: string;
	accent: string;
	background: string;
	surface: string;
	text: string;
	mutedText: string;
	fontSans: string;
	fontHeading: string;
	fontMono: string;
	tweakcnCss: string;
	useTweakcnOverride: boolean;
};

export type CmsTranslation = {
	id: string;
	localeCode: string;
	title: string | null;
	subtitle: string | null;
	content: unknown;
};

export type CmsSection = {
	id: string;
	key: string;
	type: string;
	translations: CmsTranslation[];
};

export type CmsVersion = {
	id: string;
	version: number;
	status: string;
	notes?: string | null;
	publishedAt?: string | Date | null;
	createdAt?: string | Date | null;
};

/**
 * Correct KinderZone theme — matches storefront.css CSS variable defaults.
 *
 * | Property    | Wrong (old DB)         | Correct (KinderZone)                        |
 * |-------------|------------------------|---------------------------------------------|
 * | text        | #1f2937                | #1e293b                                     |
 * | mutedText   | #6b7280                | #64748b                                     |
 * | accent      | #fb7185                | #fb923c                                     |
 * | background  | #fff7ed                | #fdfbf7                                     |
 * | fontSans    | Inter                  | Quicksand                                   |
 * | fontHeading | Varela Round, Inter    | Varela Round, Quicksand                     |
 */
export const PARTYPOP_THEME: ThemeDraft = {
	primary: "#f43f5e",
	accent: "#fb923c",
	background: "#fdfbf7",
	surface: "#ffffff",
	text: "#1e293b",
	mutedText: "#64748b",
	fontSans: "Quicksand, system-ui, sans-serif",
	fontHeading: "Varela Round, Quicksand, system-ui, sans-serif",
	fontMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
	tweakcnCss: "",
	useTweakcnOverride: false,
};

export const FONT_SANS_OPTIONS = [
	"Quicksand, system-ui, sans-serif",
	"Inter, system-ui, sans-serif",
	"Poppins, system-ui, sans-serif",
] as const;

export const FONT_HEADING_OPTIONS = [
	"Varela Round, Quicksand, system-ui, sans-serif",
	"Varela Round, Inter, system-ui, sans-serif",
	"Playfair Display, Georgia, serif",
	"Merriweather, Georgia, serif",
] as const;

export const FONT_MONO_OPTIONS = [
	"ui-monospace, SFMono-Regular, Menlo, monospace",
	"JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
	"Fira Code, ui-monospace, SFMono-Regular, Menlo, monospace",
] as const;

/**
 * All CMS section keys used by the storefront.
 * Used by the "Seed Storefront Sections" feature to bulk-create missing sections.
 */
export const CMS_SECTION_KEYS: Array<{ key: string; type: CmsSectionType }> = [
	// Global
	{ key: "global.nav", type: "custom" },
	{ key: "global.footer", type: "custom" },
	{ key: "global.theme", type: "custom" },
	// Home
	{ key: "home.hero", type: "hero" },
	{ key: "home.banner", type: "banner" },
	{ key: "home.newsletter", type: "custom" },
	// Shop
	{ key: "shop.catalog", type: "custom" },
	{ key: "shop.productDetail", type: "custom" },
	{ key: "shop.search", type: "custom" },
	{ key: "shop.cart", type: "custom" },
	{ key: "shop.checkout", type: "custom" },
	{ key: "shop.wishlist", type: "custom" },
	// About
	{ key: "about.hero", type: "hero" },
	{ key: "about.story", type: "rich_text" },
	{ key: "about.values", type: "feature_grid" },
	{ key: "about.cta", type: "custom" },
	// Support
	{ key: "contact.page", type: "custom" },
	{ key: "support.faq", type: "faq" },
	// Account
	{ key: "account.overview", type: "custom" },
	{ key: "account.orders", type: "custom" },
	{ key: "account.addresses", type: "custom" },
];

/**
 * Default bilingual content for each CMS section key.
 * Used by the seed function to create EN + BG translations immediately.
 */
export const CMS_SEED_DEFAULTS: Record<
	string,
	Record<string, { title: string; subtitle: string; content: Record<string, unknown> }>
> = {
	"global.nav": {
		en: {
			title: "Navigation",
			subtitle: "Main navigation bar",
			content: {
				logoText: "KinderZone",
				logoIcon: "ShoppingBag",
				logoMode: "both",
				logoHref: "/store",
				searchPlaceholder: "Search for products...",
				items: [
					{ key: "home", label: "Home", href: "/store" },
					{ key: "products", label: "Shop", href: "/store/products" },
					{ key: "about", label: "About", href: "/store/about" },
					{ key: "faq", label: "FAQ", href: "/store/faq" },
					{ key: "contact", label: "Contact", href: "/store/contact" },
				],
			},
		},
		bg: {
			title: "Навигация",
			subtitle: "Главна навигация",
			content: {
				logoText: "KinderZone",
				logoIcon: "ShoppingBag",
				logoMode: "both",
				logoHref: "/store",
				searchPlaceholder: "Търсете продукти...",
				items: [
					{ key: "home", label: "Начало", href: "/store" },
					{ key: "products", label: "Продукти", href: "/store/products" },
					{ key: "about", label: "За нас", href: "/store/about" },
					{ key: "faq", label: "FAQ", href: "/store/faq" },
					{ key: "contact", label: "Контакти", href: "/store/contact" },
				],
			},
		},
	},
	"global.footer": {
		en: {
			title: "KinderZone",
			subtitle: "Making every celebration unforgettable with premium party supplies and decorations.",
			content: { copyright: `${new Date().getFullYear()} KinderZone. All rights reserved.` },
		},
		bg: {
			title: "KinderZone",
			subtitle: "Правим всеки празник незабравим с премиум парти продукти и декорации.",
			content: { copyright: `${new Date().getFullYear()} KinderZone. Всички права запазени.` },
		},
	},
	"global.theme": {
		en: { title: "Theme", subtitle: "Theme settings", content: {} },
		bg: { title: "Тема", subtitle: "Настройки на темата", content: {} },
	},
	"home.hero": {
		en: {
			title: "Welcome to Our Store",
			subtitle: "Hand-picked products, ready to ship",
			content: {
				tagline: "New Collection",
				ctaPrimary: { label: "Shop Now", href: "/store/products" },
				ctaSecondary: { label: "Our Story", href: "/store/about" },
			},
		},
		bg: {
			title: "Добре дошли в нашия магазин",
			subtitle: "Подбрани продукти, готови за доставка",
			content: {
				tagline: "Нова колекция",
				ctaPrimary: { label: "Пазарувай →", href: "/store/products" },
				ctaSecondary: { label: "Нашата история", href: "/store/about" },
			},
		},
	},
	"home.banner": {
		en: {
			title: "Free Shipping",
			subtitle: "On orders over $75",
			content: {
				shipping: { title: "Free Shipping", subtitle: "Orders over $75" },
				gift: { title: "Gift Wrapping", subtitle: "Available at checkout" },
				themes: { title: "500+ Themes", subtitle: "For any occasion" },
				quality: { title: "Premium Quality", subtitle: "Satisfaction guaranteed" },
			},
		},
		bg: {
			title: "Безплатна доставка",
			subtitle: "Поръчки над 75$",
			content: {
				shipping: { title: "Безплатна доставка", subtitle: "Поръчки над 75$" },
				gift: { title: "Подаръчно опаковане", subtitle: "Наличнo при плащане" },
				themes: { title: "500+ теми", subtitle: "За всеки повод" },
				quality: { title: "Премиум качество", subtitle: "Гарантирано удовлетворение" },
			},
		},
	},
	"home.newsletter": {
		en: {
			title: "Stay in the Party Loop",
			subtitle: "Subscribe for exclusive deals, new products, and useful tips.",
			content: { buttonLabel: "Subscribe", emailPlaceholder: "your@email.com" },
		},
		bg: {
			title: "Остани в партито",
			subtitle: "Абонирай се за ексклузивни оферти, нови продукти и полезни съвети.",
			content: { buttonLabel: "Абонирай се", emailPlaceholder: "your@email.com" },
		},
	},
	"shop.catalog": {
		en: {
			title: "All Products",
			subtitle: "Browse our full collection of party accessories",
			content: { emptyState: "No products found" },
		},
		bg: {
			title: "Всички продукти",
			subtitle: "Разгледай пълната ни колекция от парти аксесоари",
			content: { emptyState: "Няма намерени продукти" },
		},
	},
	"shop.productDetail": {
		en: {
			title: "Product Details",
			subtitle: "",
			content: { reviewsHeading: "Customer Reviews", relatedHeading: "You May Also Like" },
		},
		bg: {
			title: "Детайли за продукта",
			subtitle: "",
			content: { reviewsHeading: "Отзиви от клиенти", relatedHeading: "Може да ти хареса и" },
		},
	},
	"shop.search": {
		en: {
			title: "Search Results",
			subtitle: "",
			content: {
				placeholder: "Search for products...",
				initialHeading: "What are you looking for?",
				initialDescription: "Type a product name, category, or theme to get started.",
				noResultsHeading: "No products found",
			},
		},
		bg: {
			title: "Резултати от търсене",
			subtitle: "",
			content: {
				placeholder: "Търсете продукти...",
				initialHeading: "Какво търсиш?",
				initialDescription: "Въведи име на продукт, категория или тема, за да започнеш.",
				noResultsHeading: "Няма намерени продукти",
			},
		},
	},
	"shop.cart": {
		en: {
			title: "Your Cart",
			subtitle: "Review your items before checkout",
			content: {
				emptyHeading: "Your Cart is Empty",
				emptyDescription: "Looks like you haven't added anything to your cart yet.",
			},
		},
		bg: {
			title: "Твоята количка",
			subtitle: "Прегледай артикулите преди поръчка",
			content: {
				emptyHeading: "Количката ти е празна",
				emptyDescription: "Изглежда все още не си добавил нищо в количката.",
			},
		},
	},
	"shop.checkout": {
		en: {
			title: "Checkout",
			subtitle: "Complete your order",
			content: {
				emptyHeading: "Your cart is empty",
				emptyDescription: "Add some items before checking out.",
			},
		},
		bg: {
			title: "Поръчка",
			subtitle: "Завърши поръчката си",
			content: {
				emptyHeading: "Количката ти е празна",
				emptyDescription: "Добави няколко артикула преди да завършиш поръчката.",
			},
		},
	},
	"shop.wishlist": {
		en: {
			title: "Wishlist",
			subtitle: "Your saved items",
			content: { emptyDescription: "Save your favorite items by tapping the heart icon on any product." },
		},
		bg: {
			title: "Любими",
			subtitle: "Запазените ти артикули",
			content: { emptyDescription: "Запазвай любимите си артикули, като натиснеш иконката сърце на всеки продукт." },
		},
	},
	"about.hero": {
		en: { title: "About Us", subtitle: "The story behind KinderZone", content: {} },
		bg: { title: "За нас", subtitle: "Историята зад KinderZone", content: {} },
	},
	"about.story": {
		en: {
			title: "Our Story",
			subtitle: "From a small idea to a party empire",
			content: {
				heading: "From a Garage to a Global Party",
				body: "We started with a simple mission: make celebrations easier and more fun for everyone.",
			},
		},
		bg: {
			title: "Нашата история",
			subtitle: "От малка идея до империя за парти",
			content: {
				heading: "От гараж до парти на световно ниво",
				body: "Започнахме с проста мисия: да направим празненствата по-лесни и по-забавни за всеки.",
			},
		},
	},
	"about.values": {
		en: {
			title: "Our Values",
			subtitle: "What we stand for",
			content: {
				heading: "Why We Party Different",
				subtitle: "We take fun seriously. Here are the core values that guide every confetti cannon we launch.",
			},
		},
		bg: {
			title: "Нашите ценности",
			subtitle: "В какво вярваме",
			content: {
				heading: "Защо правим парти по различен начин",
				subtitle: "Приемаме забавлението сериозно. Това са ценностите, които ни водят във всяка стъпка.",
			},
		},
	},
	"about.cta": {
		en: {
			title: "Ready to Party?",
			subtitle: "Browse our collection and find everything you need",
			content: {
				heading: "Ready to plan your next event?",
				description: "Join thousands of happy party planners and discover the magic of stress-free celebrations.",
				primaryLabel: "Start Shopping",
				primaryHref: "/store/products",
				secondaryLabel: "Contact Support",
				secondaryHref: "/store/contact",
			},
		},
		bg: {
			title: "Готови за парти?",
			subtitle: "Разгледай колекцията ни и намери всичко необходимо",
			content: {
				heading: "Готов ли си да планираш следващото събитие?",
				description: "Присъедини се към хиляди доволни организатори и открий магията на празника без стрес.",
				primaryLabel: "Започни пазаруването",
				primaryHref: "/store/products",
				secondaryLabel: "Свържи се с поддръжката",
				secondaryHref: "/store/contact",
			},
		},
	},
	"contact.page": {
		en: {
			title: "Contact Us",
			subtitle: "We'd love to hear from you",
			content: {
				email: "hello@partypop.com",
				phone: "1-800-PARTY-POP",
				hours: "Mon-Fri: 9AM - 6PM EST",
				topics: [
					{ value: "order", label: "Order Issue" },
					{ value: "return", label: "Return / Refund" },
					{ value: "product", label: "Product Question" },
					{ value: "wholesale", label: "Wholesale Inquiry" },
					{ value: "other", label: "Other" },
				],
			},
		},
		bg: {
			title: "Свържи се с нас",
			subtitle: "Ще се радваме да чуем от теб",
			content: {
				email: "hello@partypop.com",
				phone: "1-800-PARTY-POP",
				hours: "Пон-Пет: 9:00 - 18:00",
				topics: [
					{ value: "order", label: "Проблем с поръчка" },
					{ value: "return", label: "Връщане / Възстановяване" },
					{ value: "product", label: "Въпрос за продукт" },
					{ value: "wholesale", label: "Запитване за едро" },
					{ value: "other", label: "Друго" },
				],
			},
		},
	},
	"support.faq": {
		en: {
			title: "Shipping, Returns & Everything Else",
			subtitle: "Got questions? We've got answers. Find everything you need to know about shopping with us.",
			content: {
				faqItems: [
					{ q: "Where is my order?", a: "Once your order ships, you'll receive an email with a tracking number. You can also log into your account to see real-time updates. Please allow 24 hours for the tracking to update after the label is created." },
					{ q: "Do you offer wholesale pricing?", a: "Yes! We love partnering with event planners and boutique shops. Please fill out our wholesale application form on the contact page, and we'll get back to you within 3 business days with our catalog and discount tiers." },
					{ q: "Can I change or cancel my order?", a: "We move fast! You have 1 hour after placing your order to request changes. After that, your order enters our packing queue. Contact us ASAP and we'll do our best to accommodate changes." },
					{ q: "Are your products eco-friendly?", a: "We're committed to sustainability. Over 80% of our catalog is either biodegradable, compostable, or reusable. Look for our green leaf icon on eco-certified products." },
					{ q: "Do you ship internationally?", a: "Absolutely! We ship to over 50 countries. International shipping rates are calculated at checkout based on destination and package weight. Duties and import taxes may apply." },
					{ q: "What payment methods do you accept?", a: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, Apple Pay, and Google Pay. All transactions are secured with 256-bit SSL encryption." },
				],
				shippingMethods: [
					{ method: "Standard Ground", time: "3-5 Business Days", cost: "$5.99 (Free over $75)" },
					{ method: "Express Saver", time: "2 Business Days", cost: "$12.99" },
					{ method: "Overnight Party", time: "1 Business Day", cost: "$24.99" },
				],
			},
		},
		bg: {
			title: "Доставка, Връщане и Всичко Останало",
			subtitle: "Имаш въпроси? Ние имаме отговори.",
			content: {
				faqItems: [
					{ q: "Къде е поръчката ми?", a: "След като поръчката ви бъде изпратена, ще получите имейл с номер за проследяване. Можете също да влезете в акаунта си, за да видите актуализации в реално време." },
					{ q: "Предлагате ли цени на едро?", a: "Да! Обичаме да работим с организатори на събития и бутикови магазини. Моля, попълнете формуляра за кандидатстване на едро на страницата за контакт." },
					{ q: "Мога ли да променя или отменя поръчката си?", a: "Работим бързо! Имате 1 час след подаване на поръчката, за да поискате промени. След това поръчката ви влиза в опашката за опаковане." },
					{ q: "Вашите продукти екологични ли са?", a: "Ангажирани сме с устойчивостта. Над 80% от нашия каталог е или биоразградим, или компостируем, или за многократна употреба." },
					{ q: "Доставяте ли в чужбина?", a: "Абсолютно! Доставяме в над 50 страни. Международните тарифи за доставка се изчисляват при плащане на база дестинация и тегло на пакета." },
					{ q: "Какви методи на плащане приемате?", a: "Приемаме всички основни кредитни карти (Visa, Mastercard, Amex), PayPal, Apple Pay и Google Pay. Всички транзакции са защитени с 256-битово SSL криптиране." },
				],
				shippingMethods: [
					{ method: "Стандартна доставка", time: "3-5 работни дни", cost: "$5.99 (Безплатно над $75)" },
					{ method: "Експресна доставка", time: "2 работни дни", cost: "$12.99" },
					{ method: "Доставка за 1 ден", time: "1 работен ден", cost: "$24.99" },
				],
			},
		},
	},
	"account.overview": {
		en: {
			title: "My Account",
			subtitle: "Manage your account settings",
			content: {
				welcomePrefix: "Welcome back",
				welcomeDescription: "Manage your orders, addresses, and wishlist all in one place.",
				noOrdersText: "No orders yet. Start shopping!",
				ordersLabel: "Orders",
				wishlistLabel: "Wishlist",
				addressesLabel: "Addresses",
				recentOrdersLabel: "Recent Orders",
				viewAllLabel: "View all",
				browseProductsLabel: "Browse Products",
				guestName: "there",
			},
		},
		bg: {
			title: "Моят акаунт",
			subtitle: "Управлявай настройките на акаунта си",
			content: {
				welcomePrefix: "Добре дошъл отново",
				welcomeDescription: "Управлявай поръчките, адресите и любимите си продукти на едно място.",
				noOrdersText: "Все още нямаш поръчки. Започни пазаруването!",
				ordersLabel: "Поръчки",
				wishlistLabel: "Любими",
				addressesLabel: "Адреси",
				recentOrdersLabel: "Последни поръчки",
				viewAllLabel: "Виж всички",
				browseProductsLabel: "Разгледай продукти",
				guestName: "приятелю",
			},
		},
	},
	"account.orders": {
		en: {
			title: "My Orders",
			subtitle: "Track and manage your orders",
			content: {
				tabs: {
					all: "All",
					pending: "Pending",
					processing: "Processing",
					shipped: "Shipped",
					delivered: "Delivered",
					cancelled: "Cancelled",
				},
				emptyFiltered: "No orders with this status",
				emptyAll: "No orders yet",
				startShopping: "Start Shopping",
				placedPrefix: "Placed",
				moreSuffix: "more",
				itemLabel: "item",
				itemsLabel: "items",
				trackPackage: "Track Package",
				backToOrders: "Back to Orders",
				orderPrefix: "Order",
				placedOnPrefix: "Placed on",
				cancelledPrefix: "This order was",
				cancelledOn: "on",
				itemsHeading: "Items",
				qtyLabel: "Qty",
				summaryHeading: "Order Summary",
				subtotal: "Subtotal",
				discount: "Discount",
				shipping: "Shipping",
				tax: "Tax",
				total: "Total",
				shippingAddress: "Shipping Address",
				orderNotFound: "Order not found",
			},
		},
		bg: {
			title: "Моите поръчки",
			subtitle: "Проследи и управлявай поръчките си",
			content: {
				tabs: {
					all: "Всички",
					pending: "Чакащи",
					processing: "Обработват се",
					shipped: "Изпратени",
					delivered: "Доставени",
					cancelled: "Отказани",
				},
				emptyFiltered: "Няма поръчки с този статус",
				emptyAll: "Все още няма поръчки",
				startShopping: "Започни пазаруването",
				placedPrefix: "Поръчана",
				moreSuffix: "още",
				itemLabel: "артикул",
				itemsLabel: "артикула",
				trackPackage: "Проследи пратката",
				backToOrders: "Назад към поръчките",
				orderPrefix: "Поръчка",
				placedOnPrefix: "Поръчана на",
				cancelledPrefix: "Тази поръчка беше",
				cancelledOn: "на",
				itemsHeading: "Артикули",
				qtyLabel: "Брой",
				summaryHeading: "Обобщение на поръчката",
				subtotal: "Междинна сума",
				discount: "Отстъпка",
				shipping: "Доставка",
				tax: "ДДС",
				total: "Общо",
				shippingAddress: "Адрес за доставка",
				orderNotFound: "Поръчката не е намерена",
			},
		},
	},
	"account.addresses": {
		en: {
			title: "My Addresses",
			subtitle: "Manage shipping addresses",
			content: {
				savedCountSuffix: "saved",
				addAddress: "Add Address",
				newAddress: "New Address",
				labelOptional: "Label (optional)",
				labelPlaceholder: "e.g., Home, Office",
				firstName: "First Name *",
				lastName: "Last Name *",
				street1: "Street Address *",
				street2Optional: "Apartment, suite, etc. (optional)",
				city: "City *",
				state: "State / Province",
				postalCode: "Postal Code *",
				country: "Country",
				phoneOptional: "Phone (optional)",
				setDefault: "Set as default address",
				saving: "Saving...",
				saveAddress: "Save Address",
				cancel: "Cancel",
				emptyHeading: "No saved addresses yet",
				emptyDescription: "Add an address to speed up checkout.",
				defaultBadge: "Default",
				addressSingular: "address",
				addressPlural: "addresses",
			},
		},
		bg: {
			title: "Моите адреси",
			subtitle: "Управлявай адресите за доставка",
			content: {
				savedCountSuffix: "запазени",
				addAddress: "Добави адрес",
				newAddress: "Нов адрес",
				labelOptional: "Етикет (по желание)",
				labelPlaceholder: "напр. Дом, Офис",
				firstName: "Име *",
				lastName: "Фамилия *",
				street1: "Адрес *",
				street2Optional: "Апартамент, вход и др. (по желание)",
				city: "Град *",
				state: "Област / Регион",
				postalCode: "Пощенски код *",
				country: "Държава",
				phoneOptional: "Телефон (по желание)",
				setDefault: "Задай като адрес по подразбиране",
				saving: "Запазване...",
				saveAddress: "Запази адреса",
				cancel: "Отказ",
				emptyHeading: "Все още няма запазени адреси",
				emptyDescription: "Добави адрес, за да завършваш по-бързо поръчките.",
				defaultBadge: "Основен",
				addressSingular: "адрес",
				addressPlural: "адреса",
			},
		},
	},
};

export function readCssVar(css: string, variable: string): string | undefined {
	const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`--${escaped}\\s*:\\s*([^;]+);`, "i");
	const match = css.match(regex);
	return match?.[1]?.trim();
}
