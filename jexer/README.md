# jexer oPack

Bundles the [Jexer](https://gitlab.com/klamonte/jexer) text-mode UI toolkit so that OpenAF automations can present terminal user
interfaces. The package exposes a lightweight wrapper that boots a `TApplication` with sensible defaults for XTerm-compatible
terminals.

## Installation

```bash
opack install jexer
```

## Usage

```javascript
loadLib("jexer.js");

(new TApplication())
  .addDefaults() // adds File/Tool/Window menus
  .run();
```

From there you can use the standard Jexer APIs to add windows, forms, and dialogs. The oPack handles loading the JAR on demand so
your scripts can stay focused on UI flow.
