import * as React from "react";

import { EMAIL_COPY } from "./copy";
import { EkayaEmail } from "./layout";

interface RecoveryEmailProps {
  siteName?: string;
  confirmationUrl: string;
}

const c = EMAIL_COPY.recovery;

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <EkayaEmail
    preview={c.preview}
    pt={c.pt}
    en={c.en}
    action={{ label: c.button!, url: confirmationUrl }}
  />
);

export default RecoveryEmail;
