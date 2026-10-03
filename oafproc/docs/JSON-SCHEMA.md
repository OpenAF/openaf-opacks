# JSON Schema

Validate an input map against a schema file, or obtain the schema from a command that prints JSON:

```sh
oafp in=json file=data.json jsonschema=schema.json out=json
oafp in=json file=data.json jsonschemacmd="cat schema.json" out=json
```

Use one schema source per invocation. Validation supports input maps and schema maps. Successful validation returns `{"valid":true,"errors":null}`. Invalid data returns `{"valid":false,"errors":[...]}` as ordinary output; it does not by itself cause a nonzero exit status. Invalid schemas, unsupported dialects, unresolved references and invalid options are command errors.

With OpenAF's Ajv 8 upgrade, errors are the compiled validator's raw Ajv v8 errors: `instancePath` is a JSON Pointer such as `/age`, alongside `schemaPath`, `keyword`, `params` and usually `message`. Consumers of the old `dataPath` or exact v6 message wording must adapt. Messages commonly use “must” instead of “should”.

## Options

`jsonschemaoptions` accepts a JSON or SLON map (or a map when calling `oafp(params)`):

```sh
oafp in=json file=data.json jsonschema=schema.json jsonschemaoptions='(format: full)' out=json
oafp in=json file=data.json jsonschema=schema.json jsonschemaoptions='{"allErrors":false,"strict":true}' out=json
```

Options are merged with `{allErrors:true}`; explicit values override it. Existing defaults remain: collect all errors, use fast format validation, allow non-strict schemas, and leave default insertion, type coercion and `$data` references disabled. To enable them explicitly, use `useDefaults:true`, `coerceTypes:true` or `$data:true`. Mutating options can change the input while validation runs, though the output remains the validation result.

OpenAF installs standard formats automatically. `format:full` selects full format checks; `format:false` disables format validation. Unknown formats normally cause a compilation error. OpenAF handles compatibility aliases for legacy Ajv options and rejects removed options with an explanation. See [OpenAF's JSON Schema guide](https://github.com/OpenAF/openaf/blob/master/docs/json-schema.md) for the supported API and compatibility details.

OpenAF initializes its schema engine once per process: the first `schemaInit` call wins. In a long-running process invoking `oafp(params)` repeatedly, choose consistent options before the first validation. Separate CLI invocations initialize independently.

## Schema drafts

On OpenAF with the Ajv 8 upgrade, the root `$schema` selects draft-07, draft-2019-09 or draft-2020-12. Omitting `$schema` uses draft-07. For example, save this as `schema.json` and validate `{"values":["first",2]}`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["values"],
  "properties": {
    "values": {
      "type": "array",
      "prefixItems": [{"type":"string"},{"type":"integer"}],
      "items": false
    }
  }
}
```

Older OpenAF runtimes do not gain newer draft support by updating oafp alone. Use canonical draft URIs; unsupported drafts fail rather than silently falling back. External references must already be registered in the OpenAF process; oafp does not fetch remote schemas automatically.

## Generation

```sh
# Infer a draft-07 schema from an example map
oafp in=json file=data.json jsonschemagen=true out=json
# Try to generate sample data from a schema map
oafp in=jsonschema file=schema.json out=json
```

`jsonschemagen` delegates to OpenAF's schema generator and continues to emit draft-07. `in=jsonschema` delegates to the sample generator, not Ajv validation. It is a best-effort generator and does not guarantee valid samples for all constraints or newer draft keywords. `jsonschemaoptions` applies only to validation with `jsonschema` or `jsonschemacmd`. Validate generated samples explicitly when correctness matters.

Read this guide locally with `oafp help=jsonschema` (or `out=raw` for plain Markdown).
