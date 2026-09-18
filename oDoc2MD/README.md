# oDoc2MD oPack

Load `odoc2md.js` to render OpenAF documentation using Handlebars template files. The optional translation map can be omitted from `id2MD`; the original documentation ID is then used.

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.
