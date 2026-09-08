import { NextResponse } from 'next/server';
import { updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { erreurCommentaire, nouveauCommentaire } from '@/lib/commentairesLead';

/** Ajoute une note de suivi horodatée au lead. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const erreur = erreurCommentaire(body?.texte);
    if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

    // Construit AVANT la mutation : updateJSON rejoue sa fonction en cas de
    // conflit, et l'identifiant comme l'horodatage doivent rester stables.
    const commentaire = nouveauCommentaire(body.texte, body?.auteur);

    let trouve = false;
    await updateJSON('leads.json', (leads: any[]) => {
      const i = leads.findIndex((l: any) => l.id === id);
      if (i === -1) return SANS_ECRITURE;
      trouve = true;

      if (!leads[i].commentaires) leads[i].commentaires = [];
      leads[i].commentaires.push(commentaire);
      // Commenter, c'est travailler le dossier : le compteur de relance repart.
      leads[i].lastActivityAt = commentaire.createdAt;
      return leads;
    });

    if (!trouve) return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    return NextResponse.json({ success: true, commentaire });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
