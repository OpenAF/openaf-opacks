# GoogleCompiler oPack

Packages the Google Closure Compiler so you can minify and transpile JavaScript assets directly from OpenAF. The oPack exposes a
simple wrapper that selects the appropriate compiler JAR for the running Java version and forwards options to the Closure CLI.

## Installation

```bash
opack install GoogleCompiler
```

## Usage

```sh
opack exec GoogleCompiler --js hello.js --js_output_file hello-compiled.js
```

See the Closure Compiler [flag reference](https://github.com/google/closure-compiler/wiki/Flags-and-Options) for all supported
options. The wrapper simply prepares the process invocation, making it easy to embed into build oJobs.

The wrapper reads the newer compiler's class-file Java requirement and falls back
to the bundled legacy compiler (Java 11 minimum) on older runtimes. The repository Maven updater
refreshes `compiler11.jar` and preserves the legacy `compiler.jar` unchanged.
