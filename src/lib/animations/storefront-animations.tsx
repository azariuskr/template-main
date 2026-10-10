/**
 * Animated Storefront Wrapper Components
 *
 * Reusable motion wrappers for the storefront.
 * Uses framer-motion v12 with IntersectionObserver for scroll reveals.
 */

import { type ReactNode, useRef, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
	slideUp,
	staggerContainer,
	staggerFast,
	hoverLift,
	pageTransition,
} from "./motion-config";

// =============================================================================
// AnimatedPage — page-level fade-in on route transition
// =============================================================================

interface AnimatedPageProps {
	children: ReactNode;
	className?: string;
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
	return (
		<motion.div
			variants={pageTransition}
			initial="initial"
			animate="animate"
			exit="exit"
			className={className}
		>
			{children}
		</motion.div>
	);
}

// =============================================================================
// AnimatedSection — scroll-triggered section reveal
// =============================================================================

interface AnimatedSectionProps {
	children: ReactNode;
	className?: string;
	variants?: Variants;
	/** Distance from viewport edge to trigger (default: "-80px") */
	rootMargin?: string;
	as?: "section" | "div";
}

export function AnimatedSection({
	children,
	className,
	variants = slideUp,
	rootMargin = "-80px",
	as = "section",
}: AnimatedSectionProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ rootMargin, threshold: 0.1 },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [rootMargin]);

	const MotionTag = as === "section" ? motion.section : motion.div;

	return (
		<MotionTag
			ref={ref}
			variants={variants}
			initial="hidden"
			animate={inView ? "visible" : "hidden"}
			className={className}
		>
			{children}
		</MotionTag>
	);
}

// =============================================================================
// AnimatedCard — hover lift/scale for product cards
// =============================================================================

interface AnimatedCardProps {
	children: ReactNode;
	className?: string;
}

export function AnimatedCard({ children, className }: AnimatedCardProps) {
	return (
		<motion.div
			variants={slideUp}
			{...hoverLift}
			className={className}
		>
			{children}
		</motion.div>
	);
}

// =============================================================================
// AnimatedStagger — staggered children reveal (for grids)
// =============================================================================

interface AnimatedStaggerProps {
	children: ReactNode;
	className?: string;
	fast?: boolean;
	/** Distance from viewport edge to trigger (default: "-60px") */
	rootMargin?: string;
}

export function AnimatedStagger({
	children,
	className,
	fast = false,
	rootMargin = "-60px",
}: AnimatedStaggerProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ rootMargin, threshold: 0.1 },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [rootMargin]);

	return (
		<motion.div
			ref={ref}
			variants={fast ? staggerFast : staggerContainer}
			initial="hidden"
			animate={inView ? "visible" : "hidden"}
			className={className}
		>
			{children}
		</motion.div>
	);
}

// =============================================================================
// AnimatedNav — slide-down on mount
// =============================================================================

interface AnimatedNavProps {
	children: ReactNode;
	className?: string;
}

export function AnimatedNav({ children, className }: AnimatedNavProps) {
	return (
		<motion.nav
			initial={{ opacity: 0, y: -12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: "easeOut" }}
			className={className}
		>
			{children}
		</motion.nav>
	);
}

// =============================================================================
// AnimatedHero — fade-in + slide-up for hero text, scale-in for image
// =============================================================================

export const heroTextVariants: Variants = {
	hidden: { opacity: 0, y: 30 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
	},
};

export const heroImageVariants: Variants = {
	hidden: { opacity: 0, scale: 0.92 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 },
	},
};

export const heroStagger: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.12,
			delayChildren: 0.1,
		},
	},
};

export const heroChildSlideUp: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
	},
};

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { AnimatePresence, motion } from "framer-motion";
export { fadeIn, slideUp, scaleIn, easeOut } from "./motion-config";
