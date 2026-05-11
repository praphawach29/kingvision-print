import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  schema?: any;
}

export function SEO({ 
  title, 
  description, 
  keywords, 
  image = '/og-image.jpg', 
  url = window.location.href,
  type = 'website',
  schema
}: SEOProps) {
  const siteName = 'KingVision Print';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription = 'KingVision Print บริการงานพิมพ์คุณภาพสูง นามบัตร ใบปลิว สติ๊กเกอร์ และสื่อสิ่งพิมพ์ทุกชนิด พร้อมบริการออกแบบและจัดส่งทั่วประเทศ';
  const metaDescription = description || defaultDescription;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={image} />

      {/* Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
