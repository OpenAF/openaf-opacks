# plugin-GIT oPack

Provides an OpenAF plugin wrapping [JGit](https://www.eclipse.org/jgit/) so that repositories can be cloned, checked out, and
managed from scripts. It supports initialising repositories, pushing/pulling with credentials, and inspecting status information.

## Installation

```bash
opack install plugin-GIT
```

## Example

```javascript
plugin("GIT");
var git = new GIT("/tmp/repo", "user", "token");
git.clone("https://github.com/example/repo.git", "/tmp/repo", true, null, "user", "token");
cprint(git.status());
```

The plugin exposes the major JGit commands (clone, fetch, checkout, commit, push, etc.) via a JavaScript-friendly API. Use it to
automate repository maintenance or integrate Git operations into CI/CD oJobs.
