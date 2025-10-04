# plugin-SMB oPack

OpenAF plugin to access SMB/CIFS (Windows file sharing) resources using the jcifs-ng library. It provides convenient wrappers to
list, read, and write files on remote shares directly from automations.

## Installation

```bash
opack install plugin-SMB
```

## Example

```javascript
Plugins.load("SMB");
var smb = new SMB("smb://fileserver/share", "DOMAIN\\user", "password");
print(smb.list("/"));
smb.copyTo("/reports/monthly.xlsx", "./monthly.xlsx");
```

The plugin supports authenticated access (including domain notation) and relies on BouncyCastle for modern security defaults. Use
it to orchestrate file exchanges with legacy Windows services without shelling out to external tools.
