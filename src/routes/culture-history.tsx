import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  X,
  Flag,
  Users,
  BookOpen,
  Mic2,
  Music,
  Sparkles,
  Heart,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoCredit } from "@/components/PhotoCredit";
import { PHOTOS } from "@/lib/photo-credits";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBackTarget } from "@/lib/nav";
import { useLang, type Lang } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/culture-history")({
  head: () => ({
    meta: [
      { title: "Cultura e História — Ekaya Explore" },
      { name: "description", content: "Descubra a rica história e cultura de Moçambique." },
      { property: "og:title", content: "Cultura e História — Ekaya Explore" },
      { property: "og:description", content: "Descubra a rica história e cultura de Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CultureHistoryPage,
});

type LocalizedText = Record<Lang, string>;

interface Topic {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  date: LocalizedText;
  gradient: string;
  icon: LucideIcon;
  /** Approved, credited photo (FOTOS-1); topics without a faithful free photo have none. */
  image?: string;
  short: LocalizedText;
  sections: { heading: LocalizedText; body: LocalizedText }[];
  fact: LocalizedText;
}

const copy = {
  back: { pt: "Voltar", en: "Back" },
  pageTitle: { pt: "Cultura e História", en: "Culture & History" },
  heroTitle: {
    pt: "Descobre a Rica História de Moçambique",
    en: "Discover Mozambique's Rich History",
  },
  heroDescription: {
    pt: "Heróis, ritmos e palavras que moldaram a identidade de um povo que olha o futuro sem esquecer o passado.",
    en: "Heroes, rhythms and words that shaped the identity of a people who look to the future without forgetting the past.",
  },
  topicsCount: { pt: "6 Tópicos Históricos", en: "6 Historical Topics" },
  culturalHeritage: { pt: "Património Cultural", en: "Cultural Heritage" },
  learnMore: { pt: "Saber Mais", en: "Learn More" },
  didYouKnow: { pt: "Sabia que...", en: "Did you know..." },
  heritageFooter: {
    pt: "Património Cultural de Moçambique",
    en: "Cultural Heritage of Mozambique",
  },
  close: { pt: "Fechar", en: "Close" },
  mozambique: { pt: "Moçambique", en: "Mozambique" },
} satisfies Record<string, LocalizedText>;

const TOPICS: Topic[] = [
  {
    id: "independencia",
    title: { pt: "Independência", en: "Independence" },
    subtitle: { pt: "Nascimento de uma nação", en: "Birth of a nation" },
    date: { pt: "25 de Junho de 1975", en: "25 June 1975" },
    gradient: "from-green-700 to-green-700",
    icon: Flag,
    image: PHOTOS["cult-independencia"].src,
    short: {
      pt: "O dia em que Moçambique conquistou a sua liberdade após séculos de colonização portuguesa.",
      en: "The day Mozambique won its freedom after centuries of Portuguese colonisation.",
    },
    sections: [
      {
        heading: { pt: "Contexto Histórico", en: "Historical Context" },
        body: {
          pt: "Após mais de 470 anos sob domínio português, Moçambique conquistou a independência a 25 de Junho de 1975, dia que hoje é celebrado como feriado nacional.",
          en: "After more than 470 years under Portuguese rule, Mozambique gained independence on 25 June 1975, a date now celebrated as a national holiday.",
        },
      },
      {
        heading: { pt: "A Luta Armada", en: "The Armed Struggle" },
        body: {
          pt: "A Frente de Libertação de Moçambique (FRELIMO) iniciou em 1964 uma luta armada de quase 10 anos contra o regime colonial, mobilizando comunidades em todo o território.",
          en: "The Mozambique Liberation Front (FRELIMO) began an armed struggle against the colonial regime in 1964 that lasted nearly 10 years, mobilising communities across the country.",
        },
      },
      {
        heading: { pt: "Acordo de Lusaka", en: "Lusaka Accord" },
        body: {
          pt: "Após a Revolução dos Cravos em Portugal (1974), o Acordo de Lusaka selou o caminho para a independência reconhecida internacionalmente.",
          en: "After Portugal's Carnation Revolution in 1974, the Lusaka Accord paved the way for internationally recognised independence.",
        },
      },
      {
        heading: { pt: "Os Primeiros Anos", en: "The Early Years" },
        body: {
          pt: "O novo país enfrentou desafios enormes — economia em colapso, êxodo de quadros qualificados e, pouco depois, uma guerra civil que durou 16 anos.",
          en: "The new country faced enormous challenges — an economy in collapse, an exodus of skilled professionals and, soon afterwards, a civil war that lasted 16 years.",
        },
      },
    ],
    fact: {
      pt: "A bandeira de Moçambique é a única no mundo que contém uma arma moderna — um AK-47 — símbolo da defesa da liberdade conquistada.",
      en: "Mozambique's flag is the only one in the world to feature a modern weapon — an AK-47 — symbolising the defence of its hard-won freedom.",
    },
  },
  {
    id: "samora",
    title: { pt: "Samora Machel", en: "Samora Machel" },
    subtitle: { pt: "O primeiro Presidente", en: "The first President" },
    date: { pt: "1933 – 1986", en: "1933–1986" },
    gradient: "from-red-600 to-red-700",
    icon: Users,
    image: PHOTOS["cult-samora"].src,
    short: {
      pt: "Líder revolucionário, primeiro Presidente de Moçambique independente e símbolo africano de luta.",
      en: "Revolutionary leader, first President of independent Mozambique and an African symbol of struggle.",
    },
    sections: [
      {
        heading: { pt: "Origem e Formação", en: "Origins and Education" },
        body: {
          pt: "Nascido em Gaza em 1933, formou-se enfermeiro e cedo se envolveu nos movimentos de libertação africanos.",
          en: "Born in Gaza in 1933, he trained as a nurse and became involved in African liberation movements at an early age.",
        },
      },
      {
        heading: { pt: "Líder da FRELIMO", en: "Leader of FRELIMO" },
        body: {
          pt: "Assumiu a liderança da FRELIMO em 1970 após a morte de Eduardo Mondlane e conduziu o movimento até à independência.",
          en: "He assumed leadership of FRELIMO in 1970 after Eduardo Mondlane's death and led the movement to independence.",
        },
      },
      {
        heading: { pt: "Presidência", en: "Presidency" },
        body: {
          pt: "Como Presidente (1975–1986) promoveu a alfabetização, saúde pública e a construção de uma identidade nacional moçambicana.",
          en: "As President (1975–1986), he promoted literacy, public health and the building of a Mozambican national identity.",
        },
      },
      {
        heading: { pt: "Morte Trágica", en: "Tragic Death" },
        body: {
          pt: "Morreu a 19 de Outubro de 1986 num desastre aéreo em Mbuzini, África do Sul — cujas circunstâncias permanecem polémicas.",
          en: "He died on 19 October 1986 in a plane crash in Mbuzini, South Africa — the circumstances of which remain controversial.",
        },
      },
    ],
    fact: {
      pt: "A sua viúva, Graça Machel, é a única mulher na história a ter sido primeira-dama de dois países: Moçambique e África do Sul (casada com Nelson Mandela).",
      en: "His widow, Graça Machel, is the only woman in history to have been first lady of two countries: Mozambique and South Africa, where she was married to Nelson Mandela.",
    },
  },
  {
    id: "frelimo",
    title: { pt: "FRELIMO", en: "FRELIMO" },
    subtitle: { pt: "Frente de Libertação", en: "Liberation Front" },
    date: { pt: "Fundada a 25 de Junho de 1962", en: "Founded on 25 June 1962" },
    gradient: "from-yellow-700 to-orange-700",
    icon: BookOpen,
    image: PHOTOS["cult-frelimo"].src,
    short: {
      pt: "Movimento que uniu os moçambicanos na luta pela independência e que hoje é o partido no poder.",
      en: "The movement that united Mozambicans in the struggle for independence and is now the country's governing party.",
    },
    sections: [
      {
        heading: { pt: "Fundação em Dar-es-Salaam", en: "Founded in Dar es Salaam" },
        body: {
          pt: "Fundada na Tanzânia em 1962 pela união de três movimentos nacionalistas, sob a liderança de Eduardo Mondlane.",
          en: "Founded in Tanzania in 1962 through the union of three nationalist movements under the leadership of Eduardo Mondlane.",
        },
      },
      {
        heading: { pt: "Luta Armada", en: "Armed Struggle" },
        body: {
          pt: "Em 25 de Setembro de 1964 iniciou a luta armada em Cabo Delgado, mobilizando combatentes em todo o norte do país.",
          en: "On 25 September 1964, it began the armed struggle in Cabo Delgado, mobilising fighters throughout the north of the country.",
        },
      },
      {
        heading: { pt: "Ideologia", en: "Ideology" },
        body: {
          pt: "Inicialmente de inspiração marxista-leninista, evoluiu para um partido social-democrata após o congresso de 1989.",
          en: "Initially inspired by Marxism-Leninism, it evolved into a social-democratic party after its 1989 congress.",
        },
      },
      {
        heading: { pt: "Era Democrática", en: "Democratic Era" },
        body: {
          pt: "Desde as primeiras eleições multipartidárias em 1994, mantém-se como o principal partido político de Moçambique.",
          en: "Since the first multiparty elections in 1994, it has remained Mozambique's leading political party.",
        },
      },
    ],
    fact: {
      pt: "O dia 25 de Junho — escolhido para proclamar a independência — coincide propositadamente com o aniversário da fundação da FRELIMO.",
      en: "The date of 25 June — chosen for the proclamation of independence — deliberately coincides with the anniversary of FRELIMO's founding.",
    },
  },
  {
    id: "azagaia",
    title: { pt: "Azagaia", en: "Azagaia" },
    subtitle: { pt: "A voz da juventude", en: "The voice of youth" },
    date: { pt: "1977 – 2023", en: "1977–2023" },
    gradient: "from-purple-600 to-purple-700",
    icon: Mic2,
    short: {
      pt: "Rapper e ativista que se tornou símbolo da liberdade de expressão e crítica social em Moçambique.",
      en: "Rapper and activist who became a symbol of freedom of expression and social criticism in Mozambique.",
    },
    sections: [
      {
        heading: { pt: "Nome e Origem", en: "Name and Origins" },
        body: {
          pt: "Edson da Luz, nascido em 1984 em Namaacha, adotou o nome artístico Azagaia — uma lança africana — para representar a sua arte.",
          en: "Edson da Luz, born in Namaacha in 1984, adopted the stage name Azagaia — an African spear — to represent his art.",
        },
      },
      {
        heading: { pt: "Música de Intervenção", en: "Protest Music" },
        body: {
          pt: "As suas letras denunciavam corrupção, abuso de poder e injustiça social, tornando-o referência do rap africano.",
          en: "His lyrics denounced corruption, abuse of power and social injustice, making him a leading voice in African rap.",
        },
      },
      {
        heading: { pt: "Censura e Tribunais", en: "Censorship and the Courts" },
        body: {
          pt: "Foi processado várias vezes pelo Estado por causa das suas músicas, ganhando ainda mais admiração popular.",
          en: "He was prosecuted by the state several times because of his music, earning even greater popular admiration.",
        },
      },
      {
        heading: { pt: "Legado", en: "Legacy" },
        body: {
          pt: "Morreu em Março de 2023, deixando um legado de coragem artística que inspira gerações em toda a África lusófona.",
          en: "He died in March 2023, leaving a legacy of artistic courage that inspires generations across Portuguese-speaking Africa.",
        },
      },
    ],
    fact: {
      pt: "A música 'Povo no Poder' tornou-se hino de protesto em Moçambique e foi cantada espontaneamente em manifestações após a sua morte.",
      en: "The song 'Povo no Poder' became a protest anthem in Mozambique and was sung spontaneously at demonstrations after his death.",
    },
  },
  {
    id: "marrabenta",
    title: { pt: "Marrabenta", en: "Marrabenta" },
    subtitle: { pt: "O ritmo do país", en: "The rhythm of the country" },
    date: { pt: "Desde os anos 1950", en: "Since the 1950s" },
    gradient: "from-blue-600 to-blue-700",
    icon: Music,
    image: PHOTOS["cult-marrabenta"].src,
    short: {
      pt: "Género musical urbano que define a identidade sonora moçambicana, nascido nos subúrbios de Lourenço Marques.",
      en: "An urban musical genre that defines Mozambique's sound identity, born in the suburbs of Lourenço Marques.",
    },
    sections: [
      {
        heading: { pt: "Origem", en: "Origins" },
        body: {
          pt: "Surgiu nos anos 1950 nos bairros de Lourenço Marques (atual Maputo) com guitarras feitas de bidões de óleo e cordas de bicicleta.",
          en: "It emerged in the 1950s in the neighbourhoods of Lourenço Marques, now Maputo, with guitars made from oil drums and bicycle strings.",
        },
      },
      {
        heading: { pt: "Significado do Nome", en: "Meaning of the Name" },
        body: {
          pt: "Vem do verbo 'rebentar' — porque as cordas das guitarras improvisadas frequentemente rebentavam ao tocar.",
          en: "It comes from the Portuguese verb 'rebentar', meaning to snap, because the strings of the improvised guitars often broke while being played.",
        },
      },
      {
        heading: { pt: "Grandes Nomes", en: "Leading Artists" },
        body: {
          pt: "Fany Mpfumo, Dilon Djindji, Wazimbo e Mingas são lendas que internacionalizaram este género.",
          en: "Fany Mpfumo, Dilon Djindji, Wazimbo and Mingas are legends who brought the genre to international audiences.",
        },
      },
      {
        heading: { pt: "Hoje", en: "Today" },
        body: {
          pt: "A marrabenta continua viva em festivais nacionais e influencia artistas contemporâneos de pop e afro-house.",
          en: "Marrabenta remains alive at national festivals and influences contemporary pop and Afro-house artists.",
        },
      },
    ],
    fact: {
      pt: "A marrabenta foi declarada Património Cultural de Moçambique e influencia ritmos modernos como o pandza e o afro-house moçambicano.",
      en: "Marrabenta has been declared part of Mozambique's Cultural Heritage and influences modern rhythms such as pandza and Mozambican Afro-house.",
    },
  },
  {
    id: "craveirinha",
    title: { pt: "José Craveirinha", en: "José Craveirinha" },
    subtitle: { pt: "Poeta Nacional", en: "National Poet" },
    date: { pt: "1922 – 2003", en: "1922–2003" },
    gradient: "from-teal-700 to-teal-700",
    icon: Sparkles,
    short: {
      pt: "Considerado o maior poeta moçambicano, foi voz literária da identidade e da resistência cultural.",
      en: "Considered Mozambique's greatest poet, he was a literary voice of identity and cultural resistance.",
    },
    sections: [
      {
        heading: { pt: "Vida", en: "Life" },
        body: {
          pt: "Nasceu em Lourenço Marques em 1922, filho de pai português e mãe ronga, vivendo entre dois mundos que marcaram a sua obra.",
          en: "Born in Lourenço Marques in 1922 to a Portuguese father and a Ronga mother, he lived between two worlds that shaped his work.",
        },
      },
      {
        heading: { pt: "Obra", en: "Work" },
        body: {
          pt: "Publicou 'Xigubo' (1964), 'Karingana ua Karingana' e 'Maria', obras fundamentais da literatura africana de língua portuguesa.",
          en: "He published 'Xigubo' (1964), 'Karingana ua Karingana' and 'Maria', landmark works of Portuguese-language African literature.",
        },
      },
      {
        heading: { pt: "Prisão Colonial", en: "Colonial Imprisonment" },
        body: {
          pt: "Foi preso pela PIDE entre 1965 e 1969 por causa do seu envolvimento na luta pela independência.",
          en: "He was imprisoned by the PIDE between 1965 and 1969 because of his involvement in the struggle for independence.",
        },
      },
      {
        heading: { pt: "Reconhecimento", en: "Recognition" },
        body: {
          pt: "Em 1991 recebeu o Prémio Camões — o primeiro autor africano a conquistar o mais alto galardão da literatura em língua portuguesa.",
          en: "In 1991, he received the Camões Prize — the first African author to win the highest honour in Portuguese-language literature.",
        },
      },
    ],
    fact: {
      pt: "José Craveirinha foi nomeado várias vezes para o Prémio Nobel da Literatura, sendo um dos grandes nomes africanos da poesia mundial.",
      en: "José Craveirinha was nominated several times for the Nobel Prize in Literature and is one of Africa's great names in world poetry.",
    },
  },
];

function CultureHistoryPage() {
  const navigate = useNavigate();
  const backTarget = useBackTarget();
  const { lang } = useLang();
  const [selected, setSelected] = useState<Topic | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: backTarget })}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" /> {copy.back[lang]}
          </button>
          <h1 className="font-bold text-sm sm:text-base truncate">🇲🇿 {copy.pageTitle[lang]}</h1>
          <ThemeToggle />
          <LanguageToggle />
          <UserMenu />
        </div>
      </header>

      <section className="relative h-96 overflow-hidden bg-muted">
        <div className="relative h-full flex flex-col items-center justify-center text-center text-foreground px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl font-bold mb-3"
          >
            {copy.heroTitle[lang]}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl text-muted-foreground mb-5"
          >
            {copy.heroDescription[lang]}
          </motion.p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge className="bg-card text-foreground border-border px-3 py-1 text-xs">
              {copy.topicsCount[lang]}
            </Badge>
            <Badge className="bg-card text-foreground border-border px-3 py-1 text-xs">
              {copy.culturalHeritage[lang]}
            </Badge>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOPICS.map((topic, i) => (
            <motion.button
              key={topic.id}
              type="button"
              onClick={() => setSelected(topic)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -10, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.25)" }}
              className="text-left rounded-3xl overflow-hidden bg-card border shadow-lg transition-all"
            >
              <div className="relative h-56 overflow-hidden">
                {topic.image && (
                  <img
                    src={topic.image}
                    alt={topic.title[lang]}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <PhotoCredit src={topic.image} />
                <div className={`absolute inset-0 bg-gradient-to-t ${topic.gradient} opacity-80`} />
                <div className="absolute top-4 right-4 size-11 rounded-2xl bg-card shadow-lg flex items-center justify-center">
                  <topic.icon className="size-5 text-foreground" />
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-2xl font-bold leading-tight">{topic.title[lang]}</h3>
                  <p className="text-sm text-white/90">{topic.subtitle[lang]}</p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground mb-2">{topic.date[lang]}</p>
                <p className="text-sm text-foreground/80 mb-4 line-clamp-3">{topic.short[lang]}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary group">
                  {copy.learnMore[lang]}
                  <motion.span className="inline-block" whileHover={{ x: 4 }}>
                    <ArrowRight className="size-4" />
                  </motion.span>
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 22 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-card rounded-2xl sm:rounded-3xl overflow-hidden w-full max-w-5xl shadow-2xl flex flex-col max-h-[96svh] sm:max-h-[92vh]"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`topic-${selected.id}`}
            >
              <div className="relative h-52 sm:h-64 lg:h-72 shrink-0">
                {selected.image && (
                  <img
                    src={selected.image}
                    alt={selected.title[lang]}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <PhotoCredit src={selected.image} />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${selected.gradient} opacity-85`}
                />
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 size-10 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={copy.close[lang]}
                >
                  <X className="size-5" />
                </motion.button>
                <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-8 sm:right-8 text-white">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="size-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <selected.icon className="size-6" />
                    </div>
                    <div>
                      <h2
                        id={`topic-${selected.id}`}
                        className="text-2xl sm:text-3xl font-bold leading-tight"
                      >
                        {selected.title[lang]}
                      </h2>
                      <p className="text-sm text-white/90">{selected.date[lang]}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8 lg:px-10 lg:py-9">
                <p className="mb-7 max-w-3xl text-base leading-relaxed text-foreground/80">
                  {selected.short[lang]}
                </p>
                <div className="grid gap-6 md:grid-cols-2 md:gap-x-10 md:gap-y-8">
                  {selected.sections.map((section) => (
                    <div key={section.heading.pt} className="flex gap-4">
                      <div
                        className={`w-1 rounded-full bg-gradient-to-b ${selected.gradient} shrink-0`}
                      />
                      <div>
                        <h4 className="font-bold mb-2">{section.heading[lang]}</h4>
                        <p className="text-base text-muted-foreground leading-7">
                          {section.body[lang]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className={`mt-8 rounded-2xl p-5 sm:p-6 bg-gradient-to-br ${selected.gradient} text-white`}
                >
                  <div className="flex items-start gap-3">
                    <Heart className="size-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm mb-1">{copy.didYouKnow[lang]}</p>
                      <p className="text-base leading-relaxed text-white/95">
                        {selected.fact[lang]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t p-4 sm:px-8 flex items-center justify-between gap-4 bg-muted/30 shrink-0">
                <p className="text-xs text-muted-foreground">{copy.heritageFooter[lang]}</p>
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  {copy.close[lang]}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
