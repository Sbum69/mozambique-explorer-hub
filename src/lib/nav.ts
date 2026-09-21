import { useAuth } from "@/contexts/AuthContext";

/**
 * Where a "back" button on a public page should lead.
 * Guests (and visitors without a session) never get sent to the private
 * dashboard — they go back to the public Home instead.
 */
export function useBackTarget(): "/dashboard" | "/home" {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? "/dashboard" : "/home";
}
