# adavan.fr — Adavan Photographie

Site vitrine statique (HTML/CSS/JS, sans dépendance), hébergé sur GitHub Pages avec le domaine `adavan.fr` (fichier `CNAME`).

## Structure

```
index.html              page d'accueil
mentions-legales.html   mentions légales et confidentialité
assets/css/style.css    styles (couleurs de la charte en haut du fichier)
assets/js/main.js       interactions : hero, parallaxe, histoires, filtres, visionneuse, formulaire
assets/fonts/           Urbanist + Newsreader auto-hébergées (pas d'appel à Google Fonts)
assets/img/             logos (noir, blanc, fond ivoire)
photos/<catégorie>/     chaque photo existe en 2 tailles : -900.jpg et -1800.jpg
```

## Ajouter une photo au portfolio

1. Exporter la photo en deux tailles (côté le plus long) : 900 px et 1800 px, JPEG qualité ~78.
2. Les nommer `nom-900.jpg` et `nom-1800.jpg` et les déposer dans `photos/mariages`, `photos/portraits` ou `photos/events`.
3. Dans `index.html`, dupliquer un bloc `<figure class="tile">` dans la section Portfolio et adapter :
   - `data-cat` : `mariage`, `portrait` ou `evenement`
   - `data-full` : chemin de la version 1800
   - `data-caption` : légende affichée dans la visionneuse
   - `src`, `srcset` (largeurs réelles des fichiers), `width`/`height` et le texte `alt`

Les compteurs des filtres et le bouton « Afficher les photos suivantes » se mettent à jour tout seuls.

## Formulaire

Envoi via Formspree (`https://formspree.io/f/mldqlwwb`) sans rechargement de page. Pour changer d'adresse de réception, c'est dans le tableau de bord Formspree.

## Mise en ligne

Pousser sur la branche publiée par GitHub Pages. Le fichier `CNAME` doit rester à la racine.
