"use client";

import BlazeInterlude from "@/components/typing/BlazeInterlude";
import { useAuthTransitionStore } from "@/store/authTransition";

const LOGIN_LINES = [
  "Verifying your credentials…",
  "Syncing your progress…",
  "Loading your dashboard…",
];

const REGISTER_LINES = [
  "Setting up your account…",
  "Saving your details…",
  "Loading your dashboard…",
];

/**
 * Site-wide, route-transition-safe loader for the login/register flow.
 * Mounted once in the root layout (rather than on the /login page itself)
 * so it stays visible across the navigation to /account instead of getting
 * unmounted with the login page.
 */
export default function AuthTransitionLoader() {
  const active = useAuthTransitionStore((s) => s.active);
  const context = useAuthTransitionStore((s) => s.context);

  return (
    <BlazeInterlude
      show={active}
      heading={context === "register" ? "Creating your account…" : "Signing you in…"}
      lines={context === "register" ? REGISTER_LINES : LOGIN_LINES}
    />
  );
}
