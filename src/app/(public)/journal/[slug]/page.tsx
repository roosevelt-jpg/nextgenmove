import Image from "next/image";
import { notFound } from "next/navigation";
import { RichText } from "@/components/public/rich-text";
import { getArticleBySlug } from "@/lib/collections/pages";
import { getTaxonomies, getTaxonomyLabel } from "@/lib/collections/taxonomies";

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, taxonomies] = await Promise.all([
    getArticleBySlug(slug),
    getTaxonomies(),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <article className="page-section mx-auto max-w-2xl space-y-6">
      {article.coverImageUrl ? (
        <Image
          src={article.coverImageUrl}
          alt={article.title}
          width={1200}
          height={630}
          className="w-full rounded-radius-lg object-cover"
        />
      ) : null}
      <header className="space-y-3">
        <h1 className="font-serif text-4xl text-text-primary">{article.title}</h1>
        <p className="text-sm text-text-muted">
          {article.author}
          {article.publishedDate
            ? ` · ${new Date(article.publishedDate).toLocaleDateString()}`
            : null}
          {article.category
            ? ` · ${getTaxonomyLabel(taxonomies, "category", article.category)}`
            : null}
        </p>
        {article.tags.length ? (
          <ul className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-text-secondary"
              >
                {getTaxonomyLabel(taxonomies, "articleTag", tag)}
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      <RichText html={article.body} />
    </article>
  );
}
