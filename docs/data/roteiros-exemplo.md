# Bloco A — roteiros por província (importados)

Importados na BD a 2026-11-12 (8 roteiros, gerados por `scripts/province-itineraries.ts`):
os 5 exemplos abaixo e 3 roteiros de Nampula (secção 6).

Regras aplicadas:

- Só locais que existem, com coordenadas do OpenStreetMap (o link do objeto é a fonte).
- Descrições curtas, escritas a partir das fontes citadas.
- Atividades genéricas do CSV ("caminhada", "observação de aves", "provar matapa") aparecem como
  **sugestões** dentro do dia, nunca como reserva nem como negócio.
- O tempo de viagem entre locais fica **"a confirmar"**, porque não encontrei fonte oficial.
- A época recomendada também fica "a confirmar" quando não há fonte.
- Paragens com prova por foto; as deslocações não têm prova nem dão pontos.

---

## 1. Manica: das cidades às montanhas de Chimanimani

**Dados do roteiro:**

- **Província:** Manica.
- **Duração:** 6 dias (longo).
- **Nível:** exigente.
- **Interesses:** nature, hiking, local_life.
- **Época:** a confirmar.

| Dia | Paragem                                                                                       | Tipo       | Coordenadas (OSM)                                                                        | Fonte da descrição                                                                                             |
| --- | --------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | **Chimoio**, capital da província de Manica                                                   | local      | -19.1437, 33.4780 · [relation/11589176](https://www.openstreetmap.org/relation/11589176) | [Wikipédia: Chimoio](https://en.wikipedia.org/wiki/Chimoio)                                                    |
| 2   | **Manica**, cidade junto à fronteira com o Zimbabwe                                           | local      | -18.9367, 32.8760 · [node/1419408735](https://www.openstreetmap.org/node/1419408735)     | [Wikipédia: Manica](https://en.wikipedia.org/wiki/Manica,_Mozambique)                                          |
| 3   | Deslocação Manica → Sussundenga                                                               | deslocação | —                                                                                        | tempo a confirmar                                                                                              |
| 3   | **Sussundenga**, sede do distrito onde fica o Parque Nacional de Chimanimani                  | local      | -19.4132, 33.2929 · [node/2281184283](https://www.openstreetmap.org/node/2281184283)     | [Wikipédia: Chimanimani National Park](<https://en.wikipedia.org/wiki/Chimanimani_National_Park_(Mozambique)>) |
| 4–5 | **Monte Binga**, o ponto mais alto de Moçambique (2 436 m), no Parque Nacional de Chimanimani | local      | -19.7762, 33.0626 · [node/348205650](https://www.openstreetmap.org/node/348205650)       | [Wikipédia: Geography of Mozambique](https://en.wikipedia.org/wiki/Geography_of_Mozambique)                    |
| 6   | Regresso a Chimoio                                                                            | deslocação | —                                                                                        | tempo a confirmar                                                                                              |

**Sugestões dentro dos dias (do CSV, não reserváveis):** caminhada, observação de aves, observação de
paisagens.

> Subir ao Monte Binga exige guia e preparação. A app não oferece guia enquanto não houver um negócio
> registado.

## 2. Zambézia: Quelimane e as plantações do Gurúè

**Dados do roteiro:**

- **Província:** Zambézia.
- **Duração:** 4 dias (médio).
- **Nível:** moderado.
- **Interesses:** culture, nature, local_life.
- **Época:** a confirmar.

| Dia | Paragem                                             | Tipo       | Coordenadas (OSM)                                                                  | Fonte                                                                 |
| --- | --------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | **Quelimane**, capital da Zambézia                  | local      | -17.8775, 36.8902 · [node/259593870](https://www.openstreetmap.org/node/259593870) | [Wikipédia: Quelimane](https://en.wikipedia.org/wiki/Quelimane)       |
| 2   | Deslocação Quelimane → Mocuba → Gurúè               | deslocação | Mocuba: [relation/11623581](https://www.openstreetmap.org/relation/11623581)       | tempo a confirmar                                                     |
| 2–3 | **Gurúè**, conhecido pelas plantações de chá        | local      | -15.4651, 36.9875 · [node/335170812](https://www.openstreetmap.org/node/335170812) | [Wikipédia: Gurúè](https://en.wikipedia.org/wiki/Gur%C3%BA%C3%A8)     |
| 3–4 | **Monte Namuli**, o segundo ponto mais alto do país | local      | -15.3568, 37.0598 · [node/335172051](https://www.openstreetmap.org/node/335172051) | [Wikipédia: Mount Namuli](https://en.wikipedia.org/wiki/Mount_Namuli) |

**Sugestões:** caminhada, observação de paisagens de florestas.

## 3. Tete: a cidade do Zambeze e Cahora Bassa

**Dados do roteiro:**

- **Província:** Tete.
- **Duração:** 2 dias (curto).
- **Nível:** fácil.
- **Interesses:** culture, nature.
- **Época:** a confirmar.

| Dia | Paragem                                                         | Tipo       | Coordenadas (OSM)                                                                    | Fonte                                                                                 |
| --- | --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | **Ponte Samora Machel**, sobre o rio Zambeze, na cidade de Tete | local      | -16.1548, 33.5938 · [way/44077739](https://www.openstreetmap.org/way/44077739)       | [Wikipédia: Samora Machel Bridge](https://en.wikipedia.org/wiki/Samora_Machel_Bridge) |
| 2   | Deslocação Tete → Songo                                         | deslocação | —                                                                                    | tempo a confirmar                                                                     |
| 2   | **Songo**, vila da barragem de Cahora Bassa                     | local      | -15.5951, 32.7750 · [node/1423065191](https://www.openstreetmap.org/node/1423065191) | [Wikipédia: Cahora Bassa Dam](https://en.wikipedia.org/wiki/Cahora_Bassa_Dam)         |

**Sugestões:** observação de paisagens ribeirinhas.

**Não entra:** o Parque Nacional de Mágoè. Não há ponto verificado no OSM, por isso fica "por
verificar".

## 4. Niassa: Lichinga e o Lago Niassa

**Dados do roteiro:**

- **Província:** Niassa.
- **Duração:** 4 dias (médio).
- **Nível:** moderado.
- **Interesses:** nature, local_life.
- **Época:** a confirmar.

| Dia | Paragem                                        | Tipo       | Coordenadas (OSM)                                                                        | Fonte                                                               |
| --- | ---------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | **Lichinga**, capital do Niassa                | local      | -13.2999, 35.2459 · [node/335126704](https://www.openstreetmap.org/node/335126704)       | [Wikipédia: Lichinga](https://en.wikipedia.org/wiki/Lichinga)       |
| 2   | Deslocação Lichinga → Metangula                | deslocação | —                                                                                        | tempo a confirmar                                                   |
| 2   | **Metangula**, vila na margem do lago          | local      | -12.6961, 34.8183 · [node/1426191717](https://www.openstreetmap.org/node/1426191717)     | [Wikipédia: Metangula](https://en.wikipedia.org/wiki/Metangula)     |
| 3–4 | **Cóbuè**, na costa moçambicana do Lago Niassa | local      | -12.0411, 35.0144 · [relation/17227895](https://www.openstreetmap.org/relation/17227895) | [Wikipédia: Lake Malawi](https://en.wikipedia.org/wiki/Lake_Malawi) |

**Sugestões:** observação de aves aquáticas.

**Não entra:** a Reserva Especial do Niassa. Fica longe destas paragens e não tem ponto de entrada
verificado no OSM.

## 5. Viagem longa (várias províncias): Sul, de Maputo a Vilankulo

**Dados do roteiro:**

- **Províncias:** Cidade de Maputo → Gaza → Inhambane.
- **Duração:** 7 dias.
- **Nível:** fácil.
- **Interesses:** beach, culture, local_life.
- **Época:** a confirmar.

| Dia | Paragem                                                             | Tipo       | Coordenadas (OSM)                                                                      | Fonte                                                                                 |
| --- | ------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | **Fortaleza de Maputo**                                             | local      | -25.9751, 32.5707 · [way/81244527](https://www.openstreetmap.org/way/81244527)         | [Wikipédia: Fortress of Maputo](https://en.wikipedia.org/wiki/Fortress_of_Maputo)     |
| 1   | **Mercado Central de Maputo**                                       | local      | -25.9707, 32.5689 · [way/242924493](https://www.openstreetmap.org/way/242924493)       | OSM                                                                                   |
| 2   | Deslocação Maputo → Bilene                                          | deslocação | —                                                                                      | tempo a confirmar                                                                     |
| 2   | **Lagoa Uembje**, na Praia do Bilene                                | local      | -25.2836, 33.2750 · [relation/3369134](https://www.openstreetmap.org/relation/3369134) | OSM                                                                                   |
| 3   | **Xai-Xai**, capital de Gaza                                        | local      | -25.0445, 33.6407 · [node/335077559](https://www.openstreetmap.org/node/335077559)     | [Wikipédia: Xai-Xai](https://en.wikipedia.org/wiki/Xai-Xai)                           |
| 4   | Deslocação Xai-Xai → Inhambane                                      | deslocação | —                                                                                      | tempo a confirmar                                                                     |
| 4   | **Cidade de Inhambane**                                             | local      | [relation/11623616](https://www.openstreetmap.org/relation/11623616)                   | [Wikipédia: Inhambane](https://en.wikipedia.org/wiki/Inhambane)                       |
| 5   | **Praia do Tofo** (destino Inhambane na BD)                         | destino    | -23.8536, 35.5472 · [node/2015107648](https://www.openstreetmap.org/node/2015107648)   | BD + OSM                                                                              |
| 6   | Deslocação Inhambane → Vilankulo                                    | deslocação | —                                                                                      | tempo a confirmar                                                                     |
| 6   | **Vilankulo** (destino na BD)                                       | destino    | BD                                                                                     | BD                                                                                    |
| 7   | **Ilha do Bazaruto**, no Parque Nacional do Arquipélago de Bazaruto | local      | -21.6493, 35.4698 · [way/253819812](https://www.openstreetmap.org/way/253819812)       | [Wikipédia: Bazaruto Archipelago](https://en.wikipedia.org/wiki/Bazaruto_Archipelago) |

**Sugestões:** provar matapa com camarão, visita às praias, observação de fauna marinha.

## 6. Nampula (locais verificados fora do CSV)

Locais verificados no OSM. A Ilha de Moçambique é Património Mundial da UNESCO
([whc.unesco.org/en/list/599](https://whc.unesco.org/en/list/599)).

| Local                                | Coordenadas (OSM)                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Museu Nacional de Etnologia, Nampula | -15.1180, 39.2665 · [way/511493693](https://www.openstreetmap.org/way/511493693)       |
| Angoche                              | -16.2292, 39.9081 · [node/899428282](https://www.openstreetmap.org/node/899428282)     |
| Fortaleza de São Sebastião           | -15.0287, 40.7436 · [way/206235094](https://www.openstreetmap.org/way/206235094)       |
| Palácio de São Paulo                 | -15.0315, 40.7373 · [relation/9445009](https://www.openstreetmap.org/relation/9445009) |
| Baía de Mossuril                     | -15.0207, 40.7187 · [node/2544717276](https://www.openstreetmap.org/node/2544717276)   |
| Chocas-Mar                           | -14.9427, 40.7382 · [node/617649584](https://www.openstreetmap.org/node/617649584)     |

| Código     | Roteiro                                   | Dias      | Nível    | Paragens                                                                     |
| ---------- | ----------------------------------------- | --------- | -------- | ---------------------------------------------------------------------------- |
| EK-NAM-004 | Ilha de Moçambique a pé                   | 2 (curto) | fácil    | Ilha (destino na BD), Fortaleza, Palácio; deslocação; Chocas-Mar             |
| EK-NAM-005 | Da cidade de Nampula à Ilha de Moçambique | 4 (médio) | moderado | Museu; deslocação; Ilha; Fortaleza, Palácio; Baía de Mossuril                |
| EK-NAM-006 | Nampula: Angoche e a Ilha de Moçambique   | 6 (longo) | moderado | Museu; Angoche (ida e volta); Ilha; Fortaleza, Palácio; Mossuril, Chocas-Mar |

**Sugestões:** caminhada pela Cidade de Pedra e Cal, visita às praias, provar matapa com caranguejo.

---

## Por província: o que dá e o que não dá

O CSV tem só **um** local por província. Os roteiros longos dependem de locais verificados por
mim no OSM.

| Província        | Curto (1–2 d) | Médio (3–5 d) | Longo (6–8 d)                                                                                     |
| ---------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| Cidade de Maputo | já existem 4  | já existe 1   | **não**: é uma cidade; 6–8 dias só dentro dela não fazem sentido. Entra nas viagens longas do Sul |
| Maputo           | já existem 4  | já existem 4  | possível, com a Reserva Especial / Parque Nacional de Maputo, Ponta do Ouro e Catembe             |
| Gaza             | já existem 3  | já existe 1   | possível: Limpopo + Bilene + Xai-Xai                                                              |
| Inhambane        | já existem 3  | já existem 3  | possível: cidade, Tofo, Vilankulo e Bazaruto                                                      |
| Sofala           | já existe 1   | já existe 1   | possível: Beira + Gorongosa                                                                       |
| Manica           | por criar     | já existe 1   | EK-MAN-002                                                                                        |
| Tete             | EK-TET-003    | já existem 2  | **não chega**: só a cidade e Songo estão verificados (Mágoè por verificar)                        |
| Zambézia         | por criar     | EK-ZAM-002    | **não chega**: Gilé só pelo acampamento de Etaga, Zalala só por um hotel                          |
| Nampula          | EK-NAM-004    | EK-NAM-005    | EK-NAM-006                                                                                        |
| Cabo Delgado     | —             | já existe 1   | **não**: aviso de segurança; não promover zonas desaconselhadas (ver abaixo)                      |
| Niassa           | por criar     | EK-NIA-002    | **não chega**: a Reserva do Niassa precisa de ponto de entrada verificado                         |

**Cabo Delgado:** antes de qualquer roteiro novo, juntar o aviso da fonte oficial atual
(Portal das Comunidades Portuguesas / FCDO do Reino Unido). Só Pemba e as Quirimbas, se a fonte o
permitir.
