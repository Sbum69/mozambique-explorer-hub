# QA do EKAYA Explore

Como verificar a aplicação antes de um merge ou de um lançamento, por esta ordem.

## 1. Verificações de código (sempre; também correm no CI)

```powershell
bunx tsc --noEmit        # PASS: sem erros
bunx vitest run          # PASS: todos os testes passam (testes em src/lib/*.test.ts)
bun run lint             # PASS: 0 erros (os avisos react-refresh são conhecidos)
bun run build            # PASS: termina sem erros e não altera src/routeTree.gen.ts
```

O workflow `.github/workflows/ci.yml` corre os quatro em cada PR e em cada push para a `main`.

## 2. Testes de base de dados (quando mudam migrações, RLS ou triggers)

Ficheiros em `supabase/tests/`, um por área. Cada um:

- explica no topo o que testa, como correr e o resultado esperado;
- corre como um único bloco `DO $$ … $$` e termina **sempre** com
  `RAISE EXCEPTION '…_ROLLBACK …'`, por isso tudo o que cria é revertido;
- escreve o resultado na mensagem do erro: `[… PASS …]` em todos os itens e nenhum `[… FAIL …]`
  (nos ficheiros mais antigos, as falhas aparecem com `!`).

Como correr: colar o ficheiro no SQL da Lovable Cloud (conector Lovable, `query_database`).
Depois, confirmar por leitura que não ficaram dados de teste (consulta no topo de cada ficheiro).

| Ficheiro                              | Área                                                      |
| ------------------------------------- | --------------------------------------------------------- |
| `seg-1b_one_business_per_owner.sql`   | um negócio por conta                                      |
| `seg-2_bookings_integrity.sql`        | integridade das reservas                                  |
| `8e5_commercial_flow.sql`             | expiração, não comparência, capacidade                    |
| `10b_rewards_and_proofs.sql`          | recompensas e provas localizadas                          |
| `adm-1_admin_management.sql`          | gestão de utilizadores e negócios                         |
| `adm-2c_admin_broadcasts.sql`         | avisos do admin                                           |
| `dados-1_exchange_rates.sql`          | câmbio                                                    |
| `fav-1_favorites_and_preferences.sql` | favoritos e preferências                                  |
| `community.sql`                       | comunidade, denúncias, experiências comunitárias, fotos   |
| `notifications.sql`                   | notificações (RLS, conteúdo imutável, triggers)           |
| `security.sql`                        | grants do visitante, funções, fotos, links, buckets       |
| `ux-1_settings.sql`                   | notificações silenciadas, avatares, apagar conta          |
| `dados-2_internal_accounts.sql`       | contas internas fora das métricas                         |
| `content-1_readiness_import.sql`      | pronto para publicar, importação como rascunho e convites |
| `legal-1_acceptances.sql`             | aceitação dos Termos e da Privacidade (registo e pedido)  |

Alguns casos dependem de dados (por exemplo, um negócio aprovado sem dono ou uma reserva futura):
quando não existem, o ficheiro escreve `SKIP` em vez de falhar. Um `SKIP` não é um `PASS` — dizer
no relatório porque é que o caso não correu.

## 3. Verificações no browser (antes de um merge com mudanças visíveis)

Ver [scripts/qa/README.md](../scripts/qa/README.md). Ordem recomendada, com o build de produção
a correr na porta 4173:

1. `hydration.ts`
2. `interactions.ts`
3. `widths.ts`
4. `contrast.ts` (axe, claro e escuro: 0 violações)
5. `lang.ts`
6. `guest.ts` (visitante: rotas privadas, menu, diálogo de conta)
7. `journeys.ts` (turista, negócio e admin, só leitura)
   7a. `legal.ts` (Termos, Privacidade, caixa de aceitação, rodapé legal e pedido de aceitação; não aceita nada)
   7b. `mfa.ts` (Definições → Segurança e redirecionamento do admin sem 2FA; não ativa nada)
   7c. `csp.ts` (CSP obrigatória: 0 violações em todas as páginas)
   7d. `content.ts` (estados vazios, convite, janela Conteúdo do admin, pronto para publicar no painel do negócio; não importa nem ativa nada)

Admin com 2FA: com `TEST_ADMIN_TOTP_SECRET` em `.env.test.local`, `sessionFor("admin")` sobe a
sessão a `aal2` pela API (código TOTP calculado no script, sem dependências); sem ele, os casos de
administração dão SKIP. 8. `shots.ts` (revisão visual) 9. `lighthouse.ts` (só com nenhum outro servidor ligado)

Lighthouse: as notas absolutas variam muito com a carga do PC. Para comparar versões, servir as
duas (por exemplo a `main` numa pasta à parte, na porta 4174) e medir em alternância, com
`QA_BASE` — a diferença entre elas é o que conta. `--devtools` mede com estrangulamento real.

## 4. Testes à mão (telemóvel real)

Com o build a correr com `--ip 0.0.0.0`, abrir `http://<IPv4 do Wi-Fi do PC>:4173` no telemóvel,
na mesma rede. A geolocalização só funciona em https (preview do Lovable).

## Estados nos relatórios

**PASS** (executado e certo), **FAIL** (executado e errado), **BLOCKED** (impedido por algo
externo, dizer o quê), **NOT RUN** (não executado, dizer porquê). Nunca PASS sem executar.
