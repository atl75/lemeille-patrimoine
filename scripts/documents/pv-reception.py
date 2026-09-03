#!/usr/bin/env python3
"""
Procès-verbal de réception des travaux — 60 rue d'Amiens.

Le maître d'ouvrage est l'ASSOCIATION SYNDICALE LIBRE du 60 rue d'Amiens, et
non Novus Capital : c'est l'ASL qui réceptionne les travaux portant sur les
parties communes et les réseaux collectifs.

Conséquence directe : le numéro de carte professionnelle (CPI) de Novus Capital
ne figure NULLE PART sur ce document. Une ASL n'en détient pas, et faire
apparaître une carte d'agent immobilier sur un acte de réception de travaux
serait faux.

UN PROCÈS-VERBAL PAR LOT. Chaque acquéreur réceptionne et signe le sien : le
document ne porte donc plus six lots à cocher, mais un seul lot identifié. Un
septième document couvre les parties communes, réceptionnées par l'ASL.

Les entreprises interviennent sous la maîtrise d'œuvre de SBVH, qui est le seul
interlocuteur technique : le procès-verbal le dit, plutôt que de laisser un
champ « entreprise » que l'acquéreur ne saurait pas remplir.

    python3 scripts/documents/pv-reception.py            tous les documents
    python3 scripts/documents/pv-reception.py --lot 3    un seul
    python3 scripts/documents/pv-reception.py --communes parties communes
"""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# ── Identité du maître d'ouvrage ──────────────────────────────────────────
ASL_NOM = "ASSOCIATION SYNDICALE LIBRE DU 60 RUE D'AMIENS"
ASL_ADRESSE = "60 rue d'Amiens, 76000 Rouen"
# .title() donnait « Du 60 Rue D'Amiens » : on écrit la forme correcte.
ASL_NOM_COURANT = "Association Syndicale Libre du 60 rue d'Amiens"
CHANTIER = "60 rue d'Amiens, 76000 Rouen — réhabilitation complète d'un immeuble"
MAITRE_OEUVRE = "SBVH"

# Lots, repris de la fiche du programme.
# Les lots 1 et 2 (1er étage) ne relèvent pas de ce procès-verbal. Les numéros
# des lots restants sont CONSERVÉS tels quels : ils renvoient au règlement de
# copropriété, les renuméroter créerait un décalage avec tous les autres actes.
LOTS = [
    ("Lot 3", "2ème", "45,6 m²"),
    ("Lot 4", "2ème", "36,6 m²"),
    ("Lot 5", "3ème", "47 m²"),
    ("Lot 6", "3ème", "35 m²"),
    ("Lot 7", "4ème", "45,7 m²"),
    ("Lot 8", "4ème", "33 m²"),
]

VERT = (0.121, 0.231, 0.173)   # #1F3B2C
OR = (0.722, 0.612, 0.427)     # #B89C6D
GRIS = (0.42, 0.42, 0.42)

L, R = 20 * mm, 190 * mm       # marges gauche et droite


def entete(c, page):
    c.setFillColorRGB(*VERT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(L, 277 * mm, ASL_NOM)
    c.setFillColorRGB(*GRIS)
    c.setFont("Helvetica", 8)
    c.drawString(L, 272.5 * mm, ASL_ADRESSE)
    c.drawString(L, 268.5 * mm, "Association syndicale libre régie par l'ordonnance n° 2004-632 du 1er juillet 2004")
    c.setStrokeColorRGB(*OR)
    c.setLineWidth(0.8)
    c.line(L, 265 * mm, R, 265 * mm)


def pied(c, page):
    c.setStrokeColorRGB(0.85, 0.85, 0.85)
    c.setLineWidth(0.4)
    c.line(L, 16 * mm, R, 16 * mm)
    c.setFillColorRGB(*GRIS)
    c.setFont("Helvetica", 7)
    c.drawString(L, 12 * mm, f"{ASL_NOM} — {ASL_ADRESSE}")
    c.drawRightString(R, 12 * mm, f"Page {page}")


def titre_section(c, y, texte):
    c.setFillColorRGB(*VERT)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(L, y, texte)
    c.setStrokeColorRGB(*OR)
    c.setLineWidth(0.5)
    c.line(L, y - 1.8 * mm, L + 28 * mm, y - 1.8 * mm)
    return y - 7 * mm


def ligne_champ(c, y, libelle, valeur="", largeur_lib=42 * mm):
    c.setFillColorRGB(*GRIS)
    c.setFont("Helvetica", 8.5)
    c.drawString(L, y, libelle)
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica", 9)
    if valeur:
        c.drawString(L + largeur_lib, y, valeur)
    else:
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.setLineWidth(0.4)
        c.line(L + largeur_lib, y - 1 * mm, R, y - 1 * mm)
    return y - 6 * mm


def case(c, x, y, taille=3.2 * mm):
    c.setStrokeColorRGB(0.45, 0.45, 0.45)
    c.setLineWidth(0.6)
    c.rect(x, y, taille, taille)


def paragraphe(c, y, texte, taille=7.6, interligne=3.9 * mm, largeur=None):
    largeur = largeur or (R - L)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.setFont("Helvetica", taille)
    mots, ligne = texte.split(), ""
    for m in mots:
        essai = (ligne + " " + m).strip()
        if c.stringWidth(essai, "Helvetica", taille) > largeur:
            c.drawString(L, y, ligne)
            y -= interligne
            ligne = m
        else:
            ligne = essai
    if ligne:
        c.drawString(L, y, ligne)
        y -= interligne
    return y


def page1(c, lot):
    entete(c, 1)
    y = 256 * mm
    c.setFillColorRGB(*VERT)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(L, y, "PROCÈS-VERBAL DE RÉCEPTION DES TRAVAUX")
    y -= 6 * mm
    c.setFillColorRGB(*GRIS)
    c.setFont("Helvetica-Oblique", 8.5)
    c.drawString(L, y, "Établi en application de l'article 1792-6 du Code civil")
    y -= 9 * mm

    y = titre_section(c, y, "OPÉRATION")
    y = ligne_champ(c, y, "Chantier :", CHANTIER)
    y = ligne_champ(c, y, "Maître d'ouvrage :", ASL_NOM_COURANT)
    # L'immeuble a été vendu par lots à des copropriétaires distincts, qui se
    # sont constitués en ASL pour commander les travaux communs. C'est donc bien
    # l'ASL, et non un vendeur unique, qui a qualité pour réceptionner.
    c.setFillColorRGB(*GRIS)
    c.setFont("Helvetica-Oblique", 7.2)
    c.drawString(L + 42 * mm, y + 1.5 * mm,
                 "Association constituée par les copropriétaires de l'immeuble pour la conduite des travaux communs")
    y -= 4 * mm
    y = ligne_champ(c, y, "Représentée par :")
    y = ligne_champ(c, y, "Maître d'œuvre :", MAITRE_OEUVRE)
    c.setFillColorRGB(*GRIS)
    c.setFont("Helvetica-Oblique", 7.2)
    c.drawString(L + 42 * mm, y + 1.5 * mm,
                 "Les entreprises intervenantes agissent sous sa maîtrise d'œuvre")
    y -= 4 * mm
    y = ligne_champ(c, y, "Marché / devis n° :")
    y -= 3 * mm

    if lot:
        nom, etage, surface = lot
        y = titre_section(c, y, "LOT RÉCEPTIONNÉ")
        c.setFillColorRGB(*VERT)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(L, y, f"{nom} — {etage} étage — {surface}")
        y -= 6 * mm
        y = ligne_champ(c, y, "Acquéreur du lot :")
        c.setFillColorRGB(*GRIS)
        c.setFont("Helvetica-Oblique", 7.2)
        c.drawString(L, y + 1.5 * mm,
                     "Le présent procès-verbal porte sur ce seul lot. Les parties communes font "
                     "l'objet d'un procès-verbal distinct, signé par l'association.")
        y -= 7 * mm
    else:
        y = titre_section(c, y, "PARTIES COMMUNES RÉCEPTIONNÉES")
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica", 9)
        c.drawString(L, y, "Cage d'escalier, hall, façade, toiture, réseaux collectifs.")
        y -= 5 * mm
        c.setFillColorRGB(*GRIS)
        c.setFont("Helvetica-Oblique", 7.2)
        c.drawString(L, y, "Réceptionnées par l'association pour le compte de l'ensemble des copropriétaires. "
                           "Chaque lot privatif fait l'objet d'un procès-verbal distinct.")
        y -= 9 * mm

    y = titre_section(c, y, "DÉCISION DE RÉCEPTION")
    c.setFillColorRGB(*GRIS)
    c.setFont("Helvetica", 8)
    c.drawString(L, y, "Le maître d'ouvrage, après visite contradictoire des ouvrages :")
    y -= 7 * mm
    for texte in [
        "PRONONCE LA RÉCEPTION SANS RÉSERVE",
        "PRONONCE LA RÉCEPTION AVEC LES RÉSERVES portées en annexe (page 2)",
        "REFUSE LA RÉCEPTION pour les motifs suivants :",
    ]:
        case(c, L, y - 0.6 * mm, 3.6 * mm)
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(L + 6 * mm, y, texte)
        y -= 6.5 * mm
    c.setStrokeColorRGB(0.8, 0.8, 0.8)
    c.setLineWidth(0.4)
    c.line(L + 6 * mm, y, R, y)
    y -= 6 * mm
    y = ligne_champ(c, y, "Date d'effet de la réception :")
    y = ligne_champ(c, y, "Fait à :")
    y -= 3 * mm

    # Le bloc signatures mesure environ 36 mm et le pied de page commence à
    # 16 mm : il lui faut donc démarrer au-dessus de 52 mm. Si une modification
    # du contenu fait descendre plus bas, l'assertion le signale au lieu de
    # produire un document où les cadres chevauchent le pied.
    assert y >= 52 * mm, (
        f"le contenu de la page 1 déborde : signatures à {y/mm:.0f} mm, "
        "il en faut 52 au minimum — raccourcir une section au-dessus"
    )
    y = titre_section(c, y, "SIGNATURES")
    largeur = (R - L - 10 * mm) / 3
    # Qui signe dépend de ce qui est réceptionné : l'acquéreur pour son lot
    # privatif, l'association pour les parties communes.
    signataires = (
        [("L'acquéreur", f"{lot[0]} — {lot[1]} étage"),
         ("Le maître d'œuvre", MAITRE_OEUVRE),
         ("Pour l'association", "ASL du 60 rue d'Amiens")]
        if lot else
        [("Le maître d'ouvrage", "ASL du 60 rue d'Amiens"),
         ("Le maître d'œuvre", MAITRE_OEUVRE),
         ("Le président de l'ASL", "ou son représentant")]
    )
    for i, (qui, sous) in enumerate(signataires):
        x = L + i * (largeur + 5 * mm)
        c.setFillColorRGB(*VERT)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x, y, qui)
        c.setFillColorRGB(*GRIS)
        c.setFont("Helvetica-Oblique", 7)
        c.drawString(x, y - 4 * mm, sous)
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.setLineWidth(0.4)
        c.rect(x, y - 22 * mm, largeur, 16 * mm)
        c.setFont("Helvetica", 6.5)
        c.drawString(x, y - 25.5 * mm, "Date, signature et mention « lu et approuvé »")
    pied(c, 1)


def effets_et_documents(c, y):
    """Effets juridiques et bordereau des documents remis.

    Ces deux blocs vivaient en page 1 ; ils la faisaient déborder sur le pied de
    page. Ils ouvrent désormais la page 2, avant l'annexe des réserves.
    """
    y = titre_section(c, y, "EFFETS DE LA RÉCEPTION")
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.setFont("Helvetica", 7.6)
    c.drawString(L, y, "La réception emporte, à compter de sa date d'effet :")
    y -= 5 * mm
    for p in [
        "le point de départ de la garantie de parfait achèvement — 1 an — portant sur la levée des réserves ;",
        "le point de départ de la garantie de bon fonctionnement des éléments d'équipement dissociables — 2 ans ;",
        "le point de départ de la garantie décennale — 10 ans — sur les dommages compromettant la solidité de "
        "l'ouvrage ou le rendant impropre à sa destination ;",
        "le transfert de la garde de l'ouvrage au maître d'ouvrage et le départ du délai de restitution de la retenue de garantie.",
    ]:
        c.setFillColorRGB(*OR)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(L + 1 * mm, y, "•")
        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.setFont("Helvetica", 7.6)
        mots, ligne = p.split(), ""
        yy = y
        for m in mots:
            essai = (ligne + " " + m).strip()
            if c.stringWidth(essai, "Helvetica", 7.6) > (R - L - 6 * mm):
                c.drawString(L + 5 * mm, yy, ligne)
                yy -= 3.6 * mm
                ligne = m
            else:
                ligne = essai
        if ligne:
            c.drawString(L + 5 * mm, yy, ligne)
            yy -= 3.6 * mm
        y = yy - 0.5 * mm
    y -= 2 * mm

    y = titre_section(c, y, "DOCUMENTS REMIS À LA RÉCEPTION")
    docs = ["Dossier des ouvrages exécutés (DOE)", "Notices d'entretien et d'utilisation",
            "Attestations d'assurance décennale", "Certificats de conformité (gaz, électricité)",
            "Plans de récolement", "Procès-verbaux d'essais et de mise en service"]
    for i, d in enumerate(docs):
        col = i % 2
        x = L + col * 85 * mm
        case(c, x, y - 0.6 * mm, 3 * mm)
        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.setFont("Helvetica", 8)
        c.drawString(x + 5 * mm, y, d)
        if col == 1:
            y -= 5.5 * mm
    return y


def page2(c, lot):
    entete(c, 2)
    y = 256 * mm
    y = effets_et_documents(c, y)
    y -= 2 * mm
    c.setFillColorRGB(*VERT)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(L, y, "ANNEXE — LISTE DES RÉSERVES")
    y -= 6 * mm
    c.setFillColorRGB(*GRIS)
    c.setFont("Helvetica-Oblique", 8)
    quoi = f"{lot[0]} — {lot[1]} étage" if lot else "parties communes"
    c.drawString(L, y, f"Annexée au procès-verbal de réception — {quoi} — {CHANTIER.split(' — ')[0]}")
    y -= 9 * mm
    y = paragraphe(c, y, "Les réserves ci-dessous doivent être levées dans le délai convenu. Leur levée "
                         "fait l'objet d'un constat contradictoire. À défaut de levée dans le délai imparti, "
                         "le maître d'ouvrage peut faire exécuter les travaux aux frais de l'entreprise "
                         "défaillante, après mise en demeure restée infructueuse.")
    y -= 5 * mm

    colonnes = [("N°", 10 * mm), ("Lot / localisation", 38 * mm), ("Nature de la réserve", 62 * mm),
                ("Délai", 20 * mm), ("Levée le", 22 * mm), ("Visa", 18 * mm)]
    hauteur = 8.2 * mm
    c.setFillColorRGB(*VERT)
    c.rect(L, y - hauteur + 2 * mm, R - L, hauteur, fill=1, stroke=0)
    x = L
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 7.5)
    for nom, larg in colonnes:
        c.drawString(x + 1.5 * mm, y - 3.2 * mm, nom)
        x += larg
    y -= hauteur

    c.setFont("Helvetica", 8)
    for n in range(1, 14):
        if n % 2 == 0:
            c.setFillColorRGB(0.97, 0.97, 0.95)
            c.rect(L, y - hauteur + 2 * mm, R - L, hauteur, fill=1, stroke=0)
        c.setStrokeColorRGB(0.85, 0.85, 0.85)
        c.setLineWidth(0.3)
        c.line(L, y - hauteur + 2 * mm, R, y - hauteur + 2 * mm)
        x = L
        for j, (_, larg) in enumerate(colonnes):
            if j:
                c.line(x, y - hauteur + 2 * mm, x, y + 2 * mm)
            x += larg
        c.setFillColorRGB(0.35, 0.35, 0.35)
        c.drawString(L + 1.5 * mm, y - 3.2 * mm, str(n))
        y -= hauteur
    c.setStrokeColorRGB(0.6, 0.6, 0.6)
    c.setLineWidth(0.5)
    c.rect(L, y + 2 * mm, R - L, 14 * hauteur, fill=0, stroke=1)

    y -= 9 * mm
    y = titre_section(c, y, "LEVÉE DE L'ENSEMBLE DES RÉSERVES")
    y = ligne_champ(c, y, "Constatée le :")
    y = ligne_champ(c, y, "Signature du maître d'ouvrage :")
    assert y >= 16 * mm, (
        f"la page 2 déborde sur le pied : dernier élément à {y/mm:.0f} mm — "
        "réduire le nombre de lignes de réserves"
    )
    pied(c, 2)


def document(chemin, lot):
    c = canvas.Canvas(chemin, pagesize=A4)
    quoi = f"{lot[0]}" if lot else "parties communes"
    c.setTitle(f"Procès-verbal de réception — {quoi} — 60 rue d'Amiens")
    c.setAuthor(ASL_NOM)
    page1(c, lot)
    c.showPage()
    page2(c, lot)
    c.showPage()
    c.save()
    return chemin


def main():
    args = sys.argv[1:]
    base = "PV-reception-60-rue-d-Amiens"

    if "--lot" in args:
        n = args[args.index("--lot") + 1]
        lot = next((l for l in LOTS if l[0] == f"Lot {n}"), None)
        if not lot:
            sys.exit(f"lot inconnu : {n} — disponibles : {', '.join(l[0] for l in LOTS)}")
        print("écrit :", document(f"{base}-lot-{n}.pdf", lot))
        return

    if "--communes" in args:
        print("écrit :", document(f"{base}-parties-communes.pdf", None))
        return

    for lot in LOTS:
        n = lot[0].split()[1]
        print("écrit :", document(f"{base}-lot-{n}.pdf", lot))
    print("écrit :", document(f"{base}-parties-communes.pdf", None))


if __name__ == "__main__":
    main()
