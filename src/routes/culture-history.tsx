import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft, X, Flag, Users, BookOpen, Mic2, Music, Sparkles, Heart, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/culture-history")({
  head: () => ({
    meta: [
      { title: "Cultura e História — Ekaya Explore" },
      { name: "description", content: "Descubra a rica história e cultura de Moçambique." },
    ],
  }),
  component: CultureHistoryPage,
});

interface Topic {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  gradient: string;
  icon: LucideIcon;
  image: string;
  short: string;
  sections: { heading: string; body: string }[];
  fact: string;
}

const TOPICS: Topic[] = [
  {
    id: "independencia",
    title: "Independência",
    subtitle: "Nascimento de uma nação",
    date: "25 de Junho de 1975",
    gradient: "from-green-500 to-green-700",
    icon: Flag,
    image: "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=1200&h=600&fit=crop",
    short: "O dia em que Moçambique conquistou a sua liberdade após séculos de colonização portuguesa.",
    sections: [
      { heading: "Contexto Histórico", body: "Após mais de 470 anos sob domínio português, Moçambique conquistou a independência a 25 de Junho de 1975, dia que hoje é celebrado como feriado nacional." },
      { heading: "A Luta Armada", body: "A Frente de Libertação de Moçambique (FRELIMO) iniciou em 1964 uma luta armada de quase 10 anos contra o regime colonial, mobilizando comunidades em todo o território." },
      { heading: "Acordo de Lusaka", body: "Após a Revolução dos Cravos em Portugal (1974), o Acordo de Lusaka selou o caminho para a independência reconhecida internacionalmente." },
      { heading: "Os Primeiros Anos", body: "O novo país enfrentou desafios enormes — economia em colapso, êxodo de quadros qualificados e, pouco depois, uma guerra civil que durou 16 anos." },
    ],
    fact: "A bandeira de Moçambique é a única no mundo que contém uma arma moderna — um AK-47 — símbolo da defesa da liberdade conquistada.",
  },
  {
    id: "samora",
    title: "Samora Machel",
    subtitle: "O primeiro Presidente",
    date: "1933 – 1986",
    gradient: "from-red-500 to-red-700",
    icon: Users,
    image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=1200&h=600&fit=crop",
    short: "Líder revolucionário, primeiro Presidente de Moçambique independente e símbolo africano de luta.",
    sections: [
      { heading: "Origem e Formação", body: "Nascido em Gaza em 1933, formou-se enfermeiro e cedo se envolveu nos movimentos de libertação africanos." },
      { heading: "Líder da FRELIMO", body: "Assumiu a liderança da FRELIMO em 1970 após a morte de Eduardo Mondlane e conduziu o movimento até à independência." },
      { heading: "Presidência", body: "Como Presidente (1975–1986) promoveu a alfabetização, saúde pública e a construção de uma identidade nacional moçambicana." },
      { heading: "Morte Trágica", body: "Morreu a 19 de Outubro de 1986 num desastre aéreo em Mbuzini, África do Sul — cujas circunstâncias permanecem polémicas." },
    ],
    fact: "A sua viúva, Graça Machel, é a única mulher na história a ter sido primeira-dama de dois países: Moçambique e África do Sul (casada com Nelson Mandela).",
  },
  {
    id: "frelimo",
    title: "FRELIMO",
    subtitle: "Frente de Libertação",
    date: "Fundada a 25 de Junho de 1962",
    gradient: "from-yellow-600 to-orange-600",
    icon: BookOpen,
    image: "https://images.unsplash.com/photo-1531315396756-905d68d21b56?w=1200&h=600&fit=crop",
    short: "Movimento que uniu os moçambicanos na luta pela independência e que hoje é o partido no poder.",
    sections: [
      { heading: "Fundação em Dar-es-Salaam", body: "Fundada na Tanzânia em 1962 pela união de três movimentos nacionalistas, sob a liderança de Eduardo Mondlane." },
      { heading: "Luta Armada", body: "Em 25 de Setembro de 1964 iniciou a luta armada em Cabo Delgado, mobilizando combatentes em todo o norte do país." },
      { heading: "Ideologia", body: "Inicialmente de inspiração marxista-leninista, evoluiu para um partido social-democrata após o congresso de 1989." },
      { heading: "Era Democrática", body: "Desde as primeiras eleições multipartidárias em 1994, mantém-se como o principal partido político de Moçambique." },
    ],
    fact: "O dia 25 de Junho — escolhido para proclamar a independência — coincide propositadamente com o aniversário da fundação da FRELIMO.",
  },
  {
    id: "azagaia",
    title: "Azagaia",
    subtitle: "A voz da juventude",
    date: "1977 – 2023",
    gradient: "from-purple-500 to-purple-700",
    icon: Mic2,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=600&fit=crop",
    short: "Rapper e ativista que se tornou símbolo da liberdade de expressão e crítica social em Moçambique.",
    sections: [
      { heading: "Nome e Origem", body: "Edson da Luz, nascido em 1984 em Namaacha, adotou o nome artístico Azagaia — uma lança africana — para representar a sua arte." },
      { heading: "Música de Intervenção", body: "As suas letras denunciavam corrupção, abuso de poder e injustiça social, tornando-o referência do rap africano." },
      { heading: "Censura e Tribunais", body: "Foi processado várias vezes pelo Estado por causa das suas músicas, ganhando ainda mais admiração popular." },
      { heading: "Legado", body: "Morreu em Março de 2023, deixando um legado de coragem artística que inspira gerações em toda a África lusófona." },
    ],
    fact: "A música 'Povo no Poder' tornou-se hino de protesto em Moçambique e foi cantada espontaneamente em manifestações após a sua morte.",
  },
  {
    id: "marrabenta",
    title: "Marrabenta",
    subtitle: "O ritmo do país",
    date: "Desde os anos 1950",
    gradient: "from-blue-500 to-blue-700",
    icon: Music,
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=600&fit=crop",
    short: "Género musical urbano que define a identidade sonora moçambicana, nascido nos subúrbios de Lourenço Marques.",
    sections: [
      { heading: "Origem", body: "Surgiu nos anos 1950 nos bairros de Lourenço Marques (atual Maputo) com guitarras feitas de bidões de óleo e cordas de bicicleta." },
      { heading: "Significado do Nome", body: "Vem do verbo 'rebentar' — porque as cordas das guitarras improvisadas frequentemente rebentavam ao tocar." },
      { heading: "Grandes Nomes", body: "Fany Mpfumo, Dilon Djindji, Wazimbo e Mingas são lendas que internacionalizaram este género." },
      { heading: "Hoje", body: "A marrabenta continua viva em festivais nacionais e influencia artistas contemporâneos de pop e afro-house." },
    ],
    fact: "A marrabenta foi declarada Património Cultural de Moçambique e influencia ritmos modernos como o pandza e o afro-house moçambicano.",
  },
  {
    id: "craveirinha",
    title: "José Craveirinha",
    subtitle: "Poeta Nacional",
    date: "1922 – 2003",
    gradient: "from-teal-500 to-teal-700",
    icon: Sparkles,
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&h=600&fit=crop",
    short: "Considerado o maior poeta moçambicano, foi voz literária da identidade e da resistência cultural.",
    sections: [
      { heading: "Vida", body: "Nasceu em Lourenço Marques em 1922, filho de pai português e mãe ronga, vivendo entre dois mundos que marcaram a sua obra." },
      { heading: "Obra", body: "Publicou 'Xigubo' (1964), 'Karingana ua Karingana' e 'Maria', obras fundamentais da literatura africana de língua portuguesa." },
      { heading: "Prisão Colonial", body: "Foi preso pela PIDE entre 1965 e 1969 por causa do seu envolvimento na luta pela independência." },
      { heading: "Reconhecimento", body: "Em 1991 recebeu o Prémio Camões — o primeiro autor africano a conquistar o mais alto galardão da literatura em língua portuguesa." },
    ],
    fact: "José Craveirinha foi nomeado várias vezes para o Prémio Nobel da Literatura, sendo um dos grandes nomes africanos da poesia mundial.",
  },
];

function CultureHistoryPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Topic | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar
          </button>
          <h1 className="font-bold text-sm sm:text-base truncate">🇲🇿 Cultura e História</h1>
          <LanguageToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-96 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&h=900&fit=crop"
          alt="Moçambique"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
        <div className="relative h-full flex flex-col items-center justify-center text-center text-white px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl font-bold mb-3"
          >
            Descobre a Rica História de Moçambique
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl text-white/90 mb-5"
          >
            Heróis, ritmos e palavras que moldaram a identidade de um povo que olha o futuro sem esquecer o passado.
          </motion.p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge className="bg-white/15 backdrop-blur text-white border-white/30 px-3 py-1 text-xs">
              6 Tópicos Históricos
            </Badge>
            <Badge className="bg-white/15 backdrop-blur text-white border-white/30 px-3 py-1 text-xs">
              Património Cultural
            </Badge>
          </div>
        </div>
      </section>

      {/* Grid */}
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
                <img src={topic.image} alt={topic.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-t ${topic.gradient} opacity-80`} />
                <div className="absolute top-4 right-4 size-11 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                  <topic.icon className="size-5 text-foreground" />
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-2xl font-bold leading-tight">{topic.title}</h3>
                  <p className="text-sm text-white/90">{topic.subtitle}</p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground mb-2">{topic.date}</p>
                <p className="text-sm text-foreground/80 mb-4 line-clamp-3">{topic.short}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary group">
                  Saber Mais
                  <motion.span className="inline-block" whileHover={{ x: 4 }}>
                    <ArrowRight className="size-4" />
                  </motion.span>
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="relative h-80 shrink-0">
                <img src={selected.image} alt={selected.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-t ${selected.gradient} opacity-85`} />
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 size-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </motion.button>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <selected.icon className="size-6" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold leading-tight">{selected.title}</h2>
                      <p className="text-sm text-white/90">{selected.date}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                <div className="space-y-5">
                  {selected.sections.map((s, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className={`w-1 rounded-full bg-gradient-to-b ${selected.gradient} shrink-0`} />
                      <div>
                        <h4 className="font-bold mb-1">{s.heading}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`mt-6 rounded-2xl p-5 bg-gradient-to-br ${selected.gradient} text-white`}>
                  <div className="flex items-start gap-3">
                    <Heart className="size-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm mb-1">Sabia que...</p>
                      <p className="text-sm text-white/95">{selected.fact}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t p-4 flex items-center justify-between bg-muted/30 shrink-0">
                <p className="text-xs text-muted-foreground">Património Cultural de Moçambique</p>
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  Fechar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
