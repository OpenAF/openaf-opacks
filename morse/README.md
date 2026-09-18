# Morse oPack

Load with `require("morse.js")`. `translateTo(text, mode)` and `translateFrom(code, mode)` support `human` (default) and `binary` modes. Punctuation and supported accented letters retain their dashes and round-trip in either mode.

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.
