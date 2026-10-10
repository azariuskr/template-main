import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enFaq from "./locales/en/faq.json";
import enContact from "./locales/en/contact.json";
import enAbout from "./locales/en/about.json";
import enProduct from "./locales/en/product.json";
import enCatalog from "./locales/en/catalog.json";
import enCart from "./locales/en/cart.json";
import enCheckout from "./locales/en/checkout.json";
import enFooter from "./locales/en/footer.json";
import bgCommon from "./locales/bg/common.json";
import bgFaq from "./locales/bg/faq.json";
import bgContact from "./locales/bg/contact.json";
import bgAbout from "./locales/bg/about.json";
import bgProduct from "./locales/bg/product.json";
import bgCatalog from "./locales/bg/catalog.json";
import bgCart from "./locales/bg/cart.json";
import bgCheckout from "./locales/bg/checkout.json";
import bgFooter from "./locales/bg/footer.json";

i18n.use(initReactI18next).init({
	resources: {
		en: {
			common: enCommon,
			faq: enFaq,
			contact: enContact,
			about: enAbout,
			product: enProduct,
			catalog: enCatalog,
			cart: enCart,
			checkout: enCheckout,
			footer: enFooter,
		},
		bg: {
			common: bgCommon,
			faq: bgFaq,
			contact: bgContact,
			about: bgAbout,
			product: bgProduct,
			catalog: bgCatalog,
			cart: bgCart,
			checkout: bgCheckout,
			footer: bgFooter,
		},
	},
	lng: "bg",
	fallbackLng: "en",
	defaultNS: "common",
	ns: ["common", "faq", "contact", "about", "product", "catalog", "cart", "checkout", "footer"],
	interpolation: {
		escapeValue: false,
	},
});

export default i18n;
