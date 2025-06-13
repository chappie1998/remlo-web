import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://remlo.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/wallet/',
        '/auth/',
        '/activity/',
        '/payment-links/',
        '/payment-requests/',
        '/pay/',
        '/payment-link/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
} 