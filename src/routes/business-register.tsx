import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "./signup";

export const Route = createFileRoute("/business-register")({
  head: () => ({ meta: [{ title: "Registar negócio — Ekaya Explore" }] }),
  component: () => <Placeholder title="Registar o meu negócio" subtitle="Auto-registo em 5 passos para pequenos e grandes negócios — em breve." />,
});
