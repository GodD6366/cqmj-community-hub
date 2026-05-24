const DEFAULT_COMMUNITY_NAME = "汤臣一品";

export function getCommunityName() {
  return process.env.NEXT_PUBLIC_COMMUNITY_NAME?.trim() || DEFAULT_COMMUNITY_NAME;
}
