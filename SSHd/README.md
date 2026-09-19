# SSHd oPack

Launch an embeddable SSH server using Apache MINA SSHD straight from OpenAF. Ideal for exposing temporary administrative shells,
secure tunnels, or file operations that need to run within automation jobs.

## Installation

```bash
opack install SSHd
```

## Example

```javascript
loadLib("sshd.js");

var server = new SSHd(2222);
server.setPasswordAuthenticator((user, pass, session) => user === "demo" && pass === "demo");
server.start();
println("SSHd listening on port 2222");
```

The helper exposes methods to configure password/public-key authentication, customise shell/command factories, and generate server
keys. Call `server.stop()` to shut the listener down when the automation finishes.

## Corrections (2026-09-18)

Password authentication rejects all passwords unless `setPasswordAuthenticator` is explicitly configured. The default authorized-keys authenticator remains available. `genServerCert(path)` configures the bundled host-key provider; the key is generated when the server uses it. `setShellFactoryCmd` uses the bundled shell factory class.

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.
