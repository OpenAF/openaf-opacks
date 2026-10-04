# Rust

## Usage

The following YAML oJob definition defines an _'example'_ job the will be invoked 3 times in parallel executing the provided rust code. Since the code for the 3 executions is equal, with no templating applied, the compiled binary will be reused for faster execution.

The JSON stdout output will be merged with the existing _args_.

````yaml
include:
- rust.yaml

todo: 
- name: example
  args:
  - abc: 1
  - abc: 2
  - abc: 3

jobs: 
- name: example
  lang: rust
  typeArgs:
    noTemplate: true
  to  :
  - ojob output
  exec: |
    use std::env;

    fn main() {
      let var = "abc";
      match env::var(var) {
          Ok(val) => println!("{{\"msg\":{:?}}}", val),
          Err(e) => println!("couldn't interpret {}: {}", var, e),
      }
    }
````

## Install Rust on openaf/oaf

Sequence of commands to install the rust compiler on the openaf/oaf Alpine image:

````
sudo sh
apk add gcc
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
opack install Rust
````

## Runtime options and lifecycle

Requires OpenAF 20261004 or newer and an installed `rustc`. No compiler or crate is downloaded automatically.

`typeArgs.langExecutable` chooses the compiler; `langExecutableArgs` is an array of compiler flags. `pwd` selects the compiler and program working directory. `langTimeout` is a positive timeout in milliseconds shared by the compiler probe, compilation-lock wait, compilation and execution; absent means unlimited execution. The compiler availability probe is limited to five seconds. Existing `noTemplate`, environment input and JSON stdout output conventions remain unchanged. JSON results are merged only after a successful exit; plain stdout remains logging.

The process-local cache is synchronized and keyed by source, resolved compiler path, compiler version, flags and working directory. Failed builds are never cached. Source files are removed after compilation, and cached binaries are removed when oJob stops (or the JVM exits). Independent processes have independent caches. Local process timeouts terminate tracked descendants; OS process-enumeration restrictions and deliberately detached processes limit this guarantee.

Run `java -jar /path/to/openaf.jar -f tests/regression.js` from this directory to check argument exchange, reuse, concurrency, failed builds, timeout and cleanup.
