# BouncyCastle oPack

Extra Java [BouncyCastle](https://www.bouncycastle.org/java.html) cryptography algorithms packaged for OpenAF. Installing the oPack
adds the `bcprov`, `bcpkix`, and `bcutil` JARs to the runtime so that OpenAF automations can use newer TLS ciphers and PKI helpers
without needing to manage the classpath manually.

## Installation

```bash
opack install BouncyCastle
```

## Usage

After installation you can rely on BouncyCastle classes directly from OpenAF scripts. For example the snippet below loads a PEM
certificate and prints the public key algorithm:

```javascript
loadExternalJars(getOPackPath("BouncyCastle"));

var pemReader = new Packages.org.bouncycastle.openssl.PEMParser(
  io.readFileReader("server.crt")
);
var certHolder = pemReader.readObject();
println(certHolder.getSubjectPublicKeyInfo().getAlgorithm().getAlgorithm());
```

Use this oPack whenever you need access to BouncyCastle primitives such as PKCS#12 parsing, certificate utilities, or extended TLS
cipher suites inside OpenAF.
