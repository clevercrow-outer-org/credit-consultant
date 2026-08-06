import { notFound } from "next/navigation";
import { BlogPost, BLOG_POSTS } from '../../components/BlogPost';

export default async function SingleBlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug && !BLOG_POSTS[slug]) {
    notFound();
  }
  return <BlogPost />;
}
