import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, Shield } from "lucide-react";
import { consentActions, useConsentStore } from "@/lib/store/consent";
import { ROUTES } from "@/constants";

export function CookieConsentBanner() {
	// Client-only: never render during SSR.
	const [mounted, setMounted] = useState(false);
	const consented = useConsentStore((s) => s.consented);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || consented) return null;

	return (
		// Non-blocking bottom banner — no backdrop, page remains interactive
		<div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center sm:left-auto sm:right-4 sm:max-w-lg">
			<div className="w-full rounded-xl border border-border bg-card p-5 shadow-lg">
				{/* Header */}
				<div className="mb-3 flex items-start gap-2">
					<Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
					<div>
						<h2 className="text-base font-semibold leading-none text-foreground">
							Cookie Preferences
						</h2>
						<p className="mt-1.5 text-sm text-muted-foreground">
							We use cookies to keep you signed in and to improve your
							experience. You can choose which cookies to allow.
						</p>
					</div>
				</div>

				{/* Options */}
				<div className="mb-3 space-y-2">
					<div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3">
						<Shield className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
						<div>
							<p className="text-sm font-medium text-foreground">
								Essential cookies
							</p>
							<p className="text-xs text-muted-foreground">
								Required for authentication and core functionality. Always active.
							</p>
						</div>
					</div>

					<div className="flex items-start gap-3 rounded-lg border border-border p-3">
						<Cookie className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium text-foreground">
								Functional &amp; Analytics
							</p>
							<p className="text-xs text-muted-foreground">
								Preferences like sidebar state, and usage analytics to help us
								improve.
							</p>
						</div>
					</div>
				</div>

				{/* Policy link */}
				<p className="mb-4 text-xs text-muted-foreground">
					Learn more in our{" "}
					<Link
						to={ROUTES.COOKIES as string}
						className="text-primary underline underline-offset-2"
					>
						Cookie Policy
					</Link>
					.
				</p>

				{/* Actions */}
				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<button
						type="button"
						onClick={consentActions.acceptEssentialOnly}
						className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
					>
						Essential Only
					</button>
					<button
						type="button"
						onClick={consentActions.acceptAll}
						className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
					>
						Accept All
					</button>
				</div>
			</div>
		</div>
	);
}
