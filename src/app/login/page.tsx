import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "../../components/LoginForm";

export const metadata: Metadata = {
  title: "로그인 · LinuxRecall",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
