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