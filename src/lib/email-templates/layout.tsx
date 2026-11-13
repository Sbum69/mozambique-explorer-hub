import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { CANONICAL_ORIGIN, SUPPORT_EMAIL } from "@/lib/app-info";

/**
 * Shared layout of the EKAYA auth emails (docs/email-templates.md): logo, Portuguese first and
 * English below, one action, the same link as text, support line. White outer background (Lovable
 * requirement), 1 px border instead of shadows, the app's action colour.
 */
export type EmailCopy = {
  heading: string;
  body: string;
  note: string;
};

type Props = {
  preview: string;
  pt: EmailCopy;
  en: EmailCopy;
  /** Button label "PT · EN" and its link. Omitted for the code email. */
  action?: { label: string; url: string };
  /** One-time code, shown large instead of a button. */
  code?: string;
};

export function EkayaEmail({ preview, pt, en, action, code }: Props) {
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={card}>
          <Img
            src={`${CANONICAL_ORIGIN}/email-logo.png`}
            width="160"
            height="39"
            alt="EKAYA"
            style={logo}
          />
          <Copy copy={pt} />
          {action ? (
            <Section style={{ margin: "8px 0 4px" }}>
              <Button style={button} href={action.url}>
                {action.label}
              </Button>
              <Text style={small}>
                Se o botão não abrir · If the button does not open:{" "}
                <Link href={action.url} style={link}>
                  {action.url}
                </Link>
              </Text>
            </Section>
          ) : null}
          {code ? <Text style={codeStyle}>{code}</Text> : null}
          <Text style={note}>{pt.note}</Text>
          <Hr style={hr} />
          <Text style={lang}>English</Text>
          <Copy copy={en} />
          <Text style={note}>{en.note}</Text>
          <Hr style={hr} />
          <Text style={small}>
            Dúvidas? Escreve para {SUPPORT_EMAIL}. · Questions? Write to {SUPPORT_EMAIL}.
          </Text>
          <Text style={small}>EKAYA · Moçambique · Mozambique</Text>
        </Container>
      </Body>
    </Html>
  );
}

function Copy({ copy }: { copy: EmailCopy }) {
  return (
    <>
      <Text style={h1}>{copy.heading}</Text>
      <Text style={text}>{copy.body}</Text>
    </>
  );
}

const font = "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const main = { backgroundColor: "#ffffff", fontFamily: font, padding: "24px 0" };
const card = {
  border: "1px solid #d3dcd9",
  borderRadius: "10px",
  padding: "28px 28px 20px",
  maxWidth: "520px",
};
const logo = { display: "block", border: "0", margin: "0 0 20px" };
const h1 = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  color: "#15211f",
  margin: "0 0 10px",
  lineHeight: "1.3",
};
const text = { fontSize: "16px", color: "#15211f", lineHeight: "1.55", margin: "0 0 16px" };
const note = { fontSize: "14px", color: "#4e5d59", lineHeight: "1.5", margin: "12px 0 0" };
const small = {
  fontSize: "12px",
  color: "#4e5d59",
  lineHeight: "1.5",
  margin: "10px 0 0",
  wordBreak: "break-all" as const,
};
const lang = {
  fontSize: "12px",
  color: "#4e5d59",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 8px",
};
const link = { color: "#0a6670", textDecoration: "underline" };
const hr = { borderColor: "#d3dcd9", margin: "24px 0 18px" };
const button = {
  backgroundColor: "#0a6670",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "bold" as const,
  borderRadius: "6px",
  padding: "12px 20px",
  textDecoration: "none",
  display: "inline-block",
};
const codeStyle = {
  fontSize: "28px",
  fontWeight: "bold" as const,
  letterSpacing: "0.2em",
  color: "#15211f",
  margin: "8px 0 4px",
};
