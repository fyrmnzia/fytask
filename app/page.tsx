import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to dashboard or login based on auth state
  // Client-side redirect will be handled by AuthProvider
  redirect("/dashboard");
}
