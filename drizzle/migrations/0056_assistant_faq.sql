-- Assistant phase 1 (no language model): the FAQ, its versions, anonymous unanswered questions and
-- feedback. Phase 2 (language model) is prepared and OFF; its daily quota counter lives here.
-- * assistant_faq_entries: public read of active entries; written only by admin_save_faq_entry().
-- * assistant_faq_versions: every save keeps the previous text (append-only).
-- * assistant_unanswered: the question text only (no user, no IP), kept 30 days (pg_cron).
-- * assistant_feedback: helpful yes/no per entry, anonymous, kept 30 days.
-- * assistant_llm_usage: Neurons used per day by the server (service role only), for the 9 000 cap.

CREATE TABLE public.assistant_faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  topic text NOT NULL CHECK (char_length(topic) BETWEEN 2 AND 40),
  kind text NOT NULL DEFAULT 'faq' CHECK (kind IN ('faq', 'support', 'refuse', 'live')),
  question_pt text NOT NULL CHECK (char_length(btrim(question_pt)) BETWEEN 3 AND 200),
  question_en text NOT NULL CHECK (char_length(btrim(question_en)) BETWEEN 3 AND 200),
  answer_pt text NOT NULL CHECK (char_length(btrim(answer_pt)) BETWEEN 3 AND 1200),
  answer_en text NOT NULL CHECK (char_length(btrim(answer_en)) BETWEEN 3 AND 1200),
  keywords_pt text[] NOT NULL DEFAULT '{}',
  keywords_en text[] NOT NULL DEFAULT '{}',
  links jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(links) = 'array'),
  needs_validation boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assistant_faq_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_faq_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.assistant_faq_entries TO anon, authenticated;
CREATE POLICY "Visitors read active FAQ entries" ON public.assistant_faq_entries
  FOR SELECT TO anon USING (active);
CREATE POLICY "Signed-in users read active FAQ entries; admins read all" ON public.assistant_faq_entries
  FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.assistant_faq_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.assistant_faq_entries (id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, version)
);
ALTER TABLE public.assistant_faq_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_faq_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.assistant_faq_versions TO authenticated;
CREATE POLICY "Admins read FAQ versions" ON public.assistant_faq_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER assistant_faq_versions_append_only BEFORE UPDATE OR DELETE ON public.assistant_faq_versions
  FOR EACH ROW EXECUTE FUNCTION public.append_only();

-- Create (null _id) or update an entry; the previous text goes to assistant_faq_versions.
CREATE OR REPLACE FUNCTION public.admin_save_faq_entry(_id uuid, _entry jsonb, _reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cur public.assistant_faq_entries; new_id uuid;
  kpt text[] := ARRAY(SELECT jsonb_array_elements_text(coalesce(_entry -> 'keywords_pt', '[]')));
  ken text[] := ARRAY(SELECT jsonb_array_elements_text(coalesce(_entry -> 'keywords_en', '[]')));
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.assistant_faq_entries (slug, topic, kind, question_pt, question_en, answer_pt, answer_en,
      keywords_pt, keywords_en, links, needs_validation, active, updated_by)
    VALUES (_entry ->> 'slug', _entry ->> 'topic', coalesce(_entry ->> 'kind', 'faq'), btrim(_entry ->> 'question_pt'),
      btrim(_entry ->> 'question_en'), btrim(_entry ->> 'answer_pt'), btrim(_entry ->> 'answer_en'), kpt, ken,
      coalesce(_entry -> 'links', '[]'), coalesce((_entry ->> 'needs_validation')::boolean, false),
      coalesce((_entry ->> 'active')::boolean, true), auth.uid())
    RETURNING id INTO new_id;
  ELSE
    SELECT * INTO cur FROM public.assistant_faq_entries WHERE id = _id FOR UPDATE;
    IF cur.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
    INSERT INTO public.assistant_faq_versions (entry_id, version, snapshot, reason, created_by)
    VALUES (cur.id, cur.version, to_jsonb(cur), left(btrim(_reason), 500), auth.uid());
    UPDATE public.assistant_faq_entries SET
      topic = coalesce(_entry ->> 'topic', topic), kind = coalesce(_entry ->> 'kind', kind),
      question_pt = coalesce(btrim(_entry ->> 'question_pt'), question_pt),
      question_en = coalesce(btrim(_entry ->> 'question_en'), question_en),
      answer_pt = coalesce(btrim(_entry ->> 'answer_pt'), answer_pt),
      answer_en = coalesce(btrim(_entry ->> 'answer_en'), answer_en),
      keywords_pt = CASE WHEN _entry ? 'keywords_pt' THEN kpt ELSE keywords_pt END,
      keywords_en = CASE WHEN _entry ? 'keywords_en' THEN ken ELSE keywords_en END,
      links = coalesce(_entry -> 'links', links),
      needs_validation = coalesce((_entry ->> 'needs_validation')::boolean, needs_validation),
      active = coalesce((_entry ->> 'active')::boolean, active),
      version = version + 1, updated_by = auth.uid(), updated_at = now()
     WHERE id = _id RETURNING id INTO new_id;
  END IF;
  INSERT INTO public.admin_audit (actor_id, action, entity, entity_id, after, reason)
  SELECT auth.uid(), 'faq.save', 'assistant_faq_entries', new_id::text, to_jsonb(e), left(btrim(_reason), 1000)
    FROM public.assistant_faq_entries e WHERE e.id = new_id;
  RETURN new_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_save_faq_entry(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_faq_entry(uuid, jsonb, text) TO authenticated;

CREATE TABLE public.assistant_unanswered (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL CHECK (char_length(question) BETWEEN 2 AND 300),
  lang text NOT NULL CHECK (lang IN ('pt', 'en')),
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assistant_unanswered_created_idx ON public.assistant_unanswered (created_at DESC);
ALTER TABLE public.assistant_unanswered ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_unanswered FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.assistant_unanswered TO authenticated;
CREATE POLICY "Admins read unanswered questions" ON public.assistant_unanswered
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.assistant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_slug text NOT NULL CHECK (char_length(entry_slug) BETWEEN 1 AND 60),
  helpful boolean NOT NULL,
  lang text NOT NULL CHECK (lang IN ('pt', 'en')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assistant_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.assistant_feedback TO authenticated;
CREATE POLICY "Admins read assistant feedback" ON public.assistant_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Anonymous logging with a global daily ceiling (no user id, no IP stored).
CREATE OR REPLACE FUNCTION public.assistant_log_unanswered(_question text, _lang text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q text := left(regexp_replace(btrim(coalesce(_question, '')), '\s+', ' ', 'g'), 300);
BEGIN
  IF char_length(q) < 2 THEN RETURN; END IF;
  -- Emails and long digit runs (phones, references) are masked before storing.
  q := regexp_replace(q, '[[:alnum:]._%+-]+@[[:alnum:].-]+', '[email]', 'g');
  q := regexp_replace(q, '[0-9][0-9 ]{6,}[0-9]', '[número]', 'g');
  IF (SELECT count(*) FROM public.assistant_unanswered WHERE created_at > now() - interval '1 day') >= 500 THEN RETURN; END IF;
  INSERT INTO public.assistant_unanswered (question, lang) VALUES (q, CASE WHEN _lang = 'en' THEN 'en' ELSE 'pt' END);
END;
$function$;
REVOKE ALL ON FUNCTION public.assistant_log_unanswered(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assistant_log_unanswered(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.assistant_rate_answer(_slug text, _helpful boolean, _lang text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.assistant_faq_entries WHERE slug = _slug) OR _helpful IS NULL THEN RETURN; END IF;
  IF (SELECT count(*) FROM public.assistant_feedback WHERE created_at > now() - interval '1 day') >= 2000 THEN RETURN; END IF;
  INSERT INTO public.assistant_feedback (entry_slug, helpful, lang) VALUES (_slug, _helpful, CASE WHEN _lang = 'en' THEN 'en' ELSE 'pt' END);
END;
$function$;
REVOKE ALL ON FUNCTION public.assistant_rate_answer(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assistant_rate_answer(text, boolean, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_unanswered(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE public.assistant_unanswered SET handled = true WHERE id = _id;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_mark_unanswered(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_unanswered(uuid) TO authenticated;

-- Phase 2 (OFF): Neurons used per day, written only by the server with the service role.
CREATE TABLE public.assistant_llm_usage (
  day date PRIMARY KEY,
  neurons int NOT NULL DEFAULT 0 CHECK (neurons >= 0),
  calls int NOT NULL DEFAULT 0 CHECK (calls >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assistant_llm_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_llm_usage FROM PUBLIC, anon, authenticated;

-- 30-day retention, daily at 03:10 Mozambique time.
CREATE OR REPLACE FUNCTION public.assistant_purge_old()
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE a int; b int;
BEGIN
  DELETE FROM public.assistant_unanswered WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS a = ROW_COUNT;
  DELETE FROM public.assistant_feedback WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS b = ROW_COUNT;
  RETURN a + b;
END;
$function$;
REVOKE ALL ON FUNCTION public.assistant_purge_old() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.schedule('ekaya-assistant-purge', '10 1 * * *', 'SELECT public.assistant_purge_old()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (%): schedule public.assistant_purge_old() elsewhere', SQLERRM;
END $$;

-- Initial FAQ (docs/ia/faq-v1.json, generated by scripts/qa/faq-sql.ts).
INSERT INTO public.assistant_faq_entries (slug, topic, kind, question_pt, question_en, answer_pt, answer_en,
  keywords_pt, keywords_en, links, needs_validation)
VALUES
  ('conta-foto-perfil', 'account', 'faq', 'Como mudo a foto de perfil, o nome ou o telefone?', 'How do I change my profile photo, name or phone?', 'Em Definições → Perfil podes mudar a foto, o nome e o telefone.', 'In Settings → Profile you can change your photo, name and phone.',
   ARRAY['foto', 'perfil', 'avatar', 'nome', 'telefone', 'imagem']::text[],
   ARRAY['photo', 'profile', 'avatar', 'name', 'phone', 'picture']::text[],
   '[{"path":"/settings","pt":"Definições","en":"Settings"}]'::jsonb, false),
  ('conta-email-palavra-passe', 'account', 'faq', 'Como mudo o email ou a palavra-passe?', 'How do I change my email or password?', 'Em Definições → Conta. Se te esqueceste da palavra-passe, usa "Esqueci-me da palavra-passe" na página de entrada.', 'In Settings → Account. If you forgot your password, use "Forgot password" on the sign-in page.',
   ARRAY['email', 'palavra-passe', 'password', 'senha', 'esqueci', 'entrar', 'login']::text[],
   ARRAY['email', 'password', 'forgot', 'reset', 'sign', 'login']::text[],
   '[{"path":"/settings","pt":"Definições","en":"Settings"},{"path":"/forgot-password","pt":"Recuperar a palavra-passe","en":"Reset password"}]'::jsonb, false),
  ('conta-sem-conta', 'account', 'faq', 'Posso usar a aplicação sem criar conta?', 'Can I use the app without an account?', 'Sim: sem conta podes ver destinos, experiências, roteiros, o mapa e a comunidade. Para reservar, guardar favoritos, publicar e jogar precisas de conta.', 'Yes: without an account you can browse destinations, experiences, itineraries, the map and the community. Booking, favourites, posting and games need an account.',
   ARRAY['sem conta', 'conta', 'registar', 'criar conta', 'convidado', 'obrigatorio']::text[],
   ARRAY['without account', 'account', 'sign up', 'register', 'guest', 'required']::text[],
   '[{"path":"/signup","pt":"Criar conta","en":"Sign up"}]'::jsonb, false),
  ('conta-exportar-dados', 'privacy', 'faq', 'Posso exportar os meus dados?', 'Can I export my data?', 'Sim. Em Definições → Privacidade → Exportar os meus dados recebes um ficheiro JSON.', 'Yes. In Settings → Privacy → Export my data you get a JSON file.',
   ARRAY['exportar', 'dados', 'copia', 'descarregar', 'json']::text[],
   ARRAY['export', 'data', 'copy', 'download', 'json']::text[],
   '[{"path":"/settings","pt":"Definições","en":"Settings"}]'::jsonb, false),
  ('conta-apagar', 'privacy', 'faq', 'Como apago a minha conta?', 'How do I delete my account?', 'Em Definições → Privacidade → Apagar a minha conta. É pedida uma confirmação. Eu não consigo apagar a conta por ti.', 'In Settings → Privacy → Delete my account. A confirmation is required. I cannot delete the account for you.',
   ARRAY['apagar', 'eliminar', 'conta', 'remover', 'sair', 'fechar conta']::text[],
   ARRAY['delete', 'remove', 'account', 'close account', 'erase']::text[],
   '[{"path":"/settings","pt":"Definições","en":"Settings"}]'::jsonb, false),
  ('idioma-tema', 'settings', 'faq', 'Como mudo o idioma ou o tema?', 'How do I change the language or the theme?', 'Usa o botão de idioma (PT/EN) e o de tema no topo das páginas, ou Definições → Aparência.', 'Use the language (PT/EN) and theme buttons at the top of the pages, or Settings → Appearance.',
   ARRAY['idioma', 'lingua', 'ingles', 'portugues', 'tema', 'escuro', 'claro', 'aparencia']::text[],
   ARRAY['language', 'english', 'portuguese', 'theme', 'dark', 'light', 'appearance']::text[],
   '[{"path":"/settings","pt":"Definições","en":"Settings"}]'::jsonb, false),
  ('notificacoes', 'settings', 'faq', 'Como escolho as notificações que recebo?', 'How do I choose which notifications I get?', 'Em Definições → Notificações na app escolhes os tipos de aviso. As notificações aparecem no sino no topo.', 'In Settings → In-app notifications you choose the kinds of notice. Notifications appear under the bell at the top.',
   ARRAY['notificacoes', 'avisos', 'alertas', 'sino']::text[],
   ARRAY['notifications', 'alerts', 'notices', 'bell']::text[],
   '[{"path":"/settings","pt":"Definições","en":"Settings"}]'::jsonb, false),
  ('preferencias-viagem', 'settings', 'faq', 'Para que servem as preferências de viagem?', 'What are travel preferences for?', 'As províncias e interesses que escolhes servem para filtrar e recomendar experiências. Mudas em Definições → Preferências de viagem.', 'The provinces and interests you choose are used to filter and recommend experiences. Change them in Settings → Travel preferences.',
   ARRAY['preferencias', 'interesses', 'recomendacoes', 'provincias favoritas']::text[],
   ARRAY['preferences', 'interests', 'recommendations']::text[],
   '[{"path":"/settings","pt":"Definições","en":"Settings"}]'::jsonb, false),
  ('seguranca-2fa', 'security', 'faq', 'Como ativo a verificação em dois passos?', 'How do I turn on two-step verification?', 'Em Definições → Segurança, com uma aplicação de autenticação (código de 6 dígitos). Para administradores é obrigatória.', 'In Settings → Security, with an authenticator app (6-digit code). It is mandatory for administrators.',
   ARRAY['dois passos', '2fa', 'autenticacao', 'codigo', 'seguranca', 'totp']::text[],
   ARRAY['two-step', '2fa', 'two factor', 'authenticator', 'code', 'security', 'totp']::text[],
   '[{"path":"/settings","pt":"Definições","en":"Settings"}]'::jsonb, false),
  ('reservas-como', 'bookings', 'faq', 'Como faço uma reserva?', 'How do I make a booking?', 'Abre a experiência, escolhe a data e o horário e envia o pedido. O pedido fica pendente até o negócio confirmar ou recusar. Eu não consigo reservar por ti.', 'Open the experience, pick the date and time and send the request. It stays pending until the business confirms or declines. I cannot book for you.',
   ARRAY['reservar', 'reserva', 'marcar', 'pedido', 'agendar', 'reserva-me']::text[],
   ARRAY['book', 'booking', 'reserve', 'request', 'schedule']::text[],
   '[{"path":"/experiences","pt":"Experiências","en":"Experiences"},{"path":"/bookings","pt":"As minhas reservas","en":"My bookings"}]'::jsonb, false),
  ('reservas-estado', 'bookings', 'faq', 'Onde vejo o estado das minhas reservas?', 'Where do I see the status of my bookings?', 'Em As minhas reservas. Quando o negócio confirma ou recusa, recebes uma notificação. Eu não consigo confirmar reservas.', 'In My bookings. When the business confirms or declines, you get a notification. I cannot confirm bookings.',
   ARRAY['estado', 'confirmada', 'confirmar', 'pendente', 'minhas reservas', 'ek-']::text[],
   ARRAY['status', 'confirmed', 'confirm', 'pending', 'my bookings']::text[],
   '[{"path":"/bookings","pt":"As minhas reservas","en":"My bookings"}]'::jsonb, false),
  ('reservas-cancelar', 'cancellation', 'faq', 'Como cancelo uma reserva? Qual é a política de cancelamento?', 'How do I cancel a booking? What is the cancellation policy?', 'Em As minhas reservas podes cancelar um pedido enquanto está pendente. Depois de confirmado, fala com o negócio. Um pedido sem resposta expira na hora de início. [VALIDAR]', 'In My bookings you can cancel a request while it is pending. Once confirmed, talk to the business. A request with no answer expires at the start time. [VALIDAR]',
   ARRAY['cancelar', 'cancelamento', 'desmarcar', 'politica', 'anular']::text[],
   ARRAY['cancel', 'cancellation', 'policy', 'call off']::text[],
   '[{"path":"/bookings","pt":"As minhas reservas","en":"My bookings"}]'::jsonb, true),
  ('reservas-pagamento', 'bookings', 'faq', 'Como pago? Posso pagar com M-Pesa?', 'How do I pay? Can I pay with M-Pesa?', 'Hoje o pagamento das reservas não é feito na aplicação: combina-se diretamente com o negócio.', 'Today booking payment is not made in the app: it is arranged directly with the business.',
   ARRAY['pagar', 'pagamento', 'm-pesa', 'mpesa', 'cartao', 'dinheiro', 'emola']::text[],
   ARRAY['pay', 'payment', 'm-pesa', 'mpesa', 'card', 'cash']::text[],
   '[{"path":"/bookings","pt":"As minhas reservas","en":"My bookings"}]'::jsonb, false),
  ('reservas-reembolso', 'bookings', 'support', 'Quero um reembolso.', 'I want a refund.', 'Como o pagamento é combinado com o negócio, o reembolso trata-se com ele. Se precisares de ajuda, escreve à equipa do EKAYA: {SUPPORT}. Eu não consigo fazer reembolsos.', 'As payment is arranged with the business, refunds are handled with it. If you need help, write to the EKAYA team: {SUPPORT}. I cannot make refunds.',
   ARRAY['reembolso', 'devolver', 'dinheiro de volta', 'devolucao', 'um reembolso', 'reembolsar']::text[],
   ARRAY['refund', 'money back', 'return', 'a refund', 'refunded']::text[],
   '[{"path":"/bookings","pt":"As minhas reservas","en":"My bookings"}]'::jsonb, false),
  ('precos-disponibilidade', 'bookings', 'live', 'Quanto custa e há disponibilidade?', 'How much is it and is it available?', 'Os preços e horários estão na página de cada experiência e podem mudar. Diz-me o nome da experiência e eu consulto os dados em vigor.', 'Prices and schedules are on each experience page and may change. Tell me the experience name and I will check the current data.',
   ARRAY['preco', 'custa', 'quanto', 'disponibilidade', 'horario', 'vagas', 'lugares', 'abre', 'ainda', 'facebook', 'e verdade', 'vi no', 'mudou', 'mesmo preco']::text[],
   ARRAY['price', 'cost', 'how much', 'availability', 'available', 'schedule', 'slot', 'open', 'still', 'facebook', 'is that right', 'saw on', 'changed', 'same price', 'costs']::text[],
   '[{"path":"/experiences","pt":"Experiências","en":"Experiences"}]'::jsonb, false),
  ('favoritos', 'favourites', 'faq', 'Como guardo favoritos?', 'How do I save favourites?', 'Toca no coração de um destino, experiência ou roteiro. Vês tudo em Favoritos. Precisas de conta.', 'Tap the heart on a destination, experience or itinerary. You see them all in Favourites. You need an account.',
   ARRAY['favoritos', 'guardar', 'coracao', 'gostar', 'lista']::text[],
   ARRAY['favourites', 'favorites', 'save', 'heart', 'wishlist']::text[],
   '[{"path":"/favorites","pt":"Favoritos","en":"Favourites"}]'::jsonb, false),
  ('roteiros', 'itineraries', 'faq', 'Como funcionam os roteiros?', 'How do itineraries work?', 'Em Roteiros vês planos de vários dias com paragens. Podes guardar um roteiro e marcar o progresso das paragens.', 'In Itineraries you see multi-day plans with stops. You can save an itinerary and track progress on its stops.',
   ARRAY['roteiro', 'roteiros', 'itinerario', 'plano', 'dias', 'paragens', 'viagem']::text[],
   ARRAY['itinerary', 'itineraries', 'route', 'plan', 'days', 'stops', 'trip']::text[],
   '[{"path":"/itineraries","pt":"Roteiros","en":"Itineraries"}]'::jsonb, false),
  ('roteiros-progresso', 'itineraries', 'faq', 'Como provo que visitei uma paragem do roteiro?', 'How do I prove I visited an itinerary stop?', 'Na paragem do roteiro podes enviar uma fotografia como prova; a equipa revê-a antes de contar. [VALIDAR]', 'At the itinerary stop you can send a photo as proof; the team reviews it before it counts. [VALIDAR]',
   ARRAY['prova', 'paragem', 'progresso', 'visitei', 'check-in']::text[],
   ARRAY['proof', 'stop', 'progress', 'visited', 'check-in']::text[],
   '[{"path":"/itineraries","pt":"Roteiros","en":"Itineraries"}]'::jsonb, true),
  ('pontos', 'points', 'faq', 'Como funcionam os pontos?', 'How do points work?', 'Ganhas pontos ao concluir reservas, roteiros e jogos. Trocam-se pelas recompensas publicadas na página de pontos. Não têm valor em dinheiro nem dão viagens.', 'You earn points by completing bookings, itineraries and games. They are exchanged for the rewards published on the points page. They have no cash value and do not give trips.',
   ARRAY['pontos', 'recompensas', 'premios', 'xp', 'trocar', 'voos', 'gratis']::text[],
   ARRAY['points', 'rewards', 'prizes', 'xp', 'redeem', 'flights', 'free']::text[],
   '[{"path":"/gamification","pt":"Pontos e recompensas","en":"Points and rewards"}]'::jsonb, false),
  ('jogos', 'games', 'faq', 'Que jogos há?', 'What games are there?', 'Em Jogos há quizzes e desafios sobre Moçambique. Ao concluí-los ganhas pontos. Precisas de conta.', 'In Games there are quizzes and challenges about Mozambique. Completing them earns points. You need an account.',
   ARRAY['jogos', 'jogo', 'quiz', 'desafio', 'caca ao tesouro', 'jogar']::text[],
   ARRAY['games', 'game', 'quiz', 'challenge', 'treasure hunt', 'play']::text[],
   '[{"path":"/games","pt":"Jogos","en":"Games"}]'::jsonb, false),
  ('comunidade-publicar', 'community', 'faq', 'Como publico na comunidade?', 'How do I post in the community?', 'Na Comunidade, com sessão iniciada, escreves uma publicação e podes juntar fotografias. Os outros podem reagir.', 'In the Community, signed in, you write a post and can add photos. Others can react.',
   ARRAY['comunidade', 'publicar', 'publicacao', 'post', 'partilhar', 'fotos']::text[],
   ARRAY['community', 'post', 'share', 'publish', 'photos']::text[],
   '[{"path":"/community","pt":"Comunidade","en":"Community"}]'::jsonb, false),
  ('comunidade-denunciar', 'community', 'faq', 'Como denuncio uma publicação?', 'How do I report a post?', 'Na publicação, usa a opção Denunciar e escolhe o motivo. A equipa revê a denúncia.', 'On the post, use Report and choose the reason. The team reviews the report.',
   ARRAY['denunciar', 'denuncia', 'abuso', 'spam', 'ofensivo', 'reportar']::text[],
   ARRAY['report', 'abuse', 'spam', 'offensive', 'flag']::text[],
   '[{"path":"/community","pt":"Comunidade","en":"Community"}]'::jsonb, false),
  ('mapa', 'map', 'faq', 'O que é o mapa do EKAYA?', 'What is the EKAYA map?', 'O mapa mostra destinos e negócios aprovados. A tua localização só é usada se a permitires no dispositivo.', 'The map shows destinations and approved businesses. Your location is only used if you allow it on your device.',
   ARRAY['mapa', 'localizacao', 'onde fica', 'gps', 'funciona o mapa']::text[],
   ARRAY['map', 'location', 'where is', 'gps', 'map thing']::text[],
   '[{"path":"/map","pt":"Mapa","en":"Map"}]'::jsonb, false),
  ('explorar-provincia', 'content', 'faq', 'O que posso ver numa província?', 'What can I see in a province?', 'Em Experiências e no Mapa filtras por província; os Roteiros mostram planos por região. Só aparece o que está publicado no EKAYA.', 'In Experiences and on the Map you filter by province; Itineraries show plans by region. Only what is published on EKAYA appears.',
   ARRAY['provincia', 'ver', 'visitar', 'inhambane', 'maputo', 'gaza', 'sofala', 'nampula', 'tete', 'niassa', 'zambezia', 'manica', 'cabo delgado', 'destinos', 'negocios', 'ilha', 'historia', 'tofo', 'bazaruto', 'vilankulo', 'gorongosa']::text[],
   ARRAY['province', 'see', 'visit', 'inhambane', 'maputo', 'gaza', 'sofala', 'nampula', 'tete', 'niassa', 'zambezia', 'manica', 'cabo delgado', 'destinations', 'businesses', 'island', 'history', 'tofo', 'bazaruto', 'vilankulo', 'gorongosa']::text[],
   '[{"path":"/experiences","pt":"Experiências","en":"Experiences"},{"path":"/map","pt":"Mapa","en":"Map"},{"path":"/itineraries","pt":"Roteiros","en":"Itineraries"}]'::jsonb, false),
  ('detalhes-negocio', 'content', 'faq', 'Qual é o telefone, o wifi ou outro detalhe de um negócio?', 'What is a business phone, wifi or other detail?', 'Não tenho essa informação no EKAYA. Os contactos e serviços de cada negócio aparecem na página do negócio, se o negócio os publicou; confirma diretamente com ele.', 'I do not have that information in EKAYA. Each business contact details and services are on its page, if the business published them; check directly with it.',
   ARRAY['wifi', 'telefone do', 'numero do', 'contacto do', 'guia', 'alojamento', 'internet', 'estacionamento']::text[],
   ARRAY['wifi', 'phone number of', 'number of the', 'contact of', 'guide', 'lodging', 'internet', 'parking']::text[],
   '[{"path":"/businesses","pt":"Negócios","en":"Businesses"}]'::jsonb, false),
  ('informacao-util', 'content', 'faq', 'Onde encontro informação útil para a viagem (vistos, emergência)?', 'Where do I find useful travel information (visas, emergencies)?', 'Na página Informação útil. Para vistos e regras de entrada, confirma sempre nas fontes oficiais. [VALIDAR]', 'On the Useful information page. For visas and entry rules, always check official sources. [VALIDAR]',
   ARRAY['visto', 'emergencia', 'policia', 'saude', 'informacao util', 'entrada', 'fronteira', 'seguranca']::text[],
   ARRAY['visa', 'emergency', 'police', 'health', 'useful information', 'entry', 'border', 'safety']::text[],
   '[{"path":"/useful-info","pt":"Informação útil","en":"Useful information"}]'::jsonb, true),
  ('app-lojas', 'account', 'faq', 'Há aplicação para iPhone ou Android?', 'Is there an iPhone or Android app?', 'Não tenho informação sobre uma aplicação nas lojas: o EKAYA funciona no navegador do telemóvel ou do computador.', 'I do not have information about a store app: EKAYA works in the browser on your phone or computer.',
   ARRAY['iphone', 'android', 'app store', 'play store', 'descarregar', 'instalar', 'aplicacao']::text[],
   ARRAY['iphone', 'android', 'app store', 'play store', 'download', 'install', 'app']::text[],
   '[{"path":"/home","pt":"Início","en":"Home"}]'::jsonb, false),
  ('legal', 'privacy', 'faq', 'Onde estão os Termos e a Política de Privacidade?', 'Where are the Terms and the Privacy Policy?', 'Nos links Termos e Privacidade no rodapé. Ainda são rascunhos sujeitos a revisão jurídica.', 'In the Terms and Privacy links in the footer. They are still drafts subject to legal review.',
   ARRAY['termos', 'privacidade', 'politica', 'dados pessoais', 'legal', 'rgpd']::text[],
   ARRAY['terms', 'privacy', 'policy', 'personal data', 'legal', 'gdpr']::text[],
   '[{"path":"/terms","pt":"Termos","en":"Terms"},{"path":"/privacy","pt":"Privacidade","en":"Privacy"}]'::jsonb, false),
  ('negocio-registar', 'business', 'faq', 'Como registo o meu negócio?', 'How do I register my business?', 'Na página Para negócios deixas um pedido, ou, com conta, em Registar negócio. O negócio só aparece depois de aprovado pela administração.', 'On the For businesses page you leave a request or, with an account, use Register business. The business only appears after the administration approves it.',
   ARRAY['negocio', 'registar negocio', 'aderir', 'parceiro', 'loja', 'restaurante', 'hotel', 'meu negocio']::text[],
   ARRAY['business', 'register business', 'join', 'partner', 'shop', 'restaurant', 'hotel', 'my business']::text[],
   '[{"path":"/para-negocios","pt":"Para negócios","en":"For businesses"},{"path":"/business-register","pt":"Registar negócio","en":"Register business"}]'::jsonb, false),
  ('negocio-atividade', 'business', 'faq', 'O que preciso para publicar uma atividade?', 'What do I need to publish an activity?', 'Preço (pode ser grátis), capacidade, pelo menos um horário, local, uma fotografia, título em inglês, descrição em português e em inglês e um contacto do negócio. O painel do negócio mostra o que falta.', 'Price (it can be free), capacity, at least one schedule, location, a photo, an English title, a description in Portuguese and English and a business contact. The business dashboard shows what is missing.',
   ARRAY['publicar atividade', 'atividade', 'painel', 'falta', 'pronto']::text[],
   ARRAY['publish activity', 'activity', 'dashboard', 'missing', 'ready']::text[],
   '[{"path":"/para-negocios","pt":"Para negócios","en":"For businesses"}]'::jsonb, false),
  ('negocio-reservas', 'business', 'faq', 'Como respondo aos pedidos de reserva do meu negócio?', 'How do I answer booking requests for my business?', 'No painel do negócio confirmas ou recusas cada pedido. O turista é notificado.', 'In the business dashboard you confirm or decline each request. The visitor is notified.',
   ARRAY['painel do negocio', 'pedidos de reserva', 'recusar', 'aceitar']::text[],
   ARRAY['business dashboard', 'booking requests', 'decline', 'accept']::text[],
   '[{"path":"/para-negocios","pt":"Para negócios","en":"For businesses"}]'::jsonb, false),
  ('negocio-comissao', 'commission', 'faq', 'Quanto custa para um negócio? Qual é a comissão?', 'How much does it cost a business? What is the commission?', 'O perfil é grátis. A comissão em vigor e o total descontado estão na página Para negócios e no painel do negócio; só se aplica a reservas pagas no EKAYA, que hoje ainda não existem.', 'The profile is free. The commission in force and the total deducted are on the For businesses page and in the business dashboard; it only applies to bookings paid on EKAYA, which do not exist yet.',
   ARRAY['comissao', 'taxa', 'custo', 'percentagem', 'fundador']::text[],
   ARRAY['commission', 'fee', 'cost', 'percentage', 'founder']::text[],
   '[{"path":"/para-negocios","pt":"Para negócios","en":"For businesses"}]'::jsonb, false),
  ('negocio-destaques', 'highlights', 'faq', 'O que são os destaques Patrocinado?', 'What are Sponsored highlights?', 'Um negócio pode pagar um destaque por uma semana ou um mês. Aparece com a etiqueta Patrocinado e não muda a ordem dos outros resultados. Pede-se no painel do negócio e paga-se por M-Pesa.', 'A business can pay for a highlight for one week or one month. It shows with the Sponsored label and does not change the order of other results. It is requested in the business dashboard and paid by M-Pesa.',
   ARRAY['destaque', 'patrocinado', 'publicidade', 'anuncio', 'campanha']::text[],
   ARRAY['highlight', 'sponsored', 'advert', 'ad', 'campaign']::text[],
   '[{"path":"/para-negocios","pt":"Para negócios","en":"For businesses"}]'::jsonb, false),
  ('apoio-contacto', 'contact', 'support', 'Como falo com a equipa do EKAYA?', 'How do I talk to the EKAYA team?', 'Escreve para o email de apoio: {SUPPORT}. É o único canal publicado (não há WhatsApp nem telefone).', 'Write to the support email: {SUPPORT}. It is the only published channel (no WhatsApp or phone).',
   ARRAY['contacto', 'equipa', 'pessoa', 'apoio', 'ajuda', 'whatsapp', 'telefone', 'falar', 'suporte']::text[],
   ARRAY['contact', 'team', 'person', 'support', 'help', 'whatsapp', 'phone', 'talk', 'human']::text[],
   '[]'::jsonb, false),
  ('recusa-dados-outros', 'refuse', 'refuse', 'Pedidos de dados de outras pessoas', 'Requests for other people''s data', 'Não posso mostrar dados de outras pessoas (reservas, emails ou contas). Cada pessoa vê só os seus dados na aplicação.', 'I cannot show other people''s data (bookings, emails or accounts). Each person only sees their own data in the app.',
   ARRAY['reservas do', 'email do dono', 'quem reservou', 'lista de utilizadores', 'sou admin', 'dados de']::text[],
   ARRAY['bookings of', '''s bookings', 'email of the owner', 'who booked', 'user list', 'i''m an admin', 'data of']::text[],
   '[]'::jsonb, false),
  ('recusa-sistema', 'refuse', 'refuse', 'Pedidos sobre instruções internas ou chaves', 'Requests for internal instructions or keys', 'Não posso partilhar instruções internas nem chaves. Posso ajudar com dúvidas sobre o EKAYA.', 'I cannot share internal instructions or keys. I can help with questions about EKAYA.',
   ARRAY['prompt', 'instrucoes', 'ignora', 'chave da api', 'api']::text[],
   ARRAY['prompt', 'instructions', 'ignore', 'api key']::text[],
   '[]'::jsonb, false),
  ('recusa-fora-ambito', 'refuse', 'refuse', 'Pedidos fora do âmbito do EKAYA', 'Requests outside EKAYA', 'Só posso ajudar com o EKAYA e viagens em Moçambique.', 'I can only help with EKAYA and travel in Mozambique.',
   ARRAY['trabalho de casa', 'fotossintese', 'criptomoeda', 'investir', 'bitcoin', 'raca', 'changana', 'so em']::text[],
   ARRAY['homework', 'photosynthesis', 'crypto', 'invest', 'bitcoin', 'race', 'swahili', 'only in']::text[],
   '[]'::jsonb, false),
  ('ofensivo', 'contact', 'support', 'Mensagens de insatisfação', 'Complaints', 'Lamento que a experiência não esteja a correr bem. Diz-me o que aconteceu ou escreve à equipa: {SUPPORT}.', 'I am sorry things are not going well. Tell me what happened or write to the team: {SUPPORT}.',
   ARRAY['porcaria', 'idiotas', 'lixo', 'pessimo', 'horrivel', 'reclamacao']::text[],
   ARRAY['useless', 'idiots', 'rubbish', 'terrible', 'awful', 'complaint']::text[],
   '[]'::jsonb, false),
  ('assistente-o-que-faz', 'contact', 'faq', 'O que o assistente consegue fazer?', 'What can the assistant do?', 'Respondo a dúvidas sobre o EKAYA a partir desta lista de perguntas e consulto preços e horários publicados. Não faço reservas, pagamentos nem alterações à conta.', 'I answer questions about EKAYA from this list of questions and check published prices and schedules. I do not make bookings, payments or account changes.',
   ARRAY['assistente', 'o que fazes', 'ajudar', 'ajuda-me', 'podes ajudar']::text[],
   ARRAY['assistant', 'what can you do', 'help me', 'can you help']::text[],
   '[]'::jsonb, false);
