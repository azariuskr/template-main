import { ROUTES } from "@/constants"
import { AuthView } from "@daveyplate/better-auth-ui"
import { createFileRoute, Link } from "@tanstack/react-router"

const AUTH_VIEW_MAP = {
	login: "SIGN_IN",
	signup: "SIGN_UP",
	"forgot-password": "FORGOT_PASSWORD",
	"reset-password": "RESET_PASSWORD",
	"magic-link": "MAGIC_LINK",
	"verify-email": "EMAIL_VERIFICATION",
	"two-factor": "TWO_FACTOR",
	"email-otp": "EMAIL_OTP",
	logout: "SIGN_OUT",
	callback: "CALLBACK",
} as const

type AuthRouteView = keyof typeof AUTH_VIEW_MAP

export const Route = createFileRoute("/(auth-pages)/auth/$authView")({
	component: RouteComponent,
	beforeLoad: ({ params }) => {
		if (!(params.authView in AUTH_VIEW_MAP)) {
			return {
				authView: "login" as AuthRouteView,
				authUiView: AUTH_VIEW_MAP.login,
			}
		}

		const authView = params.authView as AuthRouteView
		return {
			authView,
			authUiView: AUTH_VIEW_MAP[authView],
		}
	},
})

function RouteComponent() {
	const { locale } = Route.useRouteContext()
	const { authView, authUiView } = Route.useRouteContext()
	const isBg = locale === "bg"

	return (
		<>
			<AuthView
				view={authUiView}
				classNames={{
					title: "text-center font-extrabold tracking-tight text-2xl",
				}}
			/>
			{!["callback", "logout"].includes(authView) && (
				<p className="mx-auto max-w-xs text-center text-xs text-muted-foreground">
					{isBg ? "С продължаването приемаш нашите " : "By continuing, you agree to our "}
					<Link className="text-primary underline underline-offset-2 hover:opacity-80" to={ROUTES.TERMS} target="_blank">
						{isBg ? "Общи условия" : "Terms of Service"}
					</Link>{" "}
					{isBg ? "и " : "and "}
					<Link className="text-primary underline underline-offset-2 hover:opacity-80" to={ROUTES.PRIVACY} target="_blank">
						{isBg ? "Политика за поверителност" : "Privacy Policy"}
					</Link>
					.
				</p>
			)}
		</>
	)
}
