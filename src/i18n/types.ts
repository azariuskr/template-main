import type enCommon from "./locales/en/common.json";
import type enFaq from "./locales/en/faq.json";
import type enContact from "./locales/en/contact.json";
import type enAbout from "./locales/en/about.json";
import type enProduct from "./locales/en/product.json";
import type enCatalog from "./locales/en/catalog.json";
import type enCart from "./locales/en/cart.json";
import type enCheckout from "./locales/en/checkout.json";
import type enFooter from "./locales/en/footer.json";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "common";
		resources: {
			common: typeof enCommon;
			faq: typeof enFaq;
			contact: typeof enContact;
			about: typeof enAbout;
			product: typeof enProduct;
			catalog: typeof enCatalog;
			cart: typeof enCart;
			checkout: typeof enCheckout;
			footer: typeof enFooter;
		};
	}
}
