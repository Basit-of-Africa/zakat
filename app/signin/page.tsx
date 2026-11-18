import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in - Zakat Kit" };

export default function SignIn() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to bring your figures to this device.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
