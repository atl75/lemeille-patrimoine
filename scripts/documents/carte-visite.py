#!/usr/bin/env python3
"""
Cartes de visite — Arthur Lemeille, Lemeille Patrimoine.

Format français 85 × 55 mm, avec 3 mm de fond perdu sur chaque bord : la page
mesure donc 91 × 61 mm et l'imprimeur rogne au trait de coupe. Les aplats de
couleur débordent volontairement jusqu'au bord de page, faute de quoi un
rognage légèrement décalé laisserait un liseré blanc.

Deux pages : recto (identité et coordonnées) puis verso (flashcode).

LE FLASHCODE EST VECTORIEL. Les modules sont tracés en rectangles PDF plutôt
qu'importés en image : à l'impression, un QR en pixels bave sur les bords et
devient capricieux à scanner. Ici il reste net à n'importe quelle résolution.

L'URL porte des paramètres UTM : les visites venues des cartes apparaîtront
sous « carte-visite » dans les statistiques, séparées du reste du trafic.

    python3 scripts/documents/carte-visite.py
    python3 scripts/documents/carte-visite.py --sans-traits   (sans repères de coupe)
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
FOND_PERDU = 3 * mm
PAGE = (LARGEUR + 2 * FOND_PERDU, HAUTEUR + 2 * FOND_PERDU)
# Origine de la carte rognée dans la page : tout se positionne par rapport à
# elle, le fond perdu n'étant qu'une marge sacrificielle.
X0, Y0 = FOND_PERDU, FOND_PERDU
MARGE = 6 * mm   # zone de sécurité : aucun texte plus près du bord rogné


def fond(c, couleur):
    """Aplat couvrant TOUTE la page, fond perdu compris."""
    c.setFillColorRGB(*couleur)
    c.rect(0, 0, PAGE[0], PAGE[1], fill=1, stroke=0)


def traits_de_coupe(c):
    """Repères de rognage, hors de la zone imprimée."""
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.25)
    lg = 2 * mm
    for x in (X0, X0 + LARGEUR):
        for y in (0, Y0 + HAUTEUR):
            c.line(x, y, x, y + lg if y == 0 else y + lg)
    for y in (Y0, Y0 + HAUTEUR):
        for x in (0, X0 + LARGEUR):
            c.line(x, y, x + lg, y)


def monogramme(c, cx, cy, rayon, couleur_trait, couleur_texte):
    """Le « LP » cerclé du logo (public/logo.svg), redessiné en vectoriel."""
    c.setStrokeColorRGB(*couleur_trait)
    c.setLineWidth(rayon * 0.075)
    c.circle(cx, cy, rayon, fill=0, stroke=1)
    c.setFillColorRGB(*couleur_texte)
    taille = rayon * 0.85
    c.setFont("Times-Roman", taille)
    c.drawCentredString(cx, cy - taille * 0.34, "LP")


def recto(c, traits):
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

    if traits:
        traits_de_coupe(c)


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


def verso(c, traits):
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

    if traits:
        traits_de_coupe(c)
    return modules


def main():
    traits = "--sans-traits" not in sys.argv[1:]
    nom = "Carte-de-visite-Arthur-Lemeille" + ("" if traits else "-sans-traits") + ".pdf"

    c = canvas.Canvas(nom, pagesize=PAGE)
    c.setTitle("Carte de visite — Arthur Lemeille, Lemeille Patrimoine")
    c.setAuthor(NOM)
    recto(c, traits)
    c.showPage()
    modules = verso(c, traits)
    c.showPage()
    c.save()

    cote_mm = 28
    print(f"écrit : {nom}")
    print(f"  format {LARGEUR/mm:.0f} × {HAUTEUR/mm:.0f} mm + {FOND_PERDU/mm:.0f} mm de fond perdu"
          f" (page {PAGE[0]/mm:.0f} × {PAGE[1]/mm:.0f} mm)")
    print(f"  flashcode {modules}×{modules} modules sur {cote_mm} mm"
          f" — soit {cote_mm/(modules+6):.2f} mm par module")
    print(f"  destination : {URL}")


if __name__ == "__main__":
    main()
