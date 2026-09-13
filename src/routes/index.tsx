import { createFileRoute, redirect } from "@tanstack/react-router";

import { getAuthenticatedUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getAuthenticatedUser();
    throw redirect({ to: user ? "/home" : "/login" });
  },
  component: () => null,
});
