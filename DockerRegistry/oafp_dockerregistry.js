;(function() {
    loadLib("dockerRegistry.js")
    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            fileExtensions: [ ],
            input         : [ { 
                type: "registryrepos", 
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    aURL = params.inregistryurl
                    aLogin = params.inregistrylogin
                    aPass = params.inregistrypass

                    var dr = new DockerRegistry(aURL, aLogin, aPass)
                    if (toBoolean(params.inregistrytags)) {
                        _$o($path(dr.listRepositories().map(repo => {
                            var tags = dr.listTags(repo).tags
                            if (isArray(tags)) {
                                return tags.map(tag => ({ repo: repo, tag: tag }) )
                            } else {
                                return ({ repo: repo, tags: __ })
                            }
                        }), "[][]"), options)
                    } else {
                        _$o(dr.listRepositories(), options)
                    }
                }
            }, {
                type: "registrytags",
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    aURL = params.inregistryurl
                    aLogin = params.inregistrylogin
                    aPass = params.inregistrypass

                    var dr = new DockerRegistry(aURL, aLogin, aPass)
                    _$o(dr.listTags(r), options)
                }
            }, {
                type: "registrymanifest",
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    aURL = params.inregistryurl
                    aLogin = params.inregistrylogin
                    aPass = params.inregistrypass

                    var dr = new DockerRegistry(aURL, aLogin, aPass)
                    _$o(dr.getImage(r), options)
                }
            } ],
            output        : [ ],
            transform     : [ ],
            help          : 
`# DockerRegistry oafp lib

## ⬇️  DockerRegistry input types:

Extra input types added by the test lib:

| Input type | Description |
|------------|-------------|
| registryrepos | Registry repository list (usually only available for private registries) |
| registrytags | Registry repository tags list |
| registrymanifest | Registry repository tag image manifest |

---

## 🧾 RegistryRepos input options

List of options to use when _in=registryrepos_:

| Option | Type | Description |
|--------|------|-------------|
| inregistryurl  | String | The docker container registry compatible http/https URL (e.g. http://registry.local:5000) |
| inregistrylogin  | String | The registry login (if needed) |
| inregistrypass  | String | The registry password (if needed) |
| inregistrytags  | Boolean | If true, will also list the tags for each repository |

---

## 🧾 RegistryTags input options

List of options to use when _in=registrytags_:

| Option | Type | Description |
|--------|------|-------------|
| inregistryurl  | String | The docker container registry compatible http/https URL (e.g. http://registry.local:5000) |
| inregistrylogin  | String | The registry login (if needed) |
| inregistrypass  | String | The registry password (if needed) |

> **Note:** The repository name is passed as the input value.

---

## 🧾 RegistryManifest input options

List of options to use when _in=registrymanifest_:

| Option | Type | Description |
|--------|------|-------------|
| inregistryurl  | String | The docker container registry compatible http/https URL (e.g. http://registry.local:5000) |
| inregistrylogin  | String | The registry login (if needed) |
| inregistrypass  | String | The registry password (if needed) |

> **Note:** The repository name is passed as the input value.

`
        }

        return _r
    }
})()