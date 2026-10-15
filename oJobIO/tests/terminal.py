#!/usr/bin/env python3
"""Generate and exercise the launcher using real OpenAF JARs and a POSIX PTY.
Usage: python3 tests/terminal.py /path/current/openaf.jar [/path/older/openaf.jar]
"""
import errno
import fcntl
import json
import os
from pathlib import Path
import pty
import select
import shutil
import struct
import subprocess
import sys
import tempfile
import termios
import time

root = Path(__file__).resolve().parents[1]
current = str(Path(sys.argv[1]).resolve())
older = str(Path(sys.argv[2]).resolve()) if len(sys.argv) > 2 else None


def session(jar, index, home, exchanges, expected, piped=False, extra=''):
    pid, fd = pty.fork()
    if pid == 0:
        if piped:
            rd, wr = os.pipe()
            os.write(wr, b'PIPE_UNTOUCHED')
            os.close(wr)
            os.dup2(rd, 0)
            os.close(rd)
        os.environ['TERM'] = 'xterm-256color'
        os.execvp('java', ['java', '--enable-native-access=ALL-UNNAMED', '-Duser.home=' + str(home),
                           '-jar', jar, '--ojob', '-e', str(index) + ' ' + extra])
    before = termios.tcgetattr(fd)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 100, 0, 0))
    data = b''
    pending = list(exchanges)
    offset = 0
    deadline = time.monotonic() + 25
    status = None
    try:
        while time.monotonic() < deadline:
            if select.select([fd], [], [], 0.05)[0]:
                try:
                    data += os.read(fd, 65536)
                except OSError as e:
                    if e.errno != errno.EIO:
                        raise
            if pending and pending[0][0].encode() in data[offset:]:
                marker, reply = pending.pop(0)
                offset = len(data)
                if reply == b'RESIZE':
                    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 15, 32, 0, 0))
                else:
                    os.write(fd, reply)
            done, result = os.waitpid(pid, os.WNOHANG)
            if done:
                status = result
                break
        assert status is not None, 'PTY timed out: ' + data.decode(errors='replace')[-3000:]
        assert not pending, 'Unseen prompts: ' + repr(pending) + '\n' + data.decode(errors='replace')[-3000:]
        assert os.waitstatus_to_exitcode(status) == 0, data.decode(errors='replace')[-3000:]
        for marker in expected:
            assert marker.encode() in data, marker + '\n' + data.decode(errors='replace')[-3000:]
        after = termios.tcgetattr(fd)
        assert (after[3] & (termios.ECHO | termios.ICANON)) == (before[3] & (termios.ECHO | termios.ICANON)), 'terminal attributes leaked'
        return data
    finally:
        if status is None:
            os.kill(pid, 9)
            os.waitpid(pid, 0)
        os.close(fd)


with tempfile.TemporaryDirectory(prefix='ojobio-check-') as tmp:
    work = Path(tmp)
    for name in ['rebuild.yaml', 'rebuild.hbs', 'launcher.js']:
        shutil.copy(root / name, work / name)
    shutil.copytree(root / 'imgs', work / 'imgs')
    output = work / '_output'
    output.mkdir()
    (output / 'hello').mkdir()
    (output / 'hello' / 'world.yaml').write_text('help:\n  text: Hello fixture\ntodo: []\n')
    (output / 'hello' / 'index.yaml').write_text('jobs:\n- name: Help\n  help:\n    text: Legacy fixture\n')
    # Avoid external documentation subprocesses; validate the build's catalog and embedded launcher.
    script = '''
      ow.loadTemplate(); ow.loadFormat(); ow.loadServer();
      var build = io.readFileYAML('rebuild.yaml');
      var finish = $from(build.jobs).equals('name', 'Finish output').at(0).exec;
      global.diff = [];
      // Documentation commands are outside this fixture's scope.
      finish = finish.replace('if (isDef(j) && isDef(j.jobs) &&', 'if (false && isDef(j) && isDef(j.jobs) &&');
      finish = finish.substring(0, finish.indexOf('io.rm(args.output)'));
      new Function('args', finish)({init: build.init, compile: false, URL: 'test.io', NAME: 'test.io'});
      var index = io.readFileJSON('_output/index.json');
      if (io.readFileString('_output/index') != io.readFileString('_output/index.json')) throw 'Static index files differ';
      index.jobs.forEach(function(job) { new Function('args', job.exec); });
      if (index.init.l.indexOf('https://test.io/hello/') < 0) throw 'Directory URL changed';
      if (!$from(index.init.catalog).equals('id', 'https://test.io/hello/').equals('description', 'Legacy fixture').any()) throw 'Legacy metadata missing';
      if (!$from(index.init.catalog).equals('id', 'https://test.io/hello/world.yaml').equals('description', 'Hello fixture').any()) throw 'Metadata missing';
      print('GENERATION_OK');
    '''
    generated = subprocess.run(['java', '-Duser.home=' + str(work), '-jar', current, '-c', script], cwd=work,
                               text=True, capture_output=True, timeout=30)
    assert 'GENERATION_OK' in generated.stdout, generated.stdout + generated.stderr
    index = json.loads((output / 'index.json').read_text())
    # A local job avoids network dependencies, and checks stdin remains available at execution.
    index['init']['l'] = []
    index['init']['catalog'] = []
    fixture = work / '.test.io' / 'ojobs'
    fixture.mkdir(parents=True)
    (fixture / 'fixture.yaml').write_text('''help:
  text: Terminal fixture
  expects:
  - name: value
    mandatory: true
todo:
- Run
jobs:
- name: Run
  exec: |
    print("JOB_VALUE=" + args.value);
    print("PIPE=" + af.fromInputStream2String(java.lang.System.in));
''')
    (fixture / 'noargs.yaml').write_text('help:\n  text: No arguments fixture\ntodo:\n- Run\njobs:\n- name: Run\n  exec: print("DECLINED_JOB_EXECUTED");\n')
    target = work / 'index.json' 
    target.write_text(json.dumps(index))
    session(current, target, work, [('Search:', b'\x03')], ['Search:'])
    session(current, target, work, [('Search:', b'RESIZE'), ('Search:', b'\x03')], ['Search:'])
    executed = session(current, target, work,
            [('Search:', b'\n'), ('Configure and run', b'\n'), ('value (*):', b'chosen\n'),
             ('Execution', b'\n')], ['JOB_VALUE=chosen', 'PIPE=PIPE_UNTOUCHED'], piped=True)
    assert ("ojob '" + str(fixture / 'fixture.yaml') + "' 'value=chosen'").encode() in executed, executed.decode(errors='replace')[-3000:]
    for unexpected in [b"'__id=", b"'execid=", b"'objId=", (str(target) + '=').encode()]:
        assert unexpected not in executed, executed.decode(errors='replace')[-3000:]
    declined = session(current, target, work,
                       [('>> test.io/', b'_local/noargs\n'), ('no arguments to fill out', b'\x1b[B\n')],
                       ['no arguments to fill out'], extra='ui=legacy')
    assert b'DECLINED_JOB_EXECUTED' not in declined, 'legacy decline executed the job'
    for jar in [current] + ([older] if older else []):
        extra = 'ui=legacy' if jar == current else ''
        session(jar, target, work, [('>> test.io/', b'\n'), ('>> test.io/', b'\n')], ['auto-complete'], extra=extra)
        listed = subprocess.run(['java', '-Duser.home=' + str(work), '-jar', jar, '--ojob', '-e', str(target) + ' list=true __format=json'], capture_output=True, text=True, timeout=20)
        assert '_local/fixture.yaml' in listed.stdout, listed.stdout + listed.stderr
        searched = subprocess.run(['java', '-Duser.home=' + str(work), '-jar', jar, '--ojob', '-e', str(target) + ' search=fixture __format=json'], capture_output=True, text=True, timeout=20)
        assert json.loads(searched.stdout.strip()) == ['_local/fixture.yaml'], searched.stdout + searched.stderr
print('Generation and PTY checks passed: current UI, resize, execution, piped stdin, terminal restoration, legacy fallback, list output')
