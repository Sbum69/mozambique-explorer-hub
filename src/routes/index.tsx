import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: typeof window !== "undefined" && localStorage.getItem("ekaya.auth.user") ? "/home" : "/login",
    });
  },
  component: () => null,
});
