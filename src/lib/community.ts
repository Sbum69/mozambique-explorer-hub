import { supabase } from "@/integrations/supabase/client";

/* ---------------- Types ---------------- */

export type PostStatus = "pending" | "published" | "rejected" | "hidden";
export type ReactionValue = "like" | "dislike";
export type ReportReason = "spam" | "inappropriate" | "misleading" | "offensive" | "other";
export type ReportStatus = "pending" | "reviewed" | "dismissed" | "action_taken";
export type CommunitySort = "recent" | "popular";

export interface CommunityCategory {
  id: string;
  slug: string;
  name: { pt: string; en: string };
  sortOrder: number;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  title: string;
  content: string;
  imageUrl: string | null;
  categoryId: string;
  categorySlug: string | null;
  categoryName: { pt: string; en: string } | null;
  provinceId: string | null;
  provinceName: { pt: string; en: string } | null;
  destinationId: string | null;
  destinationName: string | null;
  experienceId: string | null;
  experienceTitle: string | null;
  routeId: string | null;
  routeTitle: string | null;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  likes: number;
  dislikes: number;
  myReaction: ReactionValue | null;
}

export interface CommunityReport {
  id: string;
  postId: string;
  postTitle: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PostInput {
  title: string;
  content: string;
  categoryId: string;
  provinceId: string | null;
  destinationId?: string | null;
  experienceId?: string | null;
  routeId?: string | null;
}

const POST_SELECT = `
  id, author_id, title, content, image_url, category_id, province_id,
  destination_id, experience_id, route_id, status, created_at, updated_at,
  community_categories ( slug, name_pt, name_en ),
  provinces ( name_pt, name_en ),
  destinations ( name ),
  experiences ( title_pt ),
  routes ( title )
`;

/* ---------------- Categories ---------------- */

export async function fetchCommunityCategories(): Promise<CommunityCategory[]> {
  const { data, error } = await supabase
    .from("community_categories")
    .select("id, slug, name_pt, name_en, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: { pt: row.name_pt, en: row.name_en },
    sortOrder: row.sort_order,
  }));
}

/* ---------------- Reading posts ---------------- */

interface RawPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  image_url: string | null;
  category_id: string;
  province_id: string | null;
  destination_id: string | null;
  experience_id: string | null;
  route_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  community_categories?: { slug: string; name_pt: string; name_en: string } | null;
  provinces?: { name_pt: string; name_en: string } | null;
  destinations?: { name: string } | null;
  experiences?: { title_pt: string } | null;
  routes?: { title: string } | null;
}

/** Fetches public author identity (display name/avatar only) for the given ids. */
async function fetchAuthors(
  ids: string[],
): Promise<Map<string, { name: string; avatar: string | null }>> {
  const map = new Map<string, { name: string; avatar: string | null }>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("community_post_authors")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  for (const row of data ?? []) {
    if (!row.id) continue;
    map.set(row.id, { name: row.display_name ?? "Ekaya", avatar: row.avatar_url ?? null });
  }
  return map;
}

async function fetchReactionData(postIds: string[], userId: string | null) {
  const counts = new Map<string, { likes: number; dislikes: number }>();
  const mine = new Map<string, ReactionValue>();
  if (postIds.length === 0) return { counts, mine };
  const { data, error } = await supabase
    .from("community_post_reactions")
    .select("post_id, user_id, reaction")
    .in("post_id", postIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const bucket = counts.get(row.post_id) ?? { likes: 0, dislikes: 0 };
    if (row.reaction === "like") bucket.likes += 1;
    else bucket.dislikes += 1;
    counts.set(row.post_id, bucket);
    if (userId && row.user_id === userId) mine.set(row.post_id, row.reaction as ReactionValue);
  }
  return { counts, mine };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function decorate(rows: RawPost[]): Promise<CommunityPost[]> {
  const userId = await currentUserId();
  const [authors, reactions] = await Promise.all([
    fetchAuthors([...new Set(rows.map((r) => r.author_id))]),
    fetchReactionData(
      rows.map((r) => r.id),
      userId,
    ),
  ]);

  return rows.map((row) => {
    const author = authors.get(row.author_id);
    const counts = reactions.counts.get(row.id) ?? { likes: 0, dislikes: 0 };
    return {
      id: row.id,
      authorId: row.author_id,
      authorName: author?.name ?? "Ekaya",
      authorAvatar: author?.avatar ?? null,
      title: row.title,
      content: row.content,
      imageUrl: row.image_url,
      categoryId: row.category_id,
      categorySlug: row.community_categories?.slug ?? null,
      categoryName: row.community_categories
        ? { pt: row.community_categories.name_pt, en: row.community_categories.name_en }
        : null,
      provinceId: row.province_id,
      provinceName: row.provinces ? { pt: row.provinces.name_pt, en: row.provinces.name_en } : null,
      destinationId: row.destination_id,
      destinationName: row.destinations?.name ?? null,
      experienceId: row.experience_id,
      experienceTitle: row.experiences?.title_pt ?? null,
      routeId: row.route_id,
      routeTitle: row.routes?.title ?? null,
      status: row.status as PostStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      likes: counts.likes,
      dislikes: counts.dislikes,
      myReaction: reactions.mine.get(row.id) ?? null,
    };
  });
}

export interface FeedFilters {
  search?: string;
  categoryId?: string | null;
  provinceId?: string | null;
  sort?: CommunitySort;
  /** Admin moderation view: read every status. */
  status?: PostStatus | "all";
  authorId?: string | null;
}

export async function fetchCommunityFeed(filters: FeedFilters = {}): Promise<CommunityPost[]> {
  let query = supabase.from("community_posts").select(POST_SELECT);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  else if (!filters.status) query = query.eq("status", "published");

  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.provinceId) query = query.eq("province_id", filters.provinceId);
  if (filters.authorId) query = query.eq("author_id", filters.authorId);
  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, " ");
    query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);

  const posts = await decorate((data ?? []) as RawPost[]);
  if (filters.sort === "popular") {
    posts.sort((a, b) => b.likes - a.likes || +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  return posts;
}

export async function fetchCommunityPost(id: string): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from("community_posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [post] = await decorate([data as RawPost]);
  return post ?? null;
}

/* ---------------- Writing posts ---------------- */

export async function createCommunityPost(input: PostInput): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new Error("NOT_AUTHENTICATED");

  const { data, error } = await supabase
    .from("community_posts")
    // author_id is also forced server-side by a trigger; the client cannot pick another user.
    .insert({
      author_id: userId,
      title: input.title.trim(),
      content: input.content.trim(),
      category_id: input.categoryId,
      province_id: input.provinceId,
      destination_id: input.destinationId ?? null,
      experience_id: input.experienceId ?? null,
      route_id: input.routeId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateCommunityPost(id: string, input: PostInput): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .update({
      title: input.title.trim(),
      content: input.content.trim(),
      category_id: input.categoryId,
      province_id: input.provinceId,
      destination_id: input.destinationId ?? null,
      experience_id: input.experienceId ?? null,
      route_id: input.routeId ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCommunityPost(id: string): Promise<void> {
  const { error } = await supabase.from("community_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Admin moderation. RLS + trigger reject status changes from non-admins. */
export async function setCommunityPostStatus(id: string, status: PostStatus): Promise<void> {
  const { error } = await supabase.from("community_posts").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Reactions ---------------- */

/** Applies like/dislike toggle semantics: same value removes, opposite value switches. */
export async function toggleReaction(
  postId: string,
  value: ReactionValue,
): Promise<ReactionValue | null> {
  const userId = await currentUserId();
  if (!userId) throw new Error("NOT_AUTHENTICATED");

  const { data: existing, error: readError } = await supabase
    .from("community_post_reactions")
    .select("id, reaction")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  if (existing && existing.reaction === value) {
    const { error } = await supabase
      .from("community_post_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return null;
  }
  if (existing) {
    const { error } = await supabase
      .from("community_post_reactions")
      .update({ reaction: value })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return value;
  }
  const { error } = await supabase
    .from("community_post_reactions")
    .insert({ post_id: postId, user_id: userId, reaction: value });
  if (error) throw new Error(error.message);
  return value;
}

/* ---------------- Reports ---------------- */

export async function reportCommunityPost(
  postId: string,
  reason: ReportReason,
  description?: string,
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("NOT_AUTHENTICATED");
  const { error } = await supabase.from("community_reports").insert({
    post_id: postId,
    reporter_id: userId,
    reason,
    description: description?.trim() || null,
  });
  // A unique constraint keeps one report per user per post.
  if (error && !error.message.includes("duplicate key")) throw new Error(error.message);
}

export async function fetchCommunityReports(
  status?: ReportStatus | "all",
): Promise<CommunityReport[]> {
  let query = supabase
    .from("community_reports")
    .select(
      "id, post_id, reason, description, status, created_at, resolved_at, community_posts ( title )",
    );
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    postId: row.post_id,
    postTitle: (row.community_posts as { title: string } | null)?.title ?? null,
    reason: row.reason as ReportReason,
    description: row.description,
    status: row.status as ReportStatus,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
}

/** Admin only; resolved_by/resolved_at are stamped by a trigger. */
export async function resolveCommunityReport(id: string, status: ReportStatus): Promise<void> {
  const { error } = await supabase.from("community_reports").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
