# Estado dos documentos legais

Estado a 25/11/2026, lido no repositório.

- "Existe" = há texto no repositório (não quer dizer revisto por advogado).
- "[SEM DOC]" = não há nenhum texto.
- **Quem decide:** CEO (aprova e publica) e advogado (revê). A versão muda só com migração
  (`current_legal_versions()`) e Publish ao mesmo tempo.

| Documento                                | Onde                                                | Estado                                           | Versão / data                 | Revisão jurídica                               | Quem decide   |
| ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------ | ----------------------------- | ---------------------------------------------- | ------------- |
| Termos de Utilização                     | `src/lib/legal/terms.ts` → `/terms`                 | Existe (PT/EN)                                   | 2026-11-23 (`LEGAL_VERSIONS`) | Não feita                                      | Advogado, CEO |
| Política de Privacidade                  | `src/lib/legal/privacy.ts` → `/privacy`             | Existe (PT/EN)                                   | 2026-11-23 (`LEGAL_VERSIONS`) | Não feita                                      | Advogado, CEO |
| Cookies e armazenamento local            | Política §10                                        | Existe (dentro da Política)                      | 2026-11-23                    | Não feita                                      | Advogado      |
| Política de cookies autónoma             | —                                                   | **[SEM DOC]**                                    | —                             | —                                              | Advogado      |
| Preços e reembolsos                      | `src/lib/pricing-texts.ts` → `/precos-e-reembolsos` | Existe (PT/EN)                                   | sem versão própria            | Prazo de reembolso "a confirmar com o jurista" | Advogado, CEO |
| Acordo de parceria (negócios)            | `docs/sales/contrato-parceiro.md`                   | **Rascunho**, não assinável                      | sem versão                    | Obrigatória                                    | Advogado, CEO |
| Subcontratantes                          | `docs/legal/SUBCONTRATANTES.md`                     | Existe (interno)                                 | —                             | Pontos [VALIDAR COM JURISTA]                   | Advogado      |
| Encarregado de proteção de dados         | `docs/legal/ENCARREGADO-PROTECAO-DADOS.md`          | Rascunho                                         | 06/11/2026                    | Não feita                                      | Advogado, CEO |
| Registo de incidentes e notificação      | `docs/security/INCIDENTES.md`                       | Existe (interno)                                 | —                             | Não feita                                      | Advogado      |
| Backups e restauro                       | `docs/security/BACKUPS.md`                          | Existe (interno)                                 | 06/11/2026                    | —                                              | CEO           |
| DPA com a Lovable                        | —                                                   | **[SEM DOC]**: só nos planos Business/Enterprise | —                             | —                                              | CEO, advogado |
| DPA com Supabase / Cloudflare / Esri     | Termos dos fornecedores                             | Não arquivado no repositório                     | —                             | —                                              | Advogado      |
| Licença de atividade / registo turístico | —                                                   | **[SEM DOC]**                                    | —                             | —                                              | Advogado      |
| Seguro                                   | —                                                   | **[SEM DOC]**                                    | —                             | —                                              | CEO, advogado |
| Regulamento de pontos e recompensas      | —                                                   | **[SEM DOC]** (regras só no código)              | —                             | —                                              | Advogado, CEO |
| Entidade legal e NUIT                    | `src/lib/app-info.ts` (`LEGAL_ENTITY`)              | "Em constituição", NUIT por atribuir             | —                             | —                                              | CEO           |
| Licenças de software                     | `public/licenses.json`, página `/creditos`          | Existe (gerado no build)                         | —                             | react-leaflet (Hippocratic) por validar        | Advogado      |
| Créditos de fotografias                  | `src/lib/photo-credits.ts`, página `/creditos`      | Existe                                           | —                             | —                                              | CEO           |
| Fontes (OFL)                             | `public/fonts/OFL.txt`                              | Existe                                           | —                             | —                                              | —             |
| Aviso de IA                              | Política §4 (assistente sem IA generativa)          | Existe (frase)                                   | 2026-11-23                    | —                                              | CEO           |

Perguntas ao advogado: `docs/legal/BRIEFING-ADVOGADO.md`.
