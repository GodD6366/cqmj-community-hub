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
        src: '/brand/system-logo-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/brand/system-logo-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/brand/system-logo-apple.png',
        sizes: '180x180',
        type: 'image/png',
      }
    ],
  };
}
