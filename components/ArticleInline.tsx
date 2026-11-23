import { parseArticleInline, type ArticleInline as InlineNode } from '@/lib/articleInline';

function renderNodes(nodes: InlineNode[]): React.ReactNode {
  return nodes.map((node, index) => {
    if (node.type === 'strong') return <strong key={index}>{renderNodes(node.children)}</strong>;
    if (node.type === 'link') return (
      <a key={index} href={node.href} className="text-luxe underline underline-offset-4 decoration-current hover:decoration-2">
        {renderNodes(node.children)}
      </a>
    );
    return node.value;
  });
}

/** React échappe tous les textes ; aucun dangerouslySetInnerHTML. */
export default function ArticleInline({ text }: { text: string }) {
  return <>{renderNodes(parseArticleInline(text))}</>;
}
