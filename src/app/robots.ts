import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://digis.cc';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/creator/dashboard/',
          '/creator/earnings/',
          '/creator/settings/',
          '/settings/',
          '/messages/',
          '/wallet/',
          '/checkout/',
          '/claim/',
          '/calls/',
          '/notifications/',
          '/stream/control/',
          '/stream/monitor/',
          '/stream/live/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
