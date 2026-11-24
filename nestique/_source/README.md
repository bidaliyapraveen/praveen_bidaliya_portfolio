# Nestique site source

The live site is the built files in the parent `nestique/` folder (served at praveenbidaliya.com/nestique/).
This folder is not published (GitHub Pages skips folders starting with `_`).

To update: edit `data/stays.json` (stay details, prices, photos), then run `node build.mjs`
and copy the contents of `dist/` into `nestique/`.

Photos go in `photos/<stay-slug>/` and are listed in each stay's `images` array (first = cover).
Booking and contact forms are emailed to the Nestique inbox through FormSubmit (formsubmit.co).
