import { createStart } from "@tanstack/react-start";

import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { cspNonceReportOnly } from "@/lib/csp-nonce-middleware";
import { noindexOffCanonical } from "@/lib/robots-middleware";

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [cspNonceReportOnly, noindexOffCanonical],
}));
