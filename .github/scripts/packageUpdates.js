// Run from the repository root after dependency generation in a clean CI checkout.
var packageUpdates = (function() {
  function git(args) {
    var result = $sh([ "git" ].concat(args)).get(0)
    if (result.exitcode !== 0) throw new Error("Package update git check failed: " + result.stderr)
    return result.stdout
  }

  function paths(args) {
    return git(args).split("\0").filter(function(path) { return path.length > 0 })
  }

  function changedFiles(folder) {
    return paths([ "diff", "--name-only", "--no-renames", "-z", "HEAD", "--", folder + "/" ])
      .concat(paths([ "ls-files", "--others", "--exclude-standard", "-z", "--", folder + "/" ]))
  }

  function hasPayloadChanges(folder, generatedFiles) {
    var ignored = (generatedFiles || [ ".package.yaml" ]).map(function(file) { return folder + "/" + file })
    return changedFiles(folder).some(function(file) { return ignored.indexOf(file) < 0 })
  }

  function restoreUnchangedJdbc(folder) {
    // License reports are generated on every build; retain the existing workflow's
    // policy of publishing them only together with a driver or wrapper change.
    var generated = [ ".package.yaml", "LICENSES.txt" ]
    if (hasPayloadChanges(folder, generated)) return
    var changed = changedFiles(folder)
    generated.forEach(function(file) {
      var path = folder + "/" + file
      if (changed.indexOf(path) < 0) return
      // Restore only tracked generated files, never an entire package directory.
      if (paths([ "ls-files", "-z", "--", path ]).length > 0) {
        git([ "restore", "--source=HEAD", "--staged", "--worktree", "--", path ])
      }
    })
  }

  return { hasPayloadChanges: hasPayloadChanges, restoreUnchangedJdbc: restoreUnchangedJdbc }
})()
