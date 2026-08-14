'use client';

import { useParams } from 'next/navigation';
import { BlogPost } from '../../components/BlogPost';

export default function SingleBlogPost() {
  const params = useParams<{ slug: string }>();
  return <BlogPost initialSlug={params?.slug} />;
}
