import { redirect } from "next/navigation"
import { auth } from "@/app/auth"
import SignInForm from "./SignInForm"

export default async function SignInPage(props: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await auth()
  const params = await props.searchParams

  // Redirect if already signed in
  if (session) {
    redirect(params?.callbackUrl ?? "/")
  }

  return <SignInForm error={params?.error} callbackUrl={params?.callbackUrl} />
}
