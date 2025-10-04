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
