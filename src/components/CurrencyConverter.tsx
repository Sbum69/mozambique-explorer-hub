import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES, convert, fetchRateTable, type Currency } from "@/lib/exchange";

const TXT = {
  pt: {
    title: "Conversor de moedas",
    amount: "Valor",
    from: "De",
    to: "Para",
    swap: "Trocar moedas",
    result: "Resultado",
    rateOf: "Taxa de",
    source: "Fonte",
    disclaimer: "Valor de referência; confirma no banco ou na casa de câmbio.",
    unavailable:
      "O conversor está indisponível de momento. Consulta a taxa do dia num banco ou numa casa de câmbio autorizada.",
    invalid: "Indica um valor válido.",
  },
  en: {
    title: "Currency converter",
    amount: "Amount",
    from: "From",
    to: "To",
    swap: "Swap currencies",
    result: "Result",
    rateOf: "Rate of",
    source: "Source",
    disclaimer: "Reference value; confirm with your bank or exchange office.",
    unavailable:
      "The converter is unavailable right now. Check the day's rate at a bank or an authorised exchange office.",
    invalid: "Enter a valid amount.",
  },
} as const;

const SELECT =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** USD, EUR, ZAR, GBP ⇄ MZN with the daily reference rates stored in exchange_rates. Hidden when there is no valid rate. */
export function CurrencyConverter({ lang }: { lang: "pt" | "en" }) {
  const t = TXT[lang];
  const id = useId();
  const q = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: fetchRateTable,
    staleTime: 60 * 60 * 1000,
  });
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState<Currency>("USD");
  const [to, setTo] = useState<Currency>("MZN");

  if (q.isPending)
    return <div className="h-40 rounded-xl border bg-muted/40 animate-pulse" aria-busy="true" />;
  if (q.isError || !q.data) {
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground"
      >
        <Info className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
        {t.unavailable}
      </p>
    );
  }

  const table = q.data;
  const value = Number(amount.replace(",", "."));
  const valid = amount.trim() !== "" && Number.isFinite(value) && value >= 0;
  const locale = lang === "pt" ? "pt-PT" : "en-GB";
  const fmt = (n: number, c: Currency) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: c,
      currencyDisplay: "code",
      maximumFractionDigits: 2,
    }).format(n);
  const result = valid ? convert(value, from, to, table) : null;
  // Unit rate with 4 decimals so MZN → USD is not shown as 0,02.
  const unit = (1 / table.perUsd[from]!) * table.perUsd[to]!;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-xl border bg-card p-4 sm:p-5 space-y-4"
    >
      <h4 id={`${id}-title`} className="font-semibold">
        {t.title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-amount`} className="text-sm font-medium">
            {t.amount}
          </label>
          <Input
            id={`${id}-amount`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!valid}
            aria-describedby={valid ? undefined : `${id}-invalid`}
          />
        </div>
        <span className="hidden sm:block" />
        <div className="space-y-1.5">
          <label htmlFor={`${id}-from`} className="text-sm font-medium">
            {t.from}
          </label>
          <select
            id={`${id}-from`}
            className={SELECT}
            value={from}
            onChange={(e) => setFrom(e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="justify-self-center"
          aria-label={t.swap}
          title={t.swap}
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          <ArrowLeftRight className="size-4" />
        </Button>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-to`} className="text-sm font-medium">
            {t.to}
          </label>
          <select
            id={`${id}-to`}
            className={SELECT}
            value={to}
            onChange={(e) => setTo(e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div aria-live="polite" className="rounded-lg bg-muted/60 p-3">
        {result === null ? (
          <p id={`${id}-invalid`} className="text-sm text-destructive">
            {t.invalid}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t.result}</p>
            <p className="text-2xl font-bold break-words">
              {fmt(value, from)} ≈ {fmt(result, to)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              1 {from} ≈ {unit.toLocaleString(locale, { maximumFractionDigits: 4 })} {to}
            </p>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t.rateOf}{" "}
        {new Date(table.rateDate).toLocaleDateString(locale, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}{" "}
        · {t.source}:{" "}
        <a
          href="https://www.exchangerate-api.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {table.source}
        </a>
        <br />
        <strong className="font-medium text-foreground">{t.disclaimer}</strong>
      </p>
    </section>
  );
}
