# Checklist de uma atividade — da recolha à página pública

Para quem carrega ou aprova atividades. As regras vêm da base de dados: uma atividade **só fica
ativa (pública) quando não lhe falta nada**. A verificação é a `experience_missing`
(`drizzle/migrations/0051_content_readiness_import_invites.sql`). Se faltar alguma coisa, o botão
"Ativar" recusa e diz o quê.

## 1. Campos obrigatórios (a BD recusa ativar sem eles)

| Campo                  | Regra exata                                                   | Código do erro     |
| ---------------------- | ------------------------------------------------------------- | ------------------ |
| Preço por pessoa (MZN) | Preenchido e **≥ 0**. O 0 aparece como "Grátis"               | `price`            |
| Capacidade             | Maior que 0                                                   | `capacity`         |
| Horário                | Pelo menos 1 horário ativo e a aceitar reservas               | `schedule`         |
| Local                  | Destino com coordenadas (latitude e longitude)                | `location`         |
| Fotografia             | Pelo menos 1                                                  | `photo`            |
| Título em inglês       | Não vazio (o título em português é obrigatório no formulário) | `title_en`         |
| Descrição em português | Pelo menos 20 caracteres                                      | `description_pt`   |
| Descrição em inglês    | Pelo menos 20 caracteres                                      | `description_en`   |
| Contacto do negócio    | Telefone, email ou WhatsApp do **negócio** preenchido         | `business_contact` |

O negócio tem de estar **aprovado**. Antes disso, as suas atividades não são públicas.

## 2. Fotografias (regras do conteúdo)

`docs/content/GUIA-CONTEUDO.md` §2:

- tiradas pelo negócio, ou com autorização escrita do autor; nada da internet;
- sem caras reconhecíveis sem autorização, sobretudo de crianças;
- JPEG, PNG ou WebP, até 5 MB;
- de preferência horizontais (4:3), com pelo menos 1 200 px de largura;
- 1 obrigatória, ideal 3 a 5.

## 3. Não inventar

Se faltar um dado (preço, horário, contacto), o campo fica vazio e a atividade fica por ativar.
Não se preenche com valores parecidos (`CLAUDE.md`, `GUIA-CONTEUDO.md` §1).

## 4. Aprovação pelo admin — passo a passo

`docs/content/GUIA-CONTEUDO.md` §3–4.

1. **Importar ou criar.** Em Administração → **Conteúdo e importação**, importar o CSV (o negócio
   fica pendente e as atividades desativadas), ou o dono cria-as no painel do negócio.
2. **Ver o que falta.** Na lista "pronto para publicar", escolher o negócio. Cada atividade mostra
   os códigos da tabela acima que ainda faltam.
3. **Completar.** Corrigir → campos, horários e fotografias. Não inventar o que o negócio não deu.
4. **Aprovar o negócio** em Aprovação de Negócios. Confirmar antes o nome, a província, a
   descrição e o contacto.
5. **Ativar cada atividade.** O botão "Ativar" só funciona quando a lista do que falta está vazia.
6. **Confirmar em público.** Num separador anónimo:
   - a atividade aparece em `/experiences` e no mapa;
   - mostra o preço (ou "Grátis"), a fotografia e o contacto do negócio.
7. **Passar ao dono** (se o negócio foi carregado pelo admin): Gerar convite ao dono → enviar o
   link por WhatsApp. O link serve uma vez e expira em 14 dias.

## 5. Recolha rápida (para levar ao negócio)

- [ ] Nome da atividade (PT e EN)
- [ ] Descrição PT e EN (mínimo 20 caracteres cada: o que inclui, o que levar, ponto de encontro)
- [ ] Preço por pessoa em MZN (ou 0, se for grátis)
- [ ] Capacidade e duração
- [ ] Dias, horas e lugares por horário
- [ ] Destino no mapa
- [ ] Pelo menos 1 fotografia, com autorização escrita
- [ ] Contacto do negócio a publicar (telefone, email ou WhatsApp)
