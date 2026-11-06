# Subcontratantes e serviços externos

> Rascunho — sujeito a revisão jurídica. Atualizado a 06/11/2026.

Esta lista tem de coincidir com a secção 4 da Política de Privacidade (`src/lib/legal/privacy.ts`).
Quem acrescentar um serviço que receba dados atualiza os dois, muda `LEGAL_VERSIONS` e cria a
migração de `current_legal_versions()` (ver CLAUDE.md).

Há dois grupos:

- **Subcontratantes** (art. 28.º do RGPD): tratam dados pessoais por conta do EKAYA.
- **Serviços chamados pelo browser**: recebem o endereço IP e o pedido concreto (coordenadas, área do
  mapa), sem conta nem nome.

## Resumo

| Serviço                            | Papel                                     | Dados que recebe                                                                                                                       | Região                                                                                | Contrato / termos                                                                                                                                                     | O que tens de fazer                                                                                                                                                                                                               |
| ---------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lovable (Lovable Cloud)**        | Subcontratante: alojamento da app e da BD | Todos os dados guardados na app (conta, reservas, atividade, ficheiros) e os registos de acesso                                        | UE (Suécia) como empresa; a infraestrutura usa Supabase e Cloudflare                  | [Termos](https://lovable.dev/terms) · [Privacidade](https://lovable.dev/privacy) · DPA: só nos planos Business/Enterprise                                             | **[DECIDIR]** O DPA da Lovable só existe nos planos Business/Enterprise. Ou passas para esse plano e assinas o DPA, ou pedes à Lovable, por escrito, que confirme que os Termos atuais cobrem o tratamento por conta de clientes. |
| **Supabase**                       | Subcontratante (através da Lovable)       | Base de dados, autenticação (email, palavra-passe cifrada, sessões, 2FA) e Storage (fotos, provas)                                     | Região do projeto Lovable Cloud **[VALIDAR]** (confirmar no painel: Cloud → Settings) | [DPA](https://supabase.com/legal/dpa) · [Termos](https://supabase.com/terms) · [Subprocessadores](https://supabase.com/legal/subprocessors)                           | O projeto pertence à conta Lovable: o DPA da Supabase aplica-se entre a Lovable e a Supabase. Confirmar com a Lovable que está em vigor (mesmo pedido acima).                                                                     |
| **Cloudflare**                     | Subcontratante (rede e execução da app)   | Pedidos HTTP: endereço IP, browser, página pedida; o código do servidor corre nos Workers                                              | Rede global (o pedido é tratado no centro de dados mais próximo)                      | [DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) · [Privacidade](https://www.cloudflare.com/privacypolicy/)                                                 | Se a conta Cloudflare for tua (deploy próprio): aceitar o DPA no painel (Manage Account → Configurations → Data Processing Addendum). Se o alojamento for só da Lovable: fica coberto pelo pedido acima.                          |
| **OpenStreetMap (mosaicos)**       | Serviço chamado pelo browser              | IP e área do mapa vista                                                                                                                | Servidores da OSMF (Europa) e CDN                                                     | [Política de uso dos mosaicos](https://operations.osmfoundation.org/policies/tiles/) · [Direitos de autor (ODbL)](https://www.openstreetmap.org/copyright)            | **[DECIDIR]** A política dos mosaicos não serve para uso comercial com muito tráfego. Antes de crescer: fornecedor comercial de mosaicos (vários têm plano grátis) ou servidor próprio. Manter a atribuição.                      |
| **Esri / ArcGIS (satélite)**       | Serviço chamado pelo browser              | IP e área do mapa vista (camada de satélite do roteiro)                                                                                | EUA e CDN                                                                             | [Termos da Esri](https://www.esri.com/en-us/legal/terms/full-master-agreement) · [Atribuição](https://developers.arcgis.com/documentation/esri-and-data-attribution/) | **[DECIDIR]** O uso dos mosaicos World Imagery sem conta ArcGIS deve ser confirmado nos termos (uso comercial). Alternativa: conta ArcGIS Location Platform (tem plano grátis) ou retirar a camada.                               |
| **OSRM (router.project-osrm.org)** | Serviço chamado pelo browser              | IP e coordenadas dos pontos do roteiro                                                                                                 | Servidor de demonstração (Europa)                                                     | [Política do servidor de demonstração](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)                                                                 | **[DECIDIR]** O servidor de demonstração é só para testes, sem garantia nem uso intensivo. Para o lançamento: OSRM próprio, ou um serviço de rotas com plano comercial.                                                           |
| **Open-Meteo**                     | Serviço chamado pelo browser              | IP e coordenadas dos destinos                                                                                                          | UE (Suíça/Alemanha)                                                                   | [Termos](https://open-meteo.com/en/terms) · [Licença dos dados CC BY 4.0](https://open-meteo.com/en/license)                                                          | **[DECIDIR]** A API grátis é só para uso não comercial. Como o EKAYA cobra a negócios: plano pago da Open-Meteo (API comercial) ou outro fornecedor. Manter a atribuição "Open-Meteo.com, CC BY 4.0" (já em /creditos).           |
| **Google Fonts**                   | **Não usado**                             | Nada: as fontes estão em `public/fonts` e são servidas pelo EKAYA. A CSP já não permite `fonts.googleapis.com` nem `fonts.gstatic.com` | —                                                                                     | —                                                                                                                                                                     | Nada. Se um dia for usado, entra nesta lista, na Política e na CSP.                                                                                                                                                               |

Também **não usados**: Unsplash (retirado da CSP), ferramentas de análise, publicidade, pagamentos na
app, fornecedor de email próprio (os emails de autenticação saem da Supabase/Lovable) e IA generativa
(o assistente está desligado: `ASSISTANT_LLM_ENABLED = false`).

## Assistente com IA (futuro)

Se a fase 2 do assistente for ligada (Cloudflare Workers AI, Qwen3), o fornecedor recebe **só a
pergunta** (sem conta nem IP) e as entradas da FAQ usadas como fontes. Antes de ligar:

1. Acrescentar a linha nesta tabela e na secção 4 da Política; mudar a versão da Política.
2. Confirmar que o DPA da Cloudflare cobre o Workers AI.
3. O texto do assistente muda sozinho para "Assistente com IA, pode errar" (mesma flag).

## Transferências para fora de Moçambique e da UE

Supabase, Cloudflare e Esri podem tratar dados nos EUA. As garantias são as cláusulas contratuais-tipo
da UE incluídas nos DPA de cada um. **[VALIDAR COM JURISTA]** a lei moçambicana sobre transferências
internacionais (Lei das Transações Eletrónicas, Lei n.º 3/2017, e eventual lei de proteção de dados).
