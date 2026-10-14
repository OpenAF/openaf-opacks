# oJobIO

Generic service to provide easy-to-access oJobs for daily routines.

## How to deploy

````bash
docker build --no-cache --build-arg NAME=oJob.mydomain --build-arg PROTO=http --build-arg URL=oJob.mydomain -t ojobdomain .
docker run -d -p 8088:8088 --rm ojobdomain 
````

Build arguments:

| Build argument | Description |
|----------------|-------------|
| NAME | Service name to use. |
| PROTO | Protocol to generate URLs (http/https). |
| URL | A valid and existing DNS domain to access this service. |

## How to access

To access you just need to execute: 

````bash
ojob http://ojob.mydomain:8088
````

Then you can start writing a category or name and/or hit tab for auto-complete for the available jobs under that site.

If the corresponding ojob has parameters they will be asked. Aftewards it will provide you the full command-line to execute the same command without the interactive interface and proceed to execute the selected ojob with the provided arguments.

### Command-line examples

Set the environment variable to allow access to your domain besides the default ojob.io:

````
OJOB_AUTHORIZEDDOMAINS=ojob.io,ojob.mydomain
````

#### Hello world:
````bash
ojob http://ojob.mydomain:8088/hello/world
````

## How to control the output

For jobs following the standard output practice you can add an extra argument, "\_\_format", to force the output to be presented in a different way:

### For list/array results

  * CSV   - \_\_format=csv for csv like format.
  * YAML  - \_\_format=yaml for output in yaml.
  * JSON  - \_\_format=json for output in json.
  * MAP   - \_\_format=map for output in a map tabular human-readable form.
  * TABLE - \_\_format=table for output in a table human-readable form.
  * PM    - \_\_format=pm for output into a global variable __pm._list. 

### For map/object results
 
  * YAML  - \_\_format=yaml for output in yaml.
  * JSON  - \_\_format=json for output in json.
  * MAP   - \_\_format=map for output in a map tabular human-readable form.
  * PM    - \_\_format=pm for output into a global variable __pm._map. 

### For string results

  * HUMAN - \_\_format=human for output in the raw human-readable representation.
  * PM    - \_\_format=pm for output into a global variable __pm.result.

## Interactive launcher

On OpenAF runtimes with `askConsole`, `askKey`, injected argument prompts, and
ANSI-aware string clipping/padding, the index opens an inline searchable browser.
Type words to match the full job path and description. Use arrows, Page Up/Down,
Home/End, and Enter to review a job. Tab opens All jobs, Categories, Favorites,
and Recent jobs. Escape clears the search, returns to All jobs, then exits;
Ctrl-C exits. The list adapts to terminal size and leaves other scrollback intact.

Review shows the current job help and expected arguments. Choose **Configure and
run**, fill arguments (mandatory values are marked `(*)`), then review the command
and choose **Run**, **Edit arguments**, **Back**, or **Cancel**. Blank text input
keeps a supplied/current value; otherwise it omits an optional argument. Choice
and multiple-choice arguments use OpenAF prompts; secret arguments are masked.
The command preview is quoted for a POSIX shell, or PowerShell on Windows, and is
labelled when secrets are masked. Execution runs one job and exits.

The launcher uses an independent controlling terminal and closes it before job
execution, preserving piped stdin and normal job output. Older runtimes or
terminals without the required capabilities automatically use the original
TAB-completed launcher. To force that interface:

```sh
ojob https://ojob.mydomain ui=legacy
```

Use `ui=auto` (the default) to select automatically. `ui` is a launcher option and
is not passed to the selected job. Existing `list=true` and `search=...` commands
retain their URL-array output.

Favorites and the latest 20 distinct launched jobs are stored in
`~/.<service-domain>/launcher-state.json` (colons in the domain become underscores).
Only job identifiers are saved, never argument values. Unavailable saved jobs can
be removed from Favorites or Recent jobs. State read/write failures are nonfatal.

Builds embed `launcher.js` into `index.json`; clients need no additional script.
The optional `init.catalog` array adds job identifiers, paths, categories, and help
descriptions alongside the existing `init.l` URL array. Rebuild the service/image
to publish launcher changes. Descriptions reflect build-time help; review and
argument entry use the selected job's current help, including legacy `Help` jobs.

### Validation

Run `node tests/launcher.test.js` for deterministic discovery, configuration,
cancellation, compatibility, persistence, and execution checks. Interactive
validation can be run with
`python3 tests/terminal.py /path/current/openaf.jar /path/older/openaf.jar`. It
also requires a controlling terminal and an OpenAF runtime containing
the APIs above; test both automatic and `ui=legacy` modes. No infrastructure or
credentials are needed when using local fixture jobs. Remote jobs still need
network access and any prerequisites documented by the job.
