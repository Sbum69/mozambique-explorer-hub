import * as React from "react";

import { EMAIL_COPY } from "./copy";
import { EkayaEmail } from "./layout";

interface MagicLinkEmailProps {
  siteName?: string;
  confirmationUrl: string;
}

const c = EMAIL_COPY.magiclink;

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <EkayaEmail
    preview={c.preview}
    pt={c.pt}
    en={c.en}
    action={{ label: c.button!, url: confirmationUrl }}
  />
);

export default MagicLinkEmail;
