# YugabyteDB JDBC oPack

The bundled driver is `com.yugabyte.Driver`, registered for `jdbc:yugabytedb:`.

```javascript
loadLib("jdbc-yugabytedb.js");
var db = DByugabytedb("jdbc:yugabytedb://localhost:5433/database", "user", "password");
```

Use the YugabyteDB URL scheme. The bundled driver does not accept `jdbc:postgresql:` URLs.

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.
