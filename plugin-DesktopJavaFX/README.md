# plugin-DesktopJavaFX

Optional JavaFX WebView provider for `ow.desktop`. JavaFX never enters the OpenAF
JVM: one owned helper uses the module path and exits on parent-pipe EOF. Ordinary
OpenAF/headless installations have no JavaFX dependency or new startup flags.

Requires an OpenAF build containing `ow.loadDesktop`, Java 21+ for OpenAF, and a
helper JVM containing `jdk.jsobject` (Java 21 through 25). JavaFX is pinned to
21.0.12. The adapter reports a clear error when the current JVM is incompatible;
configure another helper without changing the application's API:

```javascript
ow.loadDesktop({ provider: "javafx",
  providerOptions: { javafx: { java: "/path/to/java21/bin/java" } } });
```

## Installation and source build

```sh
opack install plugin-DesktopJavaFX
```

The install hook downloads only the current platform's five JavaFX modules and
verifies `javafx-lock.json` SHA-256 hashes. It never runs at window creation time.
For offline installation set `OPENAF_DESKTOP_ARTIFACTS` to a directory containing
all five pinned classifier JARs. JavaFX files live in ignored `lib/<classifier>`;
only the small provider JAR is distributed in the oPack.

To build this package from source, use an OpenAF runtime with a JDK (21+):

```sh
cd plugin-DesktopJavaFX
openaf -c 'require("./install.js").install(".");'
ojob compile.yaml
opack genpack . --exclude lib,.cache,classes
```

Compilation uses `--release 21`. OpenAF itself is built with its existing JDK 24+
requirements. No new core Maven dependency, JavaFX Maven plugin, FXML, Swing,
Node.js or frontend framework is required. Gson comes from the OpenAF JAR.

Locked classifiers: `win` (x64), `mac` (x64), `mac-aarch64`, `linux` (x64), and
`linux-aarch64`. This is an artifact availability matrix, not evidence of native
execution on all five platforms. Linux needs the JavaFX-compatible GTK/system
libraries and a display (X11 or a supported desktop environment). Windows ARM64
and Linux musl are not advertised as supported. Native dependencies are never
selected solely by Java's word size.

## Usage

```javascript
ow.loadDesktop();
var win = ow.desktop.window({ title: "Example", html: "<h1>Hello</h1>" });
win.show();
ow.desktop.wait();
```

Run `examples/hello.js` for a rooted HTML application that receives a button click,
returns a status update, and closes cleanly. Set the working directory to this
package before running it. Use explicit `wait()` for standalone scripts; running
oJobs own their lifetime. `shutdown()` closes only this session's resources.

Commands/dialogs return OpenAF oPromises. Window/application events contain JSON
only. See OpenAF `docs/desktop.md` and `docs/dev/desktop-providers.md` for the stable
API, provider SPI, protocol, security model, Electron mapping, and installer design.

## Security and limitations

The renderer receives no Java/OpenAF object bridge. Messaging is explicitly opted
in for application-owned hosted HTML/files with declared message types and
optional JSON schemas. Remote URLs receive no messaging authority. Popups and
webpage prompts are disabled. Navigation revokes bridge credentials.

The core reuses its HTTPServer/NWU2 implementation for authenticated loopback assets
and WebSockets. Host/Origin, per-window tokens, message IDs, size, sequence, type,
and optional schemas are checked. Rooted file serving rejects traversal/symlink
escape. The helper receives no application messages through arbitrary Java method
calls. Process launching uses argument arrays, never a shell string.

JavaFX is not a sandbox for hostile webpages or a comprehensive navigation/network
firewall. These capabilities are false and strict requests fail. WebKit behavior
and available web APIs differ from Chromium; test the actual application. A helper
process runs with the user's permissions. Same-origin scripts share any explicitly
granted application messaging authority.

Deferred: notifications, tray, fullscreen/modal application windows, GUI admin
embedding, Electron implementation, Node dependencies, and standalone installers.

## Tests and benchmarks

```sh
# Provider-independent contracts are in the OpenAF repository:
cd ../openaf/tests
java -jar ../openaf.jar --ojob -e autoTestAll.Desktop.yaml

# From this package; GUI tests are explicitly opted in and bounded:
OPENAF_DESKTOP_TEST_GUI=1 ojob tests/autoTestAll.DesktopJavaFX.yaml
```

Set `OPENAF_DESKTOP_JAVA` to select a compatible helper during tests. Tests that
need a display print an explicit skip unless opted in; no passing mock count
constitutes display proof. Integration windows close automatically. Each runner
has deadlines and cleans up its owned helper.

`tests/probe.yaml` checks availability and Java/runtime module requirements.
`tests/benchmark.yaml` measures actual startup/first-window/messaging/multiple-window
and shutdown timings, plus RSS where supported. Run it on each target platform;
compare parent+helper memory with an identified external-browser process set.
Do not compare JVM heap alone with browser RSS. No installer or benchmark numbers
are assumed by the API.
