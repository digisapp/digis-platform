import Script from 'next/script';

interface PersonJsonLdProps {
  name: string;
  url: string;
  image?: string;
  description?: string;
  sameAs?: string[];
}

export function PersonJsonLd({ name, url, image, description, sameAs }: PersonJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url,
    ...(image && { image }),
    ...(description && { description }),
    ...(sameAs && sameAs.length > 0 && { sameAs }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface VideoObjectJsonLdProps {
  name: string;
  description: string;
  thumbnailUrl?: string;
  uploadDate: string;
  duration?: string; // ISO 8601 format: PT1H30M
  contentUrl?: string;
  embedUrl?: string;
  creator: {
    name: string;
    url: string;
  };
  interactionCount?: number;
}

export function VideoObjectJsonLd({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  contentUrl,
  embedUrl,
  creator,
  interactionCount,
}: VideoObjectJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description,
    ...(thumbnailUrl && { thumbnailUrl }),
    uploadDate,
    ...(duration && { duration }),
    ...(contentUrl && { contentUrl }),
    ...(embedUrl && { embedUrl }),
    author: {
      '@type': 'Person',
      name: creator.name,
      url: creator.url,
    },
    ...(interactionCount && {
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WatchAction',
        userInteractionCount: interactionCount,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface BroadcastEventJsonLdProps {
  name: string;
  description: string;
  startDate: string;
  isLiveBroadcast: boolean;
  thumbnailUrl?: string;
  creator: {
    name: string;
    url: string;
  };
  viewerCount?: number;
}

export function BroadcastEventJsonLd({
  name,
  description,
  startDate,
  isLiveBroadcast,
  thumbnailUrl,
  creator,
  viewerCount,
}: BroadcastEventJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BroadcastEvent',
    name,
    description,
    startDate,
    isLiveBroadcast,
    ...(thumbnailUrl && { image: thumbnailUrl }),
    broadcastOfEvent: {
      '@type': 'Event',
      name,
      performer: {
        '@type': 'Person',
        name: creator.name,
        url: creator.url,
      },
    },
    ...(viewerCount && {
      audience: {
        '@type': 'Audience',
        audienceSize: viewerCount,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface OrganizationJsonLdProps {
  name: string;
  url: string;
  logo: string;
  description?: string;
  sameAs?: string[];
}

export function OrganizationJsonLd({ name, url, logo, description, sameAs }: OrganizationJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    ...(description && { description }),
    ...(sameAs && sameAs.length > 0 && { sameAs }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQPageJsonLdProps {
  questions: FAQItem[];
}

export function FAQPageJsonLd({ questions }: FAQPageJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Helper to convert seconds to ISO 8601 duration
export function secondsToIsoDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (minutes > 0) duration += `${minutes}M`;
  if (secs > 0 || duration === 'PT') duration += `${secs}S`;

  return duration;
}
