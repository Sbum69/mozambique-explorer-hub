# SEO: aparecer nas pesquisas do Google

O que o código já faz:

- Nome único **EKAYA** no `<title>`, Open Graph, manifest, emails e rodapé.
- Dados estruturados `Organization` e `WebSite` na home, com os nomes alternativos `Explore EKAYA`,
  `exploreekaya` e `Ekaya Moçambique`.
- Título e descrição com o nome real em cada roteiro, negócio e experiência pública, já no HTML
  do servidor.
- `sitemap.xml` com as páginas públicas, os roteiros aprovados, os negócios aprovados e as suas
  experiências, cada um com `lastmod`.
- `robots.txt` igual em todos os domínios, e `noindex` fora de `exploreekaya.com`.

O resto não é código. Está aqui por ordem de impacto e só tu o podes fazer.

## Porque se escolheu "EKAYA"

- É o nome do logótipo, do ícone, do manifest e da imagem de partilha.
- É curto, igual em PT e EN, e não depende de "Explore", que é uma palavra comum.

O domínio `exploreekaya.com` leva a pesquisa "explore ekaya" para o mesmo sítio, e os nomes
alternativos nos dados estruturados ajudam o Google a ligar as duas formas. Nas redes, no perfil de
empresa e em qualquer menção, usar sempre **EKAYA**. Quando for preciso desambiguar, usar "EKAYA
Moçambique".

## 1. Google Search Console (impacto alto, 10 minutos)

O domínio já tem registos `google-site-verification` no DNS. Para usar o Search Console:

1. Abrir <https://search.google.com/search-console> e escolher a propriedade **Domínio**
   `exploreekaya.com`. Se não aparecer, adicioná-la; a verificação por DNS já existe.
2. Ir a **Sitemaps** e submeter `https://exploreekaya.com/sitemap.xml`.
3. Em **Páginas**, ver "Não indexadas". São esperadas as páginas privadas (bloqueadas no
   `robots.txt`) e a `/home`, que é duplicada de `/` com canonical. Se aparecer outra, mandar-me o
   motivo.
4. Em **Inspeção de URLs**, inspecionar `https://exploreekaya.com/` e pedir indexação.
5. Para eu ver os dados: em **Definições → Utilizadores e autorizações**, dar acesso de leitura a
   quem trata disto. Não preciso de palavras-passe.

## 2. Perfil de Empresa no Google (impacto alto)

É o perfil que faz aparecer o painel à direita e as sugestões com o nome.

1. Abrir <https://business.google.com> com a conta da empresa, e não com uma pessoal.
2. Nome: **EKAYA**. Categoria: "Agência de viagens" ou "Serviço de turismo". Site:
   `https://exploreekaya.com`.
3. Se não houver morada aberta ao público, escolher "Presto serviços na morada dos clientes" e a
   área "Moçambique".
4. Logótipo: `public/icon-512.png`. Capa: `public/og-image.png`.
5. Fazer a verificação que o Google pedir, por vídeo ou por código.

## 3. Redes sociais com o mesmo nome (impacto médio)

- Criar ou renomear os perfis com o mesmo nome e o mesmo identificador, de preferência
  `@exploreekaya` em todas: Instagram, Facebook, LinkedIn e TikTok, se fizer sentido.
- Pôr o link para `https://exploreekaya.com` em cada perfil.
- Quando existirem, mandar-me os links. Entram no `sameAs` dos dados estruturados e no rodapé.

## 4. Links de parceiros (impacto médio, ao longo do tempo)

Pedir aos negócios registados, cooperativas, guias e associações de turismo que ponham um link para
a sua página no EKAYA (`/business/<id>`) ou para a home. Um link de um site de turismo moçambicano
vale mais do que muitos de diretórios genéricos. Não comprar links.

## 5. Conteúdo próprio (impacto médio, mais tarde)

- Hoje os destinos só aparecem no mapa e não têm página própria.
- Páginas por destino (Ilha de Moçambique, Gorongosa, Tofo…), com texto real e ligadas entre si,
  são o que mais faz aparecer em pesquisas por lugar.
- Está na proposta de redesign da Fase 2. Os textos têm de vir de fontes reais.

## Como verificar

```sh
curl -s https://exploreekaya.com/ | grep -o 'application/ld+json'
curl -s https://exploreekaya.com/sitemap.xml | head
```

Teste dos dados estruturados: <https://search.google.com/test/rich-results> com
`https://exploreekaya.com/`.
