#!/usr/bin/env python3
"""
Cartes de visite — Arthur Lemeille, Lemeille Patrimoine.

Carte de 85 × 55 mm avec 1,5 mm de fond perdu sur chaque bord : le document
mesure donc 88 × 58 mm, la taille que réclame le gabarit de l'imprimeur. Les
aplats débordent volontairement jusqu'au bord de page, faute de quoi une coupe
légèrement décalée laisserait un liseré blanc. Coins arrondis à 3 mm.

Le fichier d'impression ne porte QUE le graphisme : ni traits de coupe — à
1,5 mm ils n'ont plus la place de se tenir dehors — ni tracé de découpe.
L'éditeur de l'imprimeur montre déjà la coupe, la zone de sécurité et les
coins ; un repère de plus s'imprimerait sur la carte.

Deux pages : recto (identité et coordonnées) puis verso (flashcode).

LE FLASHCODE EST VECTORIEL. Les modules sont tracés en rectangles PDF plutôt
qu'importés en image : à l'impression, un QR en pixels bave sur les bords et
devient capricieux à scanner. Ici il reste net à n'importe quelle résolution.

L'URL porte des paramètres UTM : les visites venues des cartes apparaîtront
sous « carte-visite » dans les statistiques, séparées du reste du trafic.

    python3 scripts/documents/carte-visite.py
    python3 scripts/documents/carte-visite.py --apercu    aperçu seul
    python3 scripts/documents/carte-visite.py --png            PNG 600 dpi en plus
    python3 scripts/documents/carte-visite.py --png --dpi 1200  plus fin encore
"""
import sys

import segno
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# ── Identité, reprise des mentions légales et des données structurées ──────
NOM = "Arthur Lemeille"
MAISON = "Lemeille Patrimoine"
TITRES = ["Agent immobilier", "Conseiller en investissements financiers"]
# Forme internationale : une carte se tend aussi à l'étranger, et le numéro
# reste composable tel quel depuis un téléphone.
TEL = "+33 6 87 15 72 59"
EMAIL = "arthur@lemeillepatrimoine.com"
SITE = "lemeillepatrimoine.com"
ADRESSE = "50 rue de la Garenne — 76130 Mont-Saint-Aignan"

# Mentions réglementaires. Un agent immobilier DOIT porter sa carte
# professionnelle ; un CIF, son numéro ORIAS et son association agréée.
CARTE_T = "Carte professionnelle CPI 7606 2024 000 000 038 — CCI Rouen Métropole"
ORIAS = "ORIAS 23 003 614 — membre ANACOFI-CIF"
SOCIETE = "Novus Capital SAS — SIREN 937 847 937"

# Le flashcode mène ici. Les UTM permettent de compter les scans dans GA.
URL = "https://lemeillepatrimoine.com/?utm_source=carte-visite&utm_medium=qr"

# ── Charte (tailwind.config.js) ───────────────────────────────────────────
VERT = (0.121, 0.231, 0.173)   # #1F3B2C
OR = (0.722, 0.612, 0.427)     # #B89C6D
CREME = (0.957, 0.945, 0.922)  # #F4F1EB
BLANC = (1, 1, 1)

# ── Géométrie ─────────────────────────────────────────────────────────────
LARGEUR, HAUTEUR = 85 * mm, 55 * mm
# 1,5 mm, comme le réclame l'éditeur de l'imprimeur : il annonce un document
# de 88 × 58 mm pour une carte de 85 × 55. C'était 3 mm auparavant, ce qui
# donnait une page de 91 × 61 que son gabarit aurait refusée ou recadrée.
FOND_PERDU = 1.5 * mm
PAGE = (LARGEUR + 2 * FOND_PERDU, HAUTEUR + 2 * FOND_PERDU)
# Origine de la carte rognée dans la page : tout se positionne par rapport à
# elle, le fond perdu n'étant qu'une marge sacrificielle.
X0, Y0 = FOND_PERDU, FOND_PERDU
MARGE = 6 * mm   # zone de sécurité : aucun texte plus près du bord rogné
# Rayon des coins. 3 mm est le arrondi courant des cartes de visite : visible
# sans être ostentatoire. 2 mm passe presque inaperçu, 5 mm fait « badge ».
RAYON = 3 * mm


def fond(c, couleur):
    """Aplat couvrant TOUTE la page, fond perdu compris."""
    c.setFillColorRGB(*couleur)
    c.rect(0, 0, PAGE[0], PAGE[1], fill=1, stroke=0)


def masque_arrondi(c):
    """Restreint tout tracé ultérieur au contour arrondi.

    Réservé à l'APERÇU : il montre la carte telle qu'elle sera une fois
    découpée. À ne jamais utiliser pour le fichier d'impression, où ce masque
    supprimerait le fond perdu dont la découpe a besoin.
    """
    chemin = c.beginPath()
    chemin.roundRect(X0, Y0, LARGEUR, HAUTEUR, RAYON)
    c.clipPath(chemin, stroke=0, fill=0)


def monogramme(c, cx, cy, rayon, couleur_trait, couleur_texte):
    """Le « LP » cerclé du logo (public/logo.svg), redessiné en vectoriel."""
    c.setStrokeColorRGB(*couleur_trait)
    c.setLineWidth(rayon * 0.075)
    c.circle(cx, cy, rayon, fill=0, stroke=1)
    c.setFillColorRGB(*couleur_texte)
    taille = rayon * 0.85
    c.setFont("Times-Roman", taille)
    c.drawCentredString(cx, cy - taille * 0.34, "LP")


def recto(c):
    fond(c, CREME)

    # Bande verte à gauche : elle descend jusqu'aux bords de la PAGE, fond
    # perdu compris, pour survivre à un rognage décalé.
    bande = 26 * mm
    c.setFillColorRGB(*VERT)
    c.rect(0, 0, X0 + bande, PAGE[1], fill=1, stroke=0)

    monogramme(c, X0 + bande / 2, Y0 + HAUTEUR * 0.62, 9 * mm, OR, OR)
    c.setFillColorRGB(*OR)
    c.setLineWidth(0.6)
    c.setStrokeColorRGB(*OR)
    c.line(X0 + bande / 2 - 7 * mm, Y0 + HAUTEUR * 0.62 - 14 * mm,
           X0 + bande / 2 + 7 * mm, Y0 + HAUTEUR * 0.62 - 14 * mm)

    x = X0 + bande + 7 * mm
    y = Y0 + HAUTEUR - MARGE - 6 * mm

    c.setFillColorRGB(*VERT)
    c.setFont("Times-Roman", 15)
    c.drawString(x, y, NOM)
    y -= 5.4 * mm

    c.setFillColorRGB(*OR)
    c.setFont("Times-Italic", 8.6)
    c.drawString(x, y, MAISON)
    y -= 5 * mm

    c.setFillColorRGB(0.35, 0.35, 0.35)
    c.setFont("Helvetica", 6.4)
    for t in TITRES:
        c.drawString(x, y, t)
        y -= 3.3 * mm

    y -= 2.6 * mm
    c.setStrokeColorRGB(*OR)
    c.setLineWidth(0.5)
    c.line(x, y, x + 16 * mm, y)
    y -= 5.4 * mm

    c.setFillColorRGB(*VERT)
    c.setFont("Helvetica", 7.4)
    for ligne in (TEL, EMAIL, SITE):
        c.drawString(x, y, ligne)
        y -= 4.1 * mm

    # L'adresse ferme la carte, en bas, plus discrète.
    c.setFillColorRGB(0.45, 0.45, 0.45)
    c.setFont("Helvetica", 5.6)
    c.drawString(x, Y0 + MARGE, ADRESSE)


def flashcode(c, cx, cy, cote):
    """Trace le QR en rectangles vectoriels, sur pastille claire.

    Modules SOMBRES sur fond CLAIR : l'inverse se scanne mal sur beaucoup
    d'appareils. La pastille claire est donc posée sur le vert, plutôt que
    d'inverser le code.
    """
    qr = segno.make(URL, error="m")
    matrice = [list(rang) for rang in qr.matrix]
    n = len(matrice)
    silence = 3                      # zone de silence, en modules
    total = n + 2 * silence
    pas = cote / total

    c.setFillColorRGB(*CREME)
    c.roundRect(cx - cote / 2 - 2 * mm, cy - cote / 2 - 2 * mm,
                cote + 4 * mm, cote + 4 * mm, 1.6 * mm, fill=1, stroke=0)

    c.setFillColorRGB(*VERT)
    ox = cx - cote / 2 + silence * pas
    oy = cy + cote / 2 - silence * pas
    for i, rang in enumerate(matrice):
        for j, mod in enumerate(rang):
            if mod:
                # +0.3 % de recouvrement : sans lui, l'anticrénelage des
                # visionneuses laisse un cheveu blanc entre modules voisins.
                c.rect(ox + j * pas, oy - (i + 1) * pas,
                       pas * 1.003, pas * 1.003, fill=1, stroke=0)
    return n


def verso(c):
    fond(c, VERT)

    # 28 mm plutôt que 24 : à 37 modules, c'était 0,56 mm par module, sous le
    # seuil confortable de lecture à l'impression. On y gagne 0,65 mm.
    cote = 28 * mm
    cx = X0 + MARGE + 2 * mm + cote / 2
    cy = Y0 + HAUTEUR / 2 + 3 * mm
    modules = flashcode(c, cx, cy, cote)

    # Colonne de droite : la maison et l'adresse du site.
    x = cx + cote / 2 + 8 * mm
    y = Y0 + HAUTEUR - MARGE - 7 * mm

    c.setFillColorRGB(*CREME)
    c.setFont("Times-Roman", 12)
    c.drawString(x, y, MAISON)
    y -= 5 * mm

    c.setStrokeColorRGB(*OR)
    c.setLineWidth(0.5)
    c.line(x, y, x + 12 * mm, y)
    y -= 5.4 * mm

    c.setFillColorRGB(*OR)
    c.setFont("Helvetica", 7)
    c.drawString(x, y, SITE)
    y -= 5 * mm

    c.setFillColorRGB(0.80, 0.84, 0.81)
    c.setFont("Helvetica", 5.4)
    c.drawString(x, y, "Scannez pour")
    c.drawString(x, y - 3.2 * mm, "découvrir nos biens")

    # Les mentions réglementaires courent en bas, sur TOUTE la largeur : elles
    # y tiennent en une ligne chacune, donc plus lisibles que tassées dans une
    # colonne. Un agent immobilier doit porter sa carte professionnelle ; un
    # CIF, son numéro ORIAS et son association agréée.
    yb = Y0 + MARGE + 3.4 * mm
    c.setFillColorRGB(0.62, 0.68, 0.64)
    c.setFont("Helvetica", 4.8)
    largeur_max = LARGEUR - 2 * MARGE
    for ligne in (CARTE_T, ORIAS + "  ·  " + SOCIETE):
        assert c.stringWidth(ligne, "Helvetica", 4.8) <= largeur_max, (
            f"mention trop longue pour la largeur de carte : {ligne[:40]}…"
        )
        c.drawCentredString(X0 + LARGEUR / 2, yb, ligne)
        yb -= 3.4 * mm

    assert yb + 3.4 * mm >= Y0 + MARGE - 0.5 * mm, "les mentions sortent de la zone de sécurité"
    return modules


def page(c, dessine, apercu):
    """Trace une face selon le mode.

    APERÇU : le contenu est masqué au contour arrondi — on voit la carte finie.
    IMPRESSION : le contenu garde son fond perdu rectangulaire, et rien d'autre
    n'est ajouté ; c'est le gabarit de l'imprimeur qui porte les repères.
    """
    if apercu:
        c.saveState()
        masque_arrondi(c)
        r = dessine(c)
        c.restoreState()
        return r
    # Le fichier d'impression ne porte QUE le graphisme.
    #
    # Ni traits de coupe — avec 1,5 mm de fond perdu ils n'ont plus la place de
    # se tenir dehors et retomberaient sur la carte — ni tracé de découpe en
    # magenta : l'éditeur de l'imprimeur montre déjà la coupe, la zone de
    # sécurité et les coins arrondis, et un filet de plus s'imprimerait.
    return dessine(c)


def document(nom, apercu):
    c = canvas.Canvas(nom, pagesize=PAGE)
    c.setTitle("Carte de visite — Arthur Lemeille, Lemeille Patrimoine")
    c.setAuthor(NOM)
    page(c, recto, apercu)
    c.showPage()
    modules = page(c, verso, apercu)
    c.showPage()
    c.save()
    return modules


def en_png(sources, dpi=600):
    """Rend les PDF en PNG 300 dpi.

    Les images sont RENDUES DEPUIS LE PDF, pas redessinées : la mise en page
    reste unique, et ce qui a été vérifié sur le PDF — dimensions, lisibilité
    du flashcode — vaut donc aussi pour les PNG.

    600 dpi par défaut. 300 est le minimum d'usage, mais cette carte porte du
    texte à 4,8 pt et un flashcode de 0,65 mm par module : à 300 dpi un module
    ne fait que 15 pixels, et les mentions réglementaires, 11. Doubler la
    résolution leur redonne de la marge, pour des fichiers qui restent légers.
    Réglable par --dpi.

    L'aperçu arrondi sort sur fond TRANSPARENT : il se pose tel quel sur un
    site ou dans une signature.
    """
    try:
        import pypdfium2 as pdfium
    except ImportError:
        print("  (PNG non générés : pypdfium2 absent — pip3 install pypdfium2)")
        return []
    ecrits = []
    for nom, apercu in sources:
        doc = pdfium.PdfDocument(nom)
        fond_png = (255, 255, 255, 0) if apercu else (255, 255, 255, 255)
        for i, face in enumerate(("recto", "verso")):
            img = doc[i].render(scale=dpi / 72, fill_color=fond_png).to_pil()
            base = nom[:-4] + f"-{face}-{dpi}dpi.png"
            # La résolution est INSCRITE dans le fichier. Sans elle, un logiciel
            # de mise en page suppose 72 dpi et croit la carte large de 38 cm ;
            # l'imprimeur la place alors à la mauvaise échelle.
            img.save(base, dpi=(dpi, dpi))
            ecrits.append((base, img.size))
    return ecrits


def main():
    apercu_seul = "--apercu" in sys.argv[1:]

    sorties = []
    if not apercu_seul:
        sorties.append(("Carte-de-visite-Arthur-Lemeille.pdf", False))
    sorties.append(("Carte-de-visite-Arthur-Lemeille-apercu.pdf", True))

    for nom, apercu in sorties:
        modules = document(nom, apercu)
        quoi = "aperçu, coins déjà arrondis" if apercu else "impression, graphisme nu à fond perdu"
        print(f"écrit : {nom}  ({quoi})")

    if "--png" in sys.argv[1:]:
        args = sys.argv[1:]
        dpi = int(args[args.index("--dpi") + 1]) if "--dpi" in args else 600
        for nom, taille in en_png(sorties, dpi):
            print(f"écrit : {nom}  ({taille[0]}×{taille[1]} px, {dpi} dpi)")

    cote_mm = 28
    print(f"  carte {LARGEUR/mm:.0f} × {HAUTEUR/mm:.0f} mm, coins R{RAYON/mm:.0f} mm,"
          f" + {FOND_PERDU/mm:g} mm de fond perdu"
          f" → document {PAGE[0]/mm:g} × {PAGE[1]/mm:g} mm")
    print(f"  flashcode {modules}×{modules} modules sur {cote_mm} mm"
          f" — soit {cote_mm/(modules+6):.2f} mm par module")
    print(f"  destination : {URL}")


if __name__ == "__main__":
    main()
