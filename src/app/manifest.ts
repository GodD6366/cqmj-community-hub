import type { MetadataRoute } from 'next';
import { getCommunityName } from "@/lib/community-brand";

export default function manifest(): MetadataRoute.Manifest {
  const communityName = getCommunityName();
  return {
    name: communityName,
    short_name: communityName,
    description: '面向小区住户的社区协作平台。',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      }
    ],
  };
}
