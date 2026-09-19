# APIs oPack

Public REST API helpers loaded with `require("apis.js")`.

Coordinate-based OpenMeteo and SunRiseSet calls retain explicit latitude and longitude, including zero. OpenMeteo translates every code in each documented weather-code group.

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.
