# Guia de conteúdo — carregar os negócios do piloto

Objetivo: pôr um negócio novo no EKAYA em poucos minutos, sem SQL e sem inventar dados.
Piloto: Maputo (cidade e província) e Inhambane (Tofo e Vilankulo).

## 1. O que pedir ao negócio

Leva esta lista à visita ou envia-a por WhatsApp (mensagem pronta na secção 5).

**O negócio**

- [ ] Nome, tal como aparece na porta.
- [ ] Província e bairro, rua ou ponto de referência.
- [ ] Tipo de negócio: restaurante, alojamento, operador de passeios, loja…
- [ ] Descrição curta, em 2 ou 3 frases: o que tem de especial e para quem é.
- [ ] Contactos que aceita publicar: telefone, WhatsApp, email, site.
- [ ] Nome e telefone do dono, para o convite (secção 4). Não é publicado.

**Cada atividade que aceita reservas**

- [ ] Nome da atividade, em português e, se possível, em inglês.
- [ ] Descrição: o que inclui, o que levar, ponto de encontro.
- [ ] Preço por pessoa em meticais.
- [ ] Quantas pessoas cabem.
- [ ] Duração.
- [ ] Dias e horas em que acontece e quantos lugares há em cada horário.
- [ ] Destino no mapa: Inhambane (inclui o Tofo), Vilankulo, Maputo, Pemba, Ilha de Moçambique ou Gorongosa.

**Fotos** (ver a secção 2).

**Se faltar alguma coisa, não preenchas com valores parecidos:** deixa o campo vazio. A lista "pronto para publicar" mostra o que falta, e a atividade não fica pública enquanto faltar alguma coisa.

## 2. Fotos

- **Direitos:** só fotos tiradas por ti ou pelo negócio, ou fotos que o negócio está autorizado a usar.
  - Pede autorização por escrito (uma mensagem de WhatsApp chega): "Autorizo o EKAYA a publicar estas fotos do meu negócio."
  - Nada de fotos tiradas da internet nem de outras plataformas.
- **Pessoas:** evita caras reconhecíveis sem autorização, sobretudo de crianças.
- **Formato:** JPEG, PNG ou WebP, até **5 MB** cada uma.
- **Medida:** de preferência horizontal (4:3) e com pelo menos 1 200 px de largura.
- **Quantidade:** pelo menos **1 foto por atividade**, que é obrigatória para a publicar. Ideal: 3 a 5. A foto do negócio é opcional; sem ela, aparece o marcador com a inicial.
- **Bons exemplos:** a atividade a acontecer, o espaço com luz natural, o prato servido.

## 3. Importar e publicar

1. **Descarrega o modelo:** `docs/content/modelo-importacao.xlsx`, ou em Administração → Conteúdo e importação → "Descarregar modelo CSV".
2. **Preenche a folha Importar.**
   - Primeiro uma linha por negócio, depois uma linha por atividade, com o mesmo `nome_negocio` e a mesma `provincia`.
   - Os códigos aceites estão na folha **Valores**.
   - Apaga as linhas EXEMPLO.
3. **Guarda como CSV:** no Excel, Ficheiro → Guardar como → **CSV UTF-8**. Tanto faz o separador ser vírgula ou ponto e vírgula.
4. **No EKAYA:** Administração → **Conteúdo e importação** → **Escolher ficheiro CSV**.
   - A pré-visualização mostra cada linha como **Válida**, **Com erros** (e diz porquê) ou **Já existe**. Os duplicados são detetados pelo nome e pela província.
   - Corrige os erros no ficheiro e volta a escolhê-lo, ou importa só as válidas.
5. **Importa as linhas válidas como rascunho.** Os negócios ficam pendentes e sem dono; as atividades ficam desativadas.
6. **Escolhe o negócio** na lista "pronto para publicar" e completa o que falta: Corrigir → campos, horários e **fotos**.
7. **Aprova o negócio** em Aprovação de Negócios.
8. **Ativa cada atividade.** O botão "Ativar" só funciona quando não falta nada; a própria base de dados recusa ativações incompletas.
9. **Confirma** em `/experiences` e no mapa, num separador anónimo.

## 4. Passar o negócio ao dono

1. Em Conteúdo e importação, escolhe o negócio → **Gerar convite ao dono** → **Copiar link**.
2. Envia o link ao dono por WhatsApp. **Serve uma só vez e expira em 14 dias.** Gerar outro anula o anterior.
3. O dono abre o link, entra ou cria conta, e carrega em **Aceitar e gerir o negócio**. Se ainda não tinha conta, depois de a criar volta a abrir o mesmo link.
4. A partir daí, o dono gere o perfil, as atividades, os horários e as fotos no **painel do negócio**, onde também vê a lista "pronto para publicar".

## 5. Mensagem de WhatsApp para pedir os dados

> Olá! Sou do EKAYA, uma plataforma que mostra negócios locais a quem visita Moçambique. O perfil é **grátis** e não é obrigatório aceitar reservas.
>
> Para criarmos o perfil do seu negócio, pode enviar-me por aqui:
>
> 1. Nome do negócio e morada (ou ponto de referência)
> 2. Uma descrição curta (2 ou 3 frases)
> 3. Contactos que quer mostrar (telefone, WhatsApp, email)
> 4. Se tiver atividades com marcação (passeios, aulas, refeições), para cada uma: nome, o que inclui, preço por pessoa, quantas pessoas, duração, dias e horas
> 5. Algumas fotos suas (do espaço ou das atividades) e uma frase a autorizar o EKAYA a publicá-las
>
> Depois envio-lhe um link para ficar com o perfil e o poder alterar quando quiser. Obrigado!

## 6. Por decidir

- **Cidade de Maputo:** não há nenhum destino nessa província. Uma atividade de um negócio da Cidade de Maputo pode usar o destino "Maputo" na importação, mas o dono não o consegue escolher no painel, porque o painel exige o destino da mesma província. É preciso criar o destino "Cidade de Maputo", com coordenadas verdadeiras.
- **Atividades gratuitas:** hoje, a validação exige preço maior que 0. Se houver atividades gratuitas, é preciso mudar esta regra.
