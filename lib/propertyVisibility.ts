/** Une fiche hors catalogue reste accessible par son lien si elle est en ligne. */
export function propertyInCatalog(p: { visible?: boolean; unlisted?: boolean } | null | undefined): boolean {
  return !!p && p.visible !== false && p.unlisted !== true;
}
