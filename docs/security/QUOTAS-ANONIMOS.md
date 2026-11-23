# Quotas nos endpoints anónimos (proposta)

> Proposta de texto, sem código nem SQL. Estado a 23/11/2026. Base: o inventário em
> `docs/security/QUALIDADE-V1.md`, os limites atuais em `docs/security/RATE-LIMITS.md` e as
> migrações 0055–0057. Os números são propostas **[DECIDIR]**, não medições.

## Princípios

- **Por IP, com hash diário**, como `submit_business_lead` (0055): `request_ip()` lê
  `cf-connecting-ip` (ou `x-forwarded-for`) e guarda só `sha256(ip | dia | sal)`. Não se guarda o IP.
- **Limites largos por IP.** Em Moçambique muitos telemóveis partilham o mesmo IP (CGNAT, ver
  `RATE-LIMITS.md`). Um limite apertado bloqueia uma rede inteira.
- **O teto "no total" continua**, como proteção da BD e da quota. O limite por IP serve para um só
  abusador não gastar esse teto (o risco já anotado como [FUTURO] em `RATE-LIMITS.md` §2).
- **Escritas que falham em silêncio** continuam em silêncio (assistente, registo de erros): o
  visitante não vê erro.
- **Leituras públicas:** sem quota na BD. Cache, mais os limites do PostgREST e da Cloudflare.

## Proposta por endpoint

| Endpoint                                                                                                                                                                                                                                             | Hoje                                                          | Proposta                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submit_business_lead`                                                                                                                                                                                                                               | 3/dia por IP, 200/dia total, campo-armadilha (0055)           | Manter.                                                                                                                                             |
| `log_app_error`                                                                                                                                                                                                                                      | 2 000/dia total, 300 caracteres (0057)                        | **+ 50/dia por IP** (hash diário). Acima disso não grava, sem erro. Um ecrã com erro em ciclo não enche o teto do dia.                              |
| `assistant_log_unanswered`                                                                                                                                                                                                                           | 500/dia total (0056)                                          | **+ 20/dia por IP**, não grava acima disso. Uma pessoa real raramente faz mais de 20 perguntas sem resposta por dia.                                |
| `assistant_rate_answer`                                                                                                                                                                                                                              | 2 000/dia total (0056)                                        | **+ 50/dia por IP**, e no máximo **1 avaliação por resposta, por IP e por dia** (evita inflacionar uma resposta).                                   |
| IA do assistente (desligada)                                                                                                                                                                                                                         | Teto de 9 000 Neurons/dia (0056)                              | Antes de ligar: **10 perguntas/hora e 30/dia por IP**, além do teto. Sem limite por IP não se liga (já previsto em `QUALIDADE-V1.md`).              |
| `getLiveNews` (server fn)                                                                                                                                                                                                                            | Cache de 30 min, pedido partilhado, pausa de 2 min após falha | Manter: o visitante nunca chega ao Google News sem passar pela cache.                                                                               |
| `getDestinationWeather` (server fn)                                                                                                                                                                                                                  | Cache ≥ 1 h (`Expires`), pedido partilhado, pausa de 2 min    | Manter. Não recebe parâmetros: lê os destinos com coordenadas da BD, por isso o visitante não escolhe o que se pede à MET Norway.                   |
| `/sitemap.xml`                                                                                                                                                                                                                                       | `cache-control: public, max-age=3600` (já no código)          | Manter. **Nota:** o inventário da QUALIDADE-V1 diz "nenhuma" e propõe 1 h, mas `src/routes/sitemap[.]xml.ts` já a envia. Corrigir o inventário.     |
| `/lovable/email/auth/webhook`                                                                                                                                                                                                                        | Assinatura verificada pelo SDK; limites do Auth               | Manter. A quota é a do envio de emails do Auth (60/hora proposto em `LAUNCH.md` §8).                                                                |
| `/lovable/email/auth/preview`                                                                                                                                                                                                                        | `Bearer LOVABLE_API_KEY`                                      | Nenhuma necessária.                                                                                                                                 |
| Auth (`/token`, `/signup`, `/recover`, …)                                                                                                                                                                                                            | Limites por omissão da Supabase                               | Os de `LAUNCH.md` §8: `/token` 90 por 5 min e por IP; sign-ups 30 por 5 min; emails 60/hora.                                                        |
| Leituras públicas (`get_experience_availability`, `platform_impact_stats`, `news_like_counts`, `event_participant_counts`, `active_sponsored`, `founder_places_left`, `commercial_activity_public`, `current_commercial_config`, `commission_split`) | Nenhuma (só leitura)                                          | Sem quota na BD. Vigiar no painel. Se uma ficar cara (ex.: `platform_impact_stats`), pôr o resultado em cache no servidor em vez de limitar por IP. |

## Antes de implementar

1. Lista real das funções que o `anon` executa na produção (consulta no fim do inventário da
   `QUALIDADE-V1.md`): pode haver mais do que as do repositório.
2. Uma tabela de contadores por `(função, hash do IP do dia)` ou uma coluna `ip_day_hash` em cada
   tabela de destino, como na 0055 **[DECIDIR]**. É uma migração nova e precisa de aprovação.
3. Os mesmos testes auto-revertíveis de `supabase/tests/` para cada limite novo.
