import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create an account - Zakat Kit" };

export default function SignUp() {
  return (
    <AuthShell title="Create your free account" subtitle="Keep your calculations safe and use them on every device. Anything already on this device comes with you.">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
