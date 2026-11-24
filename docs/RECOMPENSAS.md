# Recompensas dos negócios — auditoria (24/11/2026)

Resumo do que existe hoje. Fontes: migrações 0029, 0031, 0038, 0066, 0070 e 0074,
`src/lib/rewards.ts`, `src/components/BusinessRewards.tsx`, `src/components/AdminRewards.tsx` e
`src/routes/voucher.$rewardId.tsx`.

## Como funciona

| Peça                    | O que faz                                                                                                                                                                                                                                                                                       | Onde                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Recompensa (`rewards`)  | Título PT (obrigatório) e EN, descrição PT/EN, custo em pontos (> 0), stock (vazio = ilimitado), válida até (opcional), ativa/inativa, negócio dono                                                                                                                                             | 0031, 0038                                             |
| Quem cria               | **O dono do negócio**, só com o negócio **aprovado** (política de INSERT com `commercial_activity_public`). A política também deixa o admin criar, mas a administração não tem ecrã para isso                                                                                                   | 0038; `BusinessRewards.tsx`                            |
| Aprovação               | **Não há aprovação prévia do admin.** A recompensa fica ativa logo que é criada. O admin vê todas e pode desativá-las ou reativá-las depois (Admin → Recompensas)                                                                                                                               | `AdminRewards.tsx`; política "Active rewards readable" |
| Validação no formulário | Título PT com 2 a 120 caracteres; custo inteiro **de 1 a 100 000** (só no formulário; a BD só exige > 0); stock de 0 a 100 000 (só no formulário); data AAAA-MM-DD                                                                                                                              | `rewardSchema` (`src/lib/rewards.ts`)                  |
| Resgate                 | `redeem_reward`: atómico (lock por utilizador, um pedido por `request_id`). Recusa se a recompensa estiver inativa, se o negócio não estiver aprovado, se estiver expirada, se for o dono, se não houver stock ou se faltarem pontos. Debita os pontos em `points_ledger` e desconta 1 do stock | 0038                                                   |
| Voucher                 | Código `EK-…` por resgate. O turista vê-o em `/voucher/$rewardId`. O negócio (ou o admin) valida-o **uma vez** (`validate_voucher`: `used_at` e `used_by`)                                                                                                                                      | 0038; `voucher.$rewardId.tsx`                          |
| Pontos                  | Ganham-se com reserva concluída (100), paragem de roteiro com prova (20), roteiro concluído (150), jogos e quizzes. `points_ledger` só acrescenta linhas                                                                                                                                        | 0029, 0031, 0066                                       |
| Fotos dos jogos         | A regra "foto sem localização não conta" (0074) existe mas está **desligada** (`game_photo_location_required()` = false). Deve ser ligada antes de haver recompensas com valor real                                                                                                             | 0074                                                   |
| Pagamentos              | Nenhum. O negócio oferece o produto e entrega-o a quem mostrar o voucher                                                                                                                                                                                                                        | —                                                      |

## O que falta (proposta 0083, não aplicada)

1. **Limites na BD iguais aos do formulário:** custo de 1 a 100 000 pontos e stock até 100 000.
   Hoje só o formulário os aplica: um pedido direto à API pode gravar um custo de 2 mil milhões.
2. **Aviso de que o negócio é responsável pela entrega.** Não existe em nenhum texto: o formulário
   de recompensa só diz que os pontos são debitados.
   - Neste branch, o formulário e o passo de convite passam a dizê-lo (PT/EN).
   - A cláusula nos Termos fica para o advogado **[DECIDIR]**.
3. **[DECIDIR]** Aprovação prévia pelo admin. Hoje não existe, e o pedido manda manter as regras
   atuais. Fica só registado como opção.

## O que este branch acrescenta (sem mudar regras)

- Depois do registo do negócio: passo opcional "Oferece um produto como recompensa aos
  utilizadores", que se pode ignorar.
- No primeiro acesso ao painel: o passo `biz-rewards` do guia, que já existia e se pode saltar,
  com o mesmo texto.
- Ligação direta `/business-dashboard?reward=new`: abre o formulário "Nova recompensa" quando o
  negócio está aprovado. Se não estiver, leva à secção e mostra a mensagem de que é preciso
  aprovação.
