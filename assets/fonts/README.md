# Fonts

| File | Family | License |
|---|---|---|
| `fredoka-latin.woff2` | Fredoka (variable, weight 300–700) | SIL Open Font License 1.1 |
| `rubik-latin.woff2` | Rubik (variable, weight 300–900) | SIL Open Font License 1.1 |

Both are the latin subset, downloaded from Google Fonts (`fonts.gstatic.com`).

The game loads them from `css/fonts.css`, which embeds each file as base64. That
is deliberate: Chrome refuses font file requests over `file://`, and the game has
to work when `index.html` is double-clicked.

To refresh them, re-run the download and generate commands in
`docs/superpowers/plans/2026-09-11-iteration-3-art-pass.md`, Task 1.
