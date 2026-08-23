# Ekoway Redesign Round 2

Two isolated visual-direction slices for the owner-selection gate. They read the repository's
real `catalogue.json` at runtime and do not import or modify production React or CSS.

- `direction-a/` — Product Theatre
- `direction-b/` — Technical Atelier

Serve the repository root over HTTP so both pages can fetch `/catalogue.json`.

