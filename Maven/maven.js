ow.loadObj();

if (isDef(getOPackPath("Maven"))) {
  loadExternalJars(getOPackPath("Maven"));
} else {
  loadExternalJars(".");
}

/**
 * <odoc>
 * <key>Maven(aLocalRepoPath, aRemoteRepos)</key>
 * Initializes a new Maven instance, which also provides advanced programmatic Maven resolver capabilities.
 * - aLocalRepoPath: Custom local repository path. Defaults to ~/.m2/repository.
 * - aRemoteRepos: Array of custom remote repositories. Defaults to Maven Central.
 * </odoc>
 */
var Maven = function(aLocalRepoPath, aRemoteRepos) {
    this.urls = [
        "https://repo1.maven.org/maven2",
        "https://uk.maven.org/maven2"
    ];

    this.localRepoPath = aLocalRepoPath || getEnv("HOME") + "/.m2/repository";
    this.remoteRepos = aRemoteRepos || [
        { id: "central", type: "default", url: "https://repo1.maven.org/maven2/" }
    ];

    this._init();
};

Maven.prototype._translateArtifact = function(artifactId) {
    return artifactId.replace(/\./g, "/");
};

Maven.prototype._getURL = function() {
    return this.urls[Math.round(Math.random() * (this.urls.length - 1))];
};

/**
 * <odoc>
 * <key>Maven.search(aTerm) : Array</key>
 * Tries to search aTerm in maven.org and then fallsback to archetype-catalog.xml returning an array with groupId and artifactId.
 * </odoc>
 */
Maven.prototype.search = function(aTerm) {
    plugin("XML");
    ow.loadObj();

    var r = [];
    var res = ow.obj.rest.jsonGet("https://search.maven.org/solrsearch/select?" + ow.obj.rest.writeQuery({ q: aTerm, rows: 999, wt: "json" }));
    if (isDef(res.response.docs) && isArray(res.response.docs)) {
        for(var ii = 0; ii < res.response.docs.length; ii++) {
            r.push({
                groupId: res.response.docs[ii].g,
                artifactId: res.response.docs[ii].a
            });
        }
    }

    if (r.length > 0) return $from(r).sort("groupId").select();

    var xml = new XML(ow.obj.rest.get(this._getURL() + "/archetype-catalog.xml").response).toNativeXML();
    res = xml.archetypes.archetype.(new RegExp(".*" + aTerm + ".*", "i").test(artifactId));
    for(var ii = 0 ; ii < res.length(); ii++) {
        r.push({
            groupId: res.groupId[ii].toString(),
            artifactId: res.artifactId[ii].toString(),
            description: res.description[ii].toString()
        });
    }

    res = xml.archetypes.archetype.(new RegExp(".*" + aTerm + ".*", "i").test(groupId));
    for(var ii = 0 ; ii < res.length(); ii++) {
        r.push({
            groupId: res.groupId[ii].toString(),
            artifactId: res.artifactId[ii].toString(),
            description: res.description[ii].toString()
        });
    }

    if (r.length > 0) return $from(r).distinct();

    res = xml.archetypes.archetype.(new RegExp(".*" + aTerm + ".*", "i").test(description));
    for(var ii = 0 ; ii < res.length(); ii++) {
        r.push({
            groupId: res.groupId[ii].toString(),
            artifactId: res.artifactId[ii].toString(),
            description: res.description[ii].toString()
        });
    }
};

/**
 * <odoc>
 * <key>Maven.getLatestVersion(aURI) : String</key>
 * Get the latest version from the provide aURI for a Maven 2 repository.
 * </odoc>
 */
Maven.prototype.getLatestVersion = function(aURI) {
    plugin("XML");
    var xml = new XML(ow.obj.rest.get(this._getURL() + "/" + aURI + "/maven-metadata.xml").response);
    var x = xml.toNativeXML();

    var ver = x.versioning.latest.toString();
    if (isUnDef(ver) || ver == "") ver = x.version.toString();

    return ver;
};

/**
 * <odoc>
 * <key>Maven.getFile(artifactId, aFilenameTemplate, aOutputDir)</key>
 * Given the artifactId (prefixed with the group id using ".") will try to download the latest version of the aFilenameTemplate (where
 * version will translate to the latest version) on the provided aOutputDir.\
 * \
 * Example:\
 *    getFile("com.google.code.gson.gson", "gson-{{version}}.jar", ".")\
 * \
 * </odoc>
 */
Maven.prototype.getFile = function(artifactId, aFilenameTemplate, aOutputDir) {
    var aURI = this._translateArtifact(artifactId);
    var version = this.getLatestVersion(aURI);
    var filename = templify(aFilenameTemplate, {
        version: version
    });

    var h = new ow.obj.http(this._getURL() + "/" + aURI + "/" + version + "/" + filename, "GET", "", void 0, true, void 0, true);

    io.mkdir(aOutputDir);
    var rstream = h.responseStream();
    var wstream = io.writeFileStream(aOutputDir + "/" + filename);
    ioStreamCopy(wstream, rstream);
};

/**
 * <odoc>
 * <key>Maven.removeOldVersions(artifactId, aFilenameTemplate, aOutputDir, aFunction)</key>
 * Given the artifactId (prefixed with the group id using ".") will try to delete from aOutputDir all versions that aren't the latest version 
 * of the aFilenameTemplate (where version will translate to the latest version). Optionally you can provide aFunction that receives
 * the canonical filename of each potential version and will only delete it if the function returns true.
 * </odoc>
 */
Maven.prototype.removeOldVersions = function(artifactId, aFilenameTemplate, aOutputDir, aFunction) {
    var aURI = this._translateArtifact(artifactId);
    var version = this.getLatestVersion(aURI);
    var filename = templify(aFilenameTemplate, {
        version: version
    });
    var filenameT = templify(aFilenameTemplate, {
        version: ".*"
    });    

    if (isUnDef(aFunction)) {
        aFunction = function() { return true; };
    }

    $from(io.listFiles(aOutputDir).files)
    .notEquals("filename", filename)
    .match("filename", filenameT)
    .select((r) => {
        if (aFunction(r.canonicalPath)) io.rm(r.canonicalPath);
    });
};

/**
 * Internal method to bootstrap Aether Repository System using a Service Locator
 */
Maven.prototype._init = function() {
  this.system = this._createRepositorySystem();
  this.session = Packages.org.apache.maven.repository.internal.MavenRepositorySystemUtils.newSession();
  this.session.setConfigProperty(
    Packages.org.eclipse.aether.internal.impl.named.DefaultNamedLockFactorySelector.CONFIG_PROP_FACTORY_NAME,
    Packages.org.eclipse.aether.named.providers.NoopNamedLockFactory.NAME
  );
  
  var localRepo = new Packages.org.eclipse.aether.repository.LocalRepository(this.localRepoPath);
  this.session.setLocalRepositoryManager(
    this.system.newLocalRepositoryManager(this.session, localRepo)
  );
};

/**
 * Internal method to build a repository system from the resolver classes bundled in this oPack.
 * The Maven 4 resolver provider shipped here no longer exposes newServiceLocator().
 */
Maven.prototype._createRepositorySystem = function() {
  var emptyMap = function() {
    return new java.util.HashMap();
  };

  var checksumFactories = new java.util.HashMap();
  checksumFactories.put(
    Packages.org.eclipse.aether.internal.impl.checksum.Md5ChecksumAlgorithmFactory.NAME,
    new Packages.org.eclipse.aether.internal.impl.checksum.Md5ChecksumAlgorithmFactory()
  );
  checksumFactories.put(
    Packages.org.eclipse.aether.internal.impl.checksum.Sha1ChecksumAlgorithmFactory.NAME,
    new Packages.org.eclipse.aether.internal.impl.checksum.Sha1ChecksumAlgorithmFactory()
  );
  checksumFactories.put(
    Packages.org.eclipse.aether.internal.impl.checksum.Sha256ChecksumAlgorithmFactory.NAME,
    new Packages.org.eclipse.aether.internal.impl.checksum.Sha256ChecksumAlgorithmFactory()
  );
  checksumFactories.put(
    Packages.org.eclipse.aether.internal.impl.checksum.Sha512ChecksumAlgorithmFactory.NAME,
    new Packages.org.eclipse.aether.internal.impl.checksum.Sha512ChecksumAlgorithmFactory()
  );
  var checksumAlgorithmFactorySelector = new Packages.org.eclipse.aether.internal.impl.checksum.DefaultChecksumAlgorithmFactorySelector(checksumFactories);
  var artifactPredicateFactory = new Packages.org.eclipse.aether.internal.impl.DefaultArtifactPredicateFactory(checksumAlgorithmFactorySelector);

  var repoLayoutFactories = new java.util.HashMap();
  repoLayoutFactories.put(
    Packages.org.eclipse.aether.internal.impl.Maven2RepositoryLayoutFactory.NAME,
    new Packages.org.eclipse.aether.internal.impl.Maven2RepositoryLayoutFactory(checksumAlgorithmFactorySelector, artifactPredicateFactory)
  );
  var repositoryLayoutProvider = new Packages.org.eclipse.aether.internal.impl.DefaultRepositoryLayoutProvider(repoLayoutFactories);

  var pathProcessor = new Packages.org.eclipse.aether.internal.impl.DefaultPathProcessor();
  var checksumProcessor = new Packages.org.eclipse.aether.internal.impl.DefaultChecksumProcessor(pathProcessor);
  var checksumPolicyProvider = new Packages.org.eclipse.aether.internal.impl.DefaultChecksumPolicyProvider();
  var updatePolicyAnalyzer = new Packages.org.eclipse.aether.internal.impl.DefaultUpdatePolicyAnalyzer();
  var repositoryKeyFunctionFactory = new Packages.org.eclipse.aether.internal.impl.DefaultRepositoryKeyFunctionFactory();

  var localPathComposer = new Packages.org.eclipse.aether.internal.impl.DefaultLocalPathComposer();
  var localPathPrefixComposerFactory = new Packages.org.eclipse.aether.internal.impl.DefaultLocalPathPrefixComposerFactory(repositoryKeyFunctionFactory);
  var trackingFileManager = new Packages.org.eclipse.aether.internal.impl.LegacyTrackingFileManager();

  var localRepositoryFactories = new java.util.HashMap();
  localRepositoryFactories.put(
    Packages.org.eclipse.aether.internal.impl.SimpleLocalRepositoryManagerFactory.NAME,
    new Packages.org.eclipse.aether.internal.impl.SimpleLocalRepositoryManagerFactory()
  );
  localRepositoryFactories.put(
    Packages.org.eclipse.aether.internal.impl.EnhancedLocalRepositoryManagerFactory.NAME,
    new Packages.org.eclipse.aether.internal.impl.EnhancedLocalRepositoryManagerFactory(localPathComposer, trackingFileManager, localPathPrefixComposerFactory, repositoryKeyFunctionFactory)
  );
  var localRepositoryProvider = new Packages.org.eclipse.aether.internal.impl.DefaultLocalRepositoryProvider(localRepositoryFactories);

  var namedLockFactories = new java.util.HashMap();
  namedLockFactories.put(
    Packages.org.eclipse.aether.named.providers.FileLockNamedLockFactory.NAME,
    new Packages.org.eclipse.aether.named.providers.FileLockNamedLockFactory()
  );
  namedLockFactories.put(
    Packages.org.eclipse.aether.named.providers.LocalReadWriteLockNamedLockFactory.NAME,
    new Packages.org.eclipse.aether.named.providers.LocalReadWriteLockNamedLockFactory()
  );
  namedLockFactories.put(
    Packages.org.eclipse.aether.named.providers.LocalSemaphoreNamedLockFactory.NAME,
    new Packages.org.eclipse.aether.named.providers.LocalSemaphoreNamedLockFactory()
  );
  namedLockFactories.put(
    Packages.org.eclipse.aether.named.providers.NoopNamedLockFactory.NAME,
    new Packages.org.eclipse.aether.named.providers.NoopNamedLockFactory()
  );
  var repositoryLifecycle = new Packages.org.eclipse.aether.internal.impl.DefaultRepositorySystemLifecycle();
  var namedLockFactorySelector = new Packages.org.eclipse.aether.internal.impl.named.DefaultNamedLockFactorySelector(namedLockFactories, repositoryLifecycle);

  var nameMappers = new java.util.HashMap();
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.STATIC_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.staticNameMapper()
  );
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.GAV_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.gavNameMapper()
  );
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.FILE_GAV_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.fileGavNameMapper()
  );
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.FILE_HGAV_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.fileHashingGavNameMapper()
  );
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.GAECV_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.gaecvNameMapper()
  );
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.FILE_GAECV_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.fileGaecvNameMapper()
  );
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.FILE_HGAECV_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.fileHashingGaecvNameMapper()
  );
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.FILE_STATIC_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.fileStaticNameMapper()
  );
  nameMappers.put(
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.DISCRIMINATING_NAME,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NameMappers.discriminatingNameMapper()
  );

  var lockingInhibitors = new java.util.HashMap();
  lockingInhibitors.put(
    Packages.org.eclipse.aether.internal.impl.filter.PrefixesLockingInhibitorFactory.NAME,
    new Packages.org.eclipse.aether.internal.impl.filter.PrefixesLockingInhibitorFactory()
  );

  var namedLockFactoryAdapterFactory = new Packages.org.eclipse.aether.internal.impl.synccontext.named.NamedLockFactoryAdapterFactoryImpl(
    namedLockFactorySelector,
    nameMappers,
    Packages.org.eclipse.aether.internal.impl.synccontext.named.NamedLockFactoryAdapterFactoryImpl.DEFAULT_NAME_MAPPER_NAME,
    lockingInhibitors
  );
  var syncContextFactory = new Packages.org.eclipse.aether.internal.impl.synccontext.DefaultSyncContextFactory(namedLockFactoryAdapterFactory);

  var repositoryEventDispatcher = new Packages.org.eclipse.aether.internal.impl.DefaultRepositoryEventDispatcher(emptyMap());
  var offlineController = new Packages.org.eclipse.aether.internal.impl.DefaultOfflineController();
  var remoteRepositoryFilterManager = new Packages.org.eclipse.aether.internal.impl.filter.DefaultRemoteRepositoryFilterManager(emptyMap());
  var updateCheckManager = new Packages.org.eclipse.aether.internal.impl.DefaultUpdateCheckManager(trackingFileManager, updatePolicyAnalyzer, pathProcessor);
  var remoteRepositoryManager = new Packages.org.eclipse.aether.internal.impl.DefaultRemoteRepositoryManager(updatePolicyAnalyzer, checksumPolicyProvider, repositoryKeyFunctionFactory);

  var checksumExtractors = new java.util.HashMap();
  checksumExtractors.put(
    Packages.org.eclipse.aether.transport.http.Nexus2ChecksumExtractor.NAME,
    new Packages.org.eclipse.aether.transport.http.Nexus2ChecksumExtractor()
  );
  checksumExtractors.put(
    Packages.org.eclipse.aether.transport.http.XChecksumChecksumExtractor.NAME,
    new Packages.org.eclipse.aether.transport.http.XChecksumChecksumExtractor()
  );

  var transporterFactories = new java.util.HashMap();
  transporterFactories.put(
    Packages.org.eclipse.aether.transport.file.FileTransporterFactory.NAME,
    new Packages.org.eclipse.aether.transport.file.FileTransporterFactory()
  );
  transporterFactories.put(
    Packages.org.eclipse.aether.transport.http.HttpTransporterFactory.NAME,
    new Packages.org.eclipse.aether.transport.http.HttpTransporterFactory(checksumExtractors)
  );
  var transporterProvider = new Packages.org.eclipse.aether.internal.impl.DefaultTransporterProvider(transporterFactories);

  var repositoryConnectorFactories = new java.util.HashMap();
  repositoryConnectorFactories.put(
    Packages.org.eclipse.aether.connector.basic.BasicRepositoryConnectorFactory.NAME,
    new Packages.org.eclipse.aether.connector.basic.BasicRepositoryConnectorFactory(
      transporterProvider,
      repositoryLayoutProvider,
      checksumPolicyProvider,
      pathProcessor,
      checksumProcessor,
      emptyMap()
    )
  );
  var repositoryConnectorProvider = new Packages.org.eclipse.aether.internal.impl.DefaultRepositoryConnectorProvider(repositoryConnectorFactories, emptyMap());

  var metadataResolver = new Packages.org.eclipse.aether.internal.impl.DefaultMetadataResolver(
    repositoryEventDispatcher,
    updateCheckManager,
    repositoryConnectorProvider,
    remoteRepositoryManager,
    syncContextFactory,
    offlineController,
    remoteRepositoryFilterManager,
    pathProcessor
  );

  var versionResolver = new Packages.org.apache.maven.repository.internal.DefaultVersionResolver(metadataResolver, syncContextFactory, repositoryEventDispatcher);
  var versionRangeResolver = new Packages.org.apache.maven.repository.internal.DefaultVersionRangeResolver(
    metadataResolver,
    syncContextFactory,
    repositoryEventDispatcher,
    new Packages.org.eclipse.aether.util.version.GenericVersionScheme()
  );

  var artifactResolver = new Packages.org.eclipse.aether.internal.impl.DefaultArtifactResolver(
    pathProcessor,
    repositoryEventDispatcher,
    versionResolver,
    updateCheckManager,
    repositoryConnectorProvider,
    remoteRepositoryManager,
    syncContextFactory,
    offlineController,
    emptyMap(),
    remoteRepositoryFilterManager
  );

  var modelBuilder = new Packages.org.apache.maven.model.building.DefaultModelBuilderFactory().newInstance();
  var modelCacheFactory = new Packages.org.apache.maven.repository.internal.DefaultModelCacheFactory();
  var relocationSources = emptyMap();
  var artifactDescriptorReader = new Packages.org.apache.maven.repository.internal.DefaultArtifactDescriptorReader(
    remoteRepositoryManager,
    versionResolver,
    versionRangeResolver,
    artifactResolver,
    modelBuilder,
    repositoryEventDispatcher,
    modelCacheFactory,
    relocationSources
  );

  var dependencyCollectors = new java.util.HashMap();
  dependencyCollectors.put(
    Packages.org.eclipse.aether.internal.impl.collect.bf.BfDependencyCollector.NAME,
    new Packages.org.eclipse.aether.internal.impl.collect.bf.BfDependencyCollector(
      remoteRepositoryManager,
      artifactDescriptorReader,
      versionRangeResolver,
      emptyMap()
    )
  );
  dependencyCollectors.put(
    Packages.org.eclipse.aether.internal.impl.collect.df.DfDependencyCollector.NAME,
    new Packages.org.eclipse.aether.internal.impl.collect.df.DfDependencyCollector(
      remoteRepositoryManager,
      artifactDescriptorReader,
      versionRangeResolver,
      emptyMap()
    )
  );
  var dependencyCollector = new Packages.org.eclipse.aether.internal.impl.collect.DefaultDependencyCollector(dependencyCollectors);

  var metadataGeneratorFactories = new java.util.HashMap();
  metadataGeneratorFactories.put(
    Packages.org.apache.maven.repository.internal.SnapshotMetadataGeneratorFactory.NAME,
    new Packages.org.apache.maven.repository.internal.SnapshotMetadataGeneratorFactory()
  );
  metadataGeneratorFactories.put(
    Packages.org.apache.maven.repository.internal.VersionsMetadataGeneratorFactory.NAME,
    new Packages.org.apache.maven.repository.internal.VersionsMetadataGeneratorFactory()
  );
  metadataGeneratorFactories.put(
    Packages.org.apache.maven.repository.internal.PluginsMetadataGeneratorFactory.NAME,
    new Packages.org.apache.maven.repository.internal.PluginsMetadataGeneratorFactory()
  );

  var installer = new Packages.org.eclipse.aether.internal.impl.DefaultInstaller(
    pathProcessor,
    repositoryEventDispatcher,
    emptyMap(),
    metadataGeneratorFactories,
    emptyMap(),
    syncContextFactory
  );
  var deployer = new Packages.org.eclipse.aether.internal.impl.DefaultDeployer(
    pathProcessor,
    repositoryEventDispatcher,
    repositoryConnectorProvider,
    remoteRepositoryManager,
    updateCheckManager,
    emptyMap(),
    metadataGeneratorFactories,
    emptyMap(),
    syncContextFactory,
    offlineController
  );

  var repositorySystemValidators = new java.util.ArrayList();
  var repositorySystemValidator = new Packages.org.eclipse.aether.internal.impl.DefaultRepositorySystemValidator(repositorySystemValidators);
  var artifactDecorators = emptyMap();

  return new Packages.org.eclipse.aether.internal.impl.DefaultRepositorySystem(
    versionResolver,
    versionRangeResolver,
    artifactResolver,
    metadataResolver,
    artifactDescriptorReader,
    dependencyCollector,
    installer,
    deployer,
    localRepositoryProvider,
    syncContextFactory,
    remoteRepositoryManager,
    repositoryLifecycle,
    artifactDecorators,
    repositorySystemValidator
  );
};

/**
 * <odoc>
 * <key>Maven.resolve(coordinate, scope) : Array</key>
 * Resolves the given Maven coordinate along with all its transitive dependencies.
 * Returns an array of resolved artifact details, including local file paths.
 * 
 * Example:
 *    var m = new Maven();
 *    var res = m.resolve("org.apache.commons:commons-lang3:3.12.0");
 * </odoc>
 */
Maven.prototype.resolve = function(coordinate, scope) {
  scope = scope || "compile";
  
  var artifact = new Packages.org.eclipse.aether.artifact.DefaultArtifact(coordinate);
  var dependency = new Packages.org.eclipse.aether.graph.Dependency(artifact, scope);
  
  var collectRequest = new Packages.org.eclipse.aether.collection.CollectRequest();
  collectRequest.setRoot(dependency);
  
  for (var i = 0; i < this.remoteRepos.length; i++) {
    var r = this.remoteRepos[i];
    var remoteRepo = new Packages.org.eclipse.aether.repository.RemoteRepository.Builder(r.id, r.type, r.url).build();
    collectRequest.addRepository(remoteRepo);
  }
  
  var dependencyRequest = new Packages.org.eclipse.aether.resolution.DependencyRequest(collectRequest, null);
  var result = this.system.resolveDependencies(this.session, dependencyRequest);
  
  var artifactResults = result.getArtifactResults();
  var resolved = [];
  
  for (var j = 0; j < artifactResults.size(); j++) {
    var artRes = artifactResults.get(j);
    var art = artRes.getArtifact();
    resolved.push({
      groupId: String(art.getGroupId()),
      artifactId: String(art.getArtifactId()),
      version: String(art.getVersion()),
      classifier: String(art.getClassifier()),
      extension: String(art.getExtension()),
      file: String(art.getFile().getAbsolutePath())
    });
  }
  
  return resolved;
};

/**
 * <odoc>
 * <key>Maven.parsePom(pomPath) : Object</key>
 * Parses the provided POM xml file and returns a structured JS Object.
 * </odoc>
 */
Maven.prototype.parsePom = function(pomPath) {
  var file = new java.io.File(pomPath);
  var reader = new Packages.org.apache.maven.model.io.xpp3.MavenXpp3Reader();
  var fileReader = new java.io.FileReader(file);
  var model;
  try {
    model = reader.read(fileReader);
  } finally {
    fileReader.close();
  }
  
  var result = {
    groupId: model.getGroupId() ? String(model.getGroupId()) : (model.getParent() ? String(model.getParent().getGroupId()) : null),
    artifactId: String(model.getArtifactId()),
    version: model.getVersion() ? String(model.getVersion()) : (model.getParent() ? String(model.getParent().getVersion()) : null),
    name: model.getName() ? String(model.getName()) : null,
    description: model.getDescription() ? String(model.getDescription()) : null,
    properties: {},
    dependencies: []
  };
  
  var props = model.getProperties();
  if (props) {
    var keys = props.keySet().iterator();
    while (keys.hasNext()) {
      var key = String(keys.next());
      result.properties[key] = String(props.getProperty(key));
    }
  }
  
  var deps = model.getDependencies();
  for (var i = 0; i < deps.size(); i++) {
    var dep = deps.get(i);
    result.dependencies.push({
      groupId: String(dep.getGroupId()),
      artifactId: String(dep.getArtifactId()),
      version: dep.getVersion() ? String(dep.getVersion()) : null,
      scope: dep.getScope() ? String(dep.getScope()) : "compile",
      classifier: dep.getClassifier() ? String(dep.getClassifier()) : null,
      type: dep.getType() ? String(dep.getType()) : "jar"
    });
  }
  
  return result;
};

/**
 * <odoc>
 * <key>Maven.resolveDependenciesFromPom(pomPath, scope) : Array</key>
 * Parses the pom.xml at pomPath and resolves all its dependencies transitively.
 * </odoc>
 */
Maven.prototype.resolveDependenciesFromPom = function(pomPath, scope) {
  var pom = this.parsePom(pomPath);
  var resolved = [];
  var seen = {};
  for (var i = 0; i < pom.dependencies.length; i++) {
    var dep = pom.dependencies[i];
    if (dep.scope === (scope || "compile") || dep.scope === "runtime" || dep.scope === "compile") {
      var coord = dep.groupId + ":" + dep.artifactId;
      if (dep.version) {
        coord += ":" + dep.version;
      } else {
        continue;
      }
      if (dep.classifier) {
        coord += ":" + dep.classifier;
      }
      try {
        var subRes = this.resolve(coord, dep.scope);
        for (var j = 0; j < subRes.length; j++) {
          var item = subRes[j];
          var key = item.groupId + ":" + item.artifactId + ":" + item.version;
          if (!seen[key]) {
            seen[key] = true;
            resolved.push(item);
          }
        }
      } catch (e) {
        // Skip unresolvable or dynamic parent-managed versions
      }
    }
  }
  return resolved;
};

var MavenResolver = Maven;
