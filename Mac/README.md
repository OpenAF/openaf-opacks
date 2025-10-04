# Mac oPack

Utilities for working with macOS features from OpenAF. The bundle includes helpers for interacting with the native `say` command
and converting Apple property list (plist) files to and from JavaScript objects using the dd-plist library.

## Installation

```bash
opack install Mac
```

## Features

* `macSay(message, voice, quiet)` — invoke the system speech synthesizer from scripts.
* `af.fromPList(...)` / `af.toPList(...)` — convert between plist content and JavaScript objects/strings.
* `io.readFilePList(...)` / `io.writeFilePList(...)` — load and persist plist files in XML or binary formats.

## Example

```javascript
loadLib("mac.js");

macSay("Automation complete", "Samantha");
var plist = io.readFilePList("Settings.plist");
plist.LastRun = new Date();
io.writeFilePList("Settings.plist", plist);
```

These helpers remove the boilerplate needed to work with macOS configuration files when orchestrating local automations.
