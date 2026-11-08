import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { HomePage } from "@/components/HomePage";
import { getAuthenticatedUser, postAuthTarget } from "@/lib/auth";
import { homeHead } from "@/lib/home-head";

/**
 * The public Home, rendered on the server: visitors and crawlers get the full page (with its <h1>)
 * in the HTML. A signed-in user who has not finished onboarding is still sent there, in the browser.
 */
export const Route = createFileRoute("/")({
  head: homeHead,
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    void (async () => {
      const user = await getAuthenticatedUser();
      if (!user || !alive) return;
      const target = await postAuthTarget(user.id);
      if (alive && target !== "/home") void navigate({ to: target, replace: true });
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);
  return <HomePage />;
}
