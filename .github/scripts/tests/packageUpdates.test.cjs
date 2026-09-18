const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

const source = fs.readFileSync(path.join(__dirname, '../packageUpdates.js'), 'utf8')

function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'package-updates-'))
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }))
  function git(...args) {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout
  }
  function write(file, content) {
    fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true })
    fs.writeFileSync(path.join(cwd, file), content)
  }
  git('init', '-q')
  for (const folder of ['ghcopilot', 'jdbc-test', 'unrelated']) {
    write(folder + '/.package.yaml', "version: '20260101'\n")
    write(folder + '/driver.jar', 'original bytes')
    write(folder + '/wrapper.js', '// original wrapper')
    write(folder + '/LICENSES.txt', 'original license report')
  }
  git('add', '.')
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'baseline')
  const context = vm.createContext({
    $sh: args => ({ get: () => {
      const result = spawnSync(args[0], args.slice(1), { cwd, encoding: 'utf8' })
      return { exitcode: result.status, stdout: result.stdout, stderr: result.stderr }
    } })
  })
  vm.runInContext(source, context)
  return { cwd, git, write, updates: context.packageUpdates }
}

test('identical downloads and date-only changes do not count as payload', t => {
  const { write, updates } = fixture(t)
  write('ghcopilot/driver.jar', 'original bytes')
  assert.equal(updates.hasPayloadChanges('ghcopilot'), false)
  write('ghcopilot/.package.yaml', "version: '20260918'\n")
  assert.equal(updates.hasPayloadChanges('ghcopilot'), false)
})

test('detects same-name binary changes, including staged changes', t => {
  const { write, git, updates } = fixture(t)
  write('ghcopilot/driver.jar', 'different bytes')
  assert.equal(updates.hasPayloadChanges('ghcopilot'), true)
  git('add', 'ghcopilot/driver.jar')
  assert.equal(updates.hasPayloadChanges('ghcopilot'), true)
})

test('detects added files with spaces and nested paths', t => {
  const { write, updates } = fixture(t)
  write('ghcopilot/nested/new driver.jar', 'new bytes')
  assert.equal(updates.hasPayloadChanges('ghcopilot'), true)
})

test('detects removed dependencies', t => {
  const { cwd, updates } = fixture(t)
  fs.unlinkSync(path.join(cwd, 'ghcopilot/driver.jar'))
  assert.equal(updates.hasPayloadChanges('ghcopilot'), true)
})

test('restores JDBC manifest-only and manifest-plus-license churn', t => {
  const { write, git, updates } = fixture(t)
  write('jdbc-test/.package.yaml', "version: '20260918'\n")
  updates.restoreUnchangedJdbc('jdbc-test')
  assert.equal(git('status', '--porcelain'), '')
  write('jdbc-test/.package.yaml', "version: '20260918'\n")
  write('jdbc-test/LICENSES.txt', 'regenerated license report')
  git('add', 'jdbc-test')
  updates.restoreUnchangedJdbc('jdbc-test')
  assert.equal(git('status', '--porcelain'), '')
})

test('preserves a genuine single-file JDBC change', t => {
  const { write, git, updates } = fixture(t)
  write('jdbc-test/wrapper.js', '// corrected wrapper')
  const before = git('diff')
  updates.restoreUnchangedJdbc('jdbc-test')
  assert.equal(git('diff'), before)
  assert.notEqual(before, '')
})

test('preserves JDBC upgrades and new packages', t => {
  const { cwd, write, git, updates } = fixture(t)
  fs.unlinkSync(path.join(cwd, 'jdbc-test/driver.jar'))
  write('jdbc-test/new-driver.jar', 'new version')
  write('jdbc-test/.package.yaml', "version: '20260918'\n")
  write('jdbc-test/LICENSES.txt', 'updated licenses')
  write('jdbc-new/driver.jar', 'new driver')
  write('jdbc-new/.package.yaml', "version: '20260918'\n")
  const before = git('status', '--porcelain', '--untracked-files=all')
  updates.restoreUnchangedJdbc('jdbc-test')
  updates.restoreUnchangedJdbc('jdbc-new')
  assert.equal(git('status', '--porcelain', '--untracked-files=all'), before)
})

test('does not include or restore other packages', t => {
  const { write, git, updates } = fixture(t)
  write('unrelated/driver.jar', 'user changes')
  const before = git('diff')
  write('jdbc-test/.package.yaml', "version: '20260918'\n")
  assert.equal(updates.hasPayloadChanges('ghcopilot'), false)
  updates.restoreUnchangedJdbc('jdbc-test')
  assert.equal(git('diff'), before)
})

test('Git failures abort rather than being interpreted as no changes', () => {
  const context = vm.createContext({
    $sh: () => ({ get: () => ({ exitcode: 128, stdout: '', stderr: 'fatal: invalid repository' }) })
  })
  vm.runInContext(source, context)
  assert.throws(() => context.packageUpdates.hasPayloadChanges('ghcopilot'), /git check failed/)
})
