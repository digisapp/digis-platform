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
          '/creator/dashboard/',
          '/creator/earnings/',
          '/creator/settings/',
          '/settings/',
          '/messages/',
          '/wallet/',
          '/checkout/',
          '/claim/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
