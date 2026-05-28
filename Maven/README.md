# Maven oPack

Provides a comprehensive programmatic interface to search, download, parse, and resolve Maven dependencies (with full transitive resolution) using the Eclipse Aether and Apache Maven Model APIs inside OpenAF.

## Usage

### Loading the oPack

```javascript
require("maven.js");
```

---

## 1. Advanced Maven Resolver & POM Parser Capabilities

These features allow programmatic dependency resolution, transitive dependency calculations, repository lookups, and POM file parsing.

### Resolving Dependencies Transitively

```javascript
// Initialize resolver (defaults to local ~/.m2/repository and Maven Central)
var m = new Maven();

// Resolve a coordinate (returns array of resolved artifacts with local absolute paths)
var resolved = m.resolve("org.apache.commons:commons-email:1.5");
print(resolved);
/*
[
  {
    "groupId": "org.apache.commons",
    "artifactId": "commons-email",
    "version": "1.5",
    "classifier": "",
    "extension": "jar",
    "file": "/Users/user/.m2/repository/org/apache/commons/commons-email/1.5/commons-email-1.5.jar"
  },
  {
    "groupId": "com.sun.mail",
    "artifactId": "javax.mail",
    "version": "1.5.6",
    ...
  }
]
*/
```

### Parsing a pom.xml File

```javascript
var m = new Maven();
var pom = m.parsePom("pom.xml");

print(pom.groupId);
print(pom.artifactId);
print(pom.version);
print(pom.dependencies);
```

### Resolving Dependencies Directly from pom.xml

```javascript
var m = new Maven();
var dependencies = m.resolveDependenciesFromPom("pom.xml");
print(dependencies);
```

### Custom Resolver Configuration

You can customize the local repository path and remote repositories when instantiating `Maven`:

```javascript
var m = new Maven(
  "/tmp/my_local_repo",
  [
    { id: "central", type: "default", url: "https://repo1.maven.org/maven2/" },
    { id: "custom-repo", type: "default", url: "https://my.company.repo/maven2/" }
  ]
);
```

---

## 2. Legacy Maven Repo Access Wrapper Capabilities

These features are maintained for fast searching and artifact fetching directly from Maven repositories.

### Searching Maven Repository

```javascript
var m = new Maven();
var results = m.search("gson");
print(results);
```

### Fetching a Specific File/Jar

```javascript
var m = new Maven();
// Downloads the latest version of gson jar matching the template
m.getFile("com.google.code.gson.gson", "gson-{{version}}.jar", "/path/to/output");
```

### Removing Old Versions

```javascript
var m = new Maven();
m.removeOldVersions("com.google.code.gson.gson", "gson-{{version}}.jar", "/path/to/output");
```

## Backward Compatibility

`MavenResolver` is fully preserved as an alias to `Maven`. Existing code instantiating `new MavenResolver()` will run exactly as before:

```javascript
var mr = new MavenResolver();
var resolved = mr.resolve("org.apache.commons:commons-email:1.5");
```
