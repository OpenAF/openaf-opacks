# Lanterna oPack

Ships the [Lanterna](https://github.com/mabe02/lanterna) terminal UI framework for use within OpenAF. Combine it with your
automations to build text-based dashboards, wizards, or data-entry forms that run in a console.

## Installation

```bash
opack install lanterna
```

## Quick example

```javascript
loadExternalJars(getOPackPath("lanterna"));

var terminal = new Packages.com.googlecode.lanterna.terminal.DefaultTerminalFactory().createTerminal();
var screen = new Packages.com.googlecode.lanterna.screen.TerminalScreen(terminal);
screen.startScreen();
// build your GUI using Lanterna classes
```

The package only provides the JAR and a sample script; you can use the full Lanterna API to assemble multi-window interfaces,
message dialogs, and interactive components.
