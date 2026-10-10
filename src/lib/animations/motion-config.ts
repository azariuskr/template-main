/**
 * Motion Animation Configuration
 *
 * Shared transition presets and reusable animation variants
 * for storefront components. Performance-conscious: uses only
 * opacity and transform (GPU-composited properties).
 */

import type { Variants, Transition } from "framer-motion";

// =============================================================================
// TRANSITION PRESETS
// =============================================================================

export const springSmooth: Transition = {
	type: "spring",
	stiffness: 300,
	damping: 30,
};

export const springBouncy: Transition = {
	type: "spring",
	stiffness: 400,
	damping: 20,
};

export const easeOut: Transition = {
	duration: 0.4,
	ease: [0.25, 0.46, 0.45, 0.94],
};

export const easeInOut: Transition = {
	duration: 0.3,
	ease: [0.4, 0, 0.2, 1],
};

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

export const fadeIn: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: easeOut },
};

export const slideUp: Variants = {
	hidden: { opacity: 0, y: 24 },
	visible: { opacity: 1, y: 0, transition: easeOut },
};

export const slideDown: Variants = {
	hidden: { opacity: 0, y: -16 },
	visible: { opacity: 1, y: 0, transition: easeOut },
};

export const slideInLeft: Variants = {
	hidden: { opacity: 0, x: -24 },
	visible: { opacity: 1, x: 0, transition: easeOut },
};

export const slideInRight: Variants = {
	hidden: { opacity: 0, x: 24 },
	visible: { opacity: 1, x: 0, transition: easeOut },
};

export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: { opacity: 1, scale: 1, transition: springSmooth },
};

export const staggerContainer: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.08,
			delayChildren: 0.1,
		},
	},
};

export const staggerFast: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.05,
			delayChildren: 0.05,
		},
	},
};

// =============================================================================
// HOVER / TAP PRESETS
// =============================================================================

export const hoverLift = {
	whileHover: { y: -4, transition: easeInOut },
	whileTap: { scale: 0.98 },
};

export const hoverScale = {
	whileHover: { scale: 1.03, transition: easeInOut },
	whileTap: { scale: 0.97 },
};

export const hoverGlow = {
	whileHover: { scale: 1.02, transition: easeInOut },
};

// =============================================================================
// PAGE TRANSITION
// =============================================================================

export const pageTransition: Variants = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
	exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
};

// =============================================================================
// DRAWER / OVERLAY
// =============================================================================

export const drawerSlideIn: Variants = {
	hidden: { x: "100%" },
	visible: { x: 0, transition: springSmooth },
	exit: { x: "100%", transition: { duration: 0.25, ease: "easeIn" } },
};

export const overlayFade: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, transition: { duration: 0.15 } },
};
