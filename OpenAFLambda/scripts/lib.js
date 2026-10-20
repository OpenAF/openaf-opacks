// Shared host/builder utilities. Processes use argv lists, never a shell string.
var Files = java.nio.file.Files,
  Paths = java.nio.file.Paths;
var C = {};
C.path = function (p) {
  return Paths.get(String(p)).toAbsolutePath().normalize();
};
C.exists = function (p) {
  return Files.exists(C.path(p));
};
C.dir = function (p) {
  return Files.isDirectory(C.path(p));
};
C.mkdir = function (p) {
  Files.createDirectories(C.path(p));
  return String(C.path(p));
};
C.temp = function (prefix) {
  return String(Files.createTempDirectory(prefix));
};
C.read = function (p) {
  return String(new java.lang.String(Files.readAllBytes(C.path(p)), 'UTF-8'));
};
C.bytes = function (v) {
  return typeof v === 'string' ? new java.lang.String(v).getBytes('UTF-8') : v;
};
C.write = function (p, v) {
  C.mkdir(String(C.path(p).getParent()));
  Files.write(C.path(p), C.bytes(v));
};
C.json = function (p, v) {
  if (arguments.length === 1) return JSON.parse(C.read(p));
  C.write(p, JSON.stringify(v, null, 2) + '\n');
};
C.remove = function (p) {
  if (!C.exists(p) && !Files.isSymbolicLink(C.path(p))) return;
  if (C.dir(p) && !Files.isSymbolicLink(C.path(p))) C.children(p).forEach(C.remove);
  Files.deleteIfExists(C.path(p));
};
C.children = function (p) {
  var stream = Files.list(C.path(p));
  try {
    return Array.prototype.slice.call(stream.toArray()).map(String).sort();
  } finally {
    stream.close();
  }
};
C.walk = function (p) {
  var out = [];
  C.children(p).forEach(function (f) {
    if (C.dir(f) && !Files.isSymbolicLink(C.path(f))) out = out.concat(C.walk(f));
    else out.push(f);
  });
  return out.sort();
};
C.copy = function (from, to, rejectLinks, ignores) {
  if (Files.isSymbolicLink(C.path(from))) {
    if (rejectLinks) throw new Error('Unsupported symlink: ' + from);
    C.mkdir(String(C.path(to).getParent()));
    Files.createSymbolicLink(C.path(to), Files.readSymbolicLink(C.path(from)));
    return;
  }
  if (C.dir(from)) {
    C.mkdir(to);
    C.children(from).forEach(function (f) {
      var name = String(C.path(f).getFileName());
      if ((ignores || []).indexOf(name) < 0) C.copy(f, to + '/' + name, rejectLinks, ignores);
    });
  } else {
    C.mkdir(String(C.path(to).getParent()));
    Files.copy(
      C.path(from),
      C.path(to),
      java.nio.file.StandardCopyOption.REPLACE_EXISTING,
      java.nio.file.StandardCopyOption.COPY_ATTRIBUTES
    );
  }
};
C.mode = function (p, mode) {
  var perms = java.nio.file.attribute.PosixFilePermissions.fromString(mode);
  Files.setPosixFilePermissions(C.path(p), perms);
};
C.digest = function (v, algorithm) {
  return String(
    Packages.org.apache.commons.codec.binary.Hex.encodeHexString(
      java.security.MessageDigest.getInstance(algorithm || 'SHA-256').digest(C.bytes(v))
    )
  );
};
C.hash = function (p) {
  var d = java.security.MessageDigest.getInstance('SHA-256'),
    s = Files.newInputStream(C.path(p)),
    b = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1048576);
  try {
    var n;
    while ((n = s.read(b)) !== -1) d.update(b, 0, n);
  } finally {
    s.close();
  }
  return String(Packages.org.apache.commons.codec.binary.Hex.encodeHexString(d.digest()));
};
C.treeHash = function (p) {
  var d = java.security.MessageDigest.getInstance('SHA-256');
  C.walk(p).forEach(function (f) {
    if (!C.dir(f)) {
      d.update(C.bytes(String(C.path(p).relativize(C.path(f))).replace(/\\/g, '/')));
      d.update(C.bytes('\0'));
      d.update(Packages.org.apache.commons.codec.binary.Hex.decodeHex(C.hash(f)));
    }
  });
  return String(Packages.org.apache.commons.codec.binary.Hex.encodeHexString(d.digest()));
};
C.start = function (argv, options) {
  options = options || {};
  var list = new java.util.ArrayList();
  argv.forEach(function (a) {
    list.add(String(a));
  });
  var pb = new java.lang.ProcessBuilder(list);
  if (options.cwd) pb.directory(new java.io.File(String(options.cwd)));
  if (options.cleanEnv) {
    var keys = Array.prototype.slice.call(pb.environment().keySet().toArray());
    keys.forEach(function (k) {
      if (/^(OJOB_|OAF_|AWS_)/.test(String(k))) pb.environment().remove(k);
    });
  }
  Object.keys(options.env || {}).forEach(function (k) {
    pb.environment().put(k, String(options.env[k]));
  });
  if (options.log)
    pb.redirectErrorStream(true).redirectOutput(new java.io.File(String(options.log)));
  else if (!options.capture) pb.inheritIO();
  return pb.start();
};
C.run = function (argv, options) {
  options = options || {};
  var tmp, p;
  // File redirects avoid pipe deadlocks and keep stdout separate from diagnostics.
  if (options.capture) {
    tmp = C.temp('openaf-command-');
    var list = new java.util.ArrayList();
    argv.forEach(function (a) {
      list.add(String(a));
    });
    var pb = new java.lang.ProcessBuilder(list);
    if (options.cwd) pb.directory(new java.io.File(String(options.cwd)));
    Object.keys(options.env || {}).forEach(function (k) {
      pb.environment().put(k, String(options.env[k]));
    });
    pb.redirectOutput(new java.io.File(tmp + '/out')).redirectError(new java.io.File(tmp + '/err'));
    p = pb.start();
  } else p = C.start(argv, options);
  try {
    if (!p.waitFor(options.timeout || 3600, java.util.concurrent.TimeUnit.SECONDS)) {
      p.destroyForcibly();
      p.waitFor();
      throw new Error('Command timed out: ' + argv[0]);
    }
    var r = {
      code: Number(p.exitValue()),
      stdout: tmp ? C.read(tmp + '/out') : '',
      stderr: tmp ? C.read(tmp + '/err') : ''
    };
    if (r.code && !options.allowFailure)
      throw new Error('Command failed (' + r.code + '): ' + argv[0] + '\n' + r.stderr);
    return r;
  } finally {
    if (tmp) C.remove(tmp);
  }
};
C.args = function (defaults) {
  var expr = String(__expr || ''),
    re = /(?:^|\s+)([A-Za-z][A-Za-z0-9]*)=([\s\S]*?)(?=\s+[A-Za-z][A-Za-z0-9]*=|$)/g,
    m;
  while ((m = re.exec(expr)) !== null) {
    var v = m[2].trim();
    if (/^(?:\[|\{|\"|true$|false$|null$|-?\d+(?:\.\d+)?$)/.test(v)) {
      try {
        v = JSON.parse(v);
      } catch (e) {
        throw new Error('Invalid JSON argument: ' + m[1]);
      }
    } else if (/^'.*'$/.test(v)) v = v.substring(1, v.length - 1);
    defaults[m[1]] = v;
  }
  return defaults;
};
C.assert = function (v, message) {
  if (!v) throw new Error(message || 'Assertion failed');
};
C.equal = function (a, b) {
  function stable(v) {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v)
        .sort()
        .forEach(function (k) {
          o[k] = stable(v[k]);
        });
      return o;
    }
    return v;
  }
  C.assert(
    JSON.stringify(stable(a)) === JSON.stringify(stable(b)),
    JSON.stringify(a) + ' != ' + JSON.stringify(b)
  );
};
C.sleep = function (ms) {
  java.lang.Thread.sleep(ms);
};
C.median = function (a) {
  if (!a.length) return null;
  a = a.slice().sort(function (x, y) {
    return x - y;
  });
  var i = Math.floor(a.length / 2);
  return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2;
};
C.source = function () {
  return String(C.path(global.lambdaSource || getOPackPath('OpenAFLambda') || '.'));
};
// Commons Compress retains Unix executable modes and exposes duplicates/symlinks.
C.zipOpen = function (p) {
  return new Packages.org.apache.commons.compress.archivers.zip.ZipFile(
    new java.io.File(String(p))
  );
};
C.zipEntries = function (z) {
  var e = z.getEntries(),
    out = [];
  while (e.hasMoreElements()) out.push(e.nextElement());
  return out;
};
C.zipRead = function (z, entry) {
  var s = z.getInputStream(typeof entry === 'string' ? z.getEntry(entry) : entry);
  try {
    return s.readAllBytes();
  } finally {
    s.close();
  }
};
C.zipText = function (z, name) {
  return String(new java.lang.String(C.zipRead(z, name), 'UTF-8'));
};
C.safeEntries = function (z) {
  var seen = {};
  return C.zipEntries(z).map(function (e) {
    var n = String(e.getName());
    C.assert(
      n &&
        !/^\//.test(n) &&
        !/^[A-Za-z]:/.test(n) &&
        n.indexOf('\\') < 0 &&
        n.split('/').indexOf('..') < 0 &&
        !seen[n],
      'Unsafe or duplicate runtime ZIP entry: ' + n
    );
    C.assert(!e.isUnixSymlink(), 'Runtime ZIP symlinks are unsupported');
    seen[n] = true;
    return e;
  });
};
C.zipWriter = function (p, fn, level) {
  C.mkdir(String(C.path(p).getParent()));
  var z = new Packages.org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream(
    new java.io.File(String(p))
  );
  z.setLevel(level || 6);
  try {
    fn(function (name, data, mode) {
      var e = new Packages.org.apache.commons.compress.archivers.zip.ZipArchiveEntry(String(name));
      e.setUnixMode(mode || 33188);
      z.putArchiveEntry(e);
      z.write(C.bytes(data));
      z.closeArchiveEntry();
    });
  } finally {
    z.close();
  }
};
C.bundle = function (entries) {
  var t = C.temp('openaf-zip-');
  try {
    C.zipWriter(t + '/data.zip', function (add) {
      Object.keys(entries).forEach(function (n) {
        add(n, entries[n]);
      });
    });
    return Files.readAllBytes(C.path(t + '/data.zip'));
  } finally {
    C.remove(t);
  }
};
C.extract = function (p, dest) {
  var z = C.zipOpen(p);
  try {
    C.safeEntries(z).forEach(function (e) {
      var f = dest + '/' + e.getName();
      if (e.isDirectory()) C.mkdir(f);
      else {
        C.write(f, C.zipRead(z, e));
        var mode = Number(e.getUnixMode());
        if (mode & 73) C.mode(f, 'rwxr-xr-x');
      }
    });
  } finally {
    z.close();
  }
};
C.http = function (url, event, headers, timeout) {
  var conn = new java.net.URI(String(url)).toURL().openConnection();
  conn.setConnectTimeout(timeout || 15000);
  conn.setReadTimeout(timeout || 90000);
  Object.keys(headers || {}).forEach(function (k) {
    conn.setRequestProperty(k, String(headers[k]));
  });
  if (isDef(event)) {
    conn.setRequestMethod('POST');
    conn.setDoOutput(true);
    conn.setRequestProperty('Content-Type', 'application/json');
    var s = conn.getOutputStream();
    try {
      s.write(C.bytes(JSON.stringify(event)));
    } finally {
      s.close();
    }
  }
  var status = Number(conn.getResponseCode()),
    stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream(),
    text = '';
  try {
    if (stream) text = String(new java.lang.String(stream.readAllBytes(), 'UTF-8'));
  } finally {
    if (stream) stream.close();
    conn.disconnect();
  }
  return [status, text ? JSON.parse(text) : null];
};
ow.loadObj();
if (typeof exports !== 'undefined') Object.assign(exports, C);
