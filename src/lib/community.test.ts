import { describe, expect, it } from "vitest";

import { translate, type DictKey } from "@/contexts/LanguageContext";
import {
  feedSearchTerm,
  isDuplicateReport,
  mapPost,
  postInputMissing,
  reactionAction,
  sortFeed,
  tallyReactions,
  type CommunityPost,
  type RawPost,
} from "./community";

const raw = (over: Partial<RawPost> = {}): RawPost => ({
  id: "p1",
  author_id: "u1",
  title: "Praia do Tofo",
  content: "Ótima para mergulho",
  image_url: null,
  category_id: "c1",
  province_id: "pr1",
  destination_id: null,
  experience_id: null,
  route_id: null,
  status: "published",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  ...over,
});

describe("community feed search", () => {
  it("drops empty searches", () => {
    expect(feedSearchTerm(undefined)).toBeNull();
    expect(feedSearchTerm("   ")).toBeNull();
  });

  it("removes characters that would break the PostgREST or() filter", () => {
    expect(feedSearchTerm(" tofo%,praia ")).toBe("tofo  praia");
  });
});

describe("community reactions", () => {
  it("counts likes and dislikes per post and keeps the user's own reaction", () => {
    const { counts, mine } = tallyReactions(
      [
        { post_id: "a", user_id: "u1", reaction: "like" },
        { post_id: "a", user_id: "u2", reaction: "like" },
        { post_id: "a", user_id: "u3", reaction: "dislike" },
        { post_id: "b", user_id: "u1", reaction: "dislike" },
      ],
      "u1",
    );
    expect(counts.get("a")).toEqual({ likes: 2, dislikes: 1 });
    expect(counts.get("b")).toEqual({ likes: 0, dislikes: 1 });
    expect(mine.get("a")).toBe("like");
    expect(mine.get("b")).toBe("dislike");
  });

  it("has no own reaction for a guest", () => {
    const { mine } = tallyReactions([{ post_id: "a", user_id: "u1", reaction: "like" }], null);
    expect(mine.size).toBe(0);
  });

  it("toggles: same value removes, opposite switches, none inserts", () => {
    expect(reactionAction("like", "like")).toBe("remove");
    expect(reactionAction("like", "dislike")).toBe("switch");
    expect(reactionAction(null, "like")).toBe("insert");
  });
});

describe("community post mapping", () => {
  it("maps names in both languages and reaction counts", () => {
    const post = mapPost(
      raw({
        community_categories: { slug: "food", name_pt: "Gastronomia", name_en: "Food" },
        provinces: { name_pt: "Inhambane", name_en: "Inhambane" },
        status: "hidden",
      }),
      { name: "Ana", avatar: null },
      { likes: 3, dislikes: 1 },
      "like",
    );
    expect(post).toMatchObject({
      authorName: "Ana",
      categorySlug: "food",
      categoryName: { pt: "Gastronomia", en: "Food" },
      provinceName: { pt: "Inhambane", en: "Inhambane" },
      status: "hidden",
      likes: 3,
      dislikes: 1,
      myReaction: "like",
    });
  });

  it("falls back to a neutral author and zero reactions", () => {
    const post = mapPost(raw(), undefined, undefined, null);
    expect(post.authorName).toBe("EKAYA");
    expect(post.authorAvatar).toBeNull();
    expect([post.likes, post.dislikes, post.myReaction]).toEqual([0, 0, null]);
    expect(post.categoryName).toBeNull();
  });
});

describe("community feed order", () => {
  const post = (id: string, likes: number, createdAt: string) =>
    ({ id, likes, createdAt }) as CommunityPost;
  const posts = [
    post("old-popular", 5, "2026-01-01T00:00:00Z"),
    post("new-quiet", 0, "2026-10-01T00:00:00Z"),
    post("new-popular", 5, "2026-09-01T00:00:00Z"),
  ];

  it("keeps the newest-first query order for 'recent'", () => {
    expect(sortFeed(posts, "recent").map((p) => p.id)).toEqual(posts.map((p) => p.id));
  });

  it("orders 'popular' by likes, then newest", () => {
    expect(sortFeed(posts, "popular").map((p) => p.id)).toEqual([
      "new-popular",
      "old-popular",
      "new-quiet",
    ]);
  });

  it("does not reorder the caller's array", () => {
    const before = posts.map((p) => p.id);
    sortFeed(posts, "popular");
    expect(posts.map((p) => p.id)).toEqual(before);
  });
});

describe("community form and reports", () => {
  const filled = { title: "Título", content: "Texto", categoryId: "c", provinceId: "p" };

  it("requires title, content, category and province", () => {
    expect(postInputMissing(filled)).toBe(false);
    expect(postInputMissing({ ...filled, title: "   " })).toBe(true);
    expect(postInputMissing({ ...filled, content: "" })).toBe(true);
    expect(postInputMissing({ ...filled, categoryId: "" })).toBe(true);
    expect(postInputMissing({ ...filled, provinceId: null })).toBe(true);
  });

  it("treats a second report of the same post as already sent", () => {
    expect(
      isDuplicateReport('duplicate key value violates unique constraint "community_reports_key"'),
    ).toBe(true);
    expect(isDuplicateReport("permission denied for table community_reports")).toBe(false);
  });
});

describe("community texts exist in PT and EN", () => {
  const keys: DictKey[] = [
    "communityTitle",
    "communitySubtitle",
    "communityFeedEmpty",
    "communityNewPost",
    "communityEditPost",
    "communityPostTitle",
    "communityPostContent",
    "communityProvince",
    "communityDestination",
    "communityExperience",
    "communityRoute",
    "communityPublish",
    "communitySave",
    "communityDelete",
    "communityDeleteConfirm",
    "communitySearch",
    "communityAllProvinces",
    "communityMostPopular",
    "communityLike",
    "communityDislike",
    "communityReport",
    "communityReportReason",
    "communityReportDescription",
    "communityReportSent",
    "communityPostCreated",
    "communityPostUpdated",
    "communityPostDeleted",
    "communityRequiredFields",
    "communityLoadError",
    "communityRelated",
    "communityBack",
    "communityOpen",
    "communityLoading",
    "communityImageSoon",
    "reasonSpam",
    "reasonInappropriate",
    "reasonMisleading",
    "reasonOffensive",
    "reasonOther",
  ];

  it.each(keys)("%s has text in both languages", (key) => {
    expect(translate(key, "pt").trim()).not.toBe("");
    expect(translate(key, "en").trim()).not.toBe("");
    expect(translate(key, "pt")).not.toBe(key);
  });

  it.each(keys)("%s has no Portuguese left in English", (key) => {
    expect(translate(key, "en")).not.toMatch(/[ãõçáéíóúâêô]/i);
  });
});
