# Terraform oPack

Utilities to parse and generate HashiCorp Configuration Language (HCL) from OpenAF using the `hcl4j` parser. The toolkit eases
integration with Terraform by allowing automations to read existing configuration files, manipulate them as JavaScript objects,
and write the result back to disk.

## Installation

```bash
opack install Terraform
```

## Sample workflow

```javascript
loadLib("terraform.js");

var tf = new Terraform();
var config = tf.fromHCL(io.readFileString("main.tf"));
config.resource.aws_s3_bucket.example.tags.Environment = "ci";
io.writeFileString("main.tf", tf.toHCL(config));
```

The companion `hcl.js` and `oafp_Terraform.js` files also expose helper commands to transform data structures to HCL from the
command line (`oafp libs=Terraform`). Use whichever entrypoint fits your automation style.
