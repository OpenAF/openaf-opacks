# plugin-SVN oPack

Provides an OpenAF plugin built on top of [SVNKit](https://svnkit.com/) so Subversion repositories can be automated alongside
other tasks. Ideal for environments that still rely on SVN but want to orchestrate operations through OpenAF.

## Installation

```bash
opack install plugin-SVN
```

## Example

```javascript
plugin("SVN");
var svn = new SVN("https://svn.example.com/repos/project", "user", "pass");
svn.checkout("trunk", "/tmp/project");
cprint(svn.list("trunk"));
```

The plugin includes both `svnkit` and `svnkit-cli` so you can perform common commands like checkout, update, commit, and branch
management without shelling out to native binaries.
