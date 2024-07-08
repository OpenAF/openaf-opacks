/**
 * <odoc>
 * <key>DockerRegistry.DockerRegistry(aURL, aLogin, aPass) : DockerRegistry</key>
 * Creates an instance of DockerRegistry to access a remote registry on aURL (e.g. http://myregistry:5000). Optionally you can provide aLogin and aPassword.
 * If not provided it will try to determine if there is authentication data on the current user's docker configuration.
 * </odoc>
 */
var DockerRegistry = function(aURL, aLogin, aPass) {
   this._restparams = { requestHeaders: { Accept: "*/*" } }
   this._dockerhub = "https://registry.hub.docker.com/v2/repositories"

   this._url = _$(aURL, "aURL").isString().default(this._dockerhub)
   var url = (new java.net.URL(this._url));

   // If no authentication info was provided
   if (isNull(url.getUserInfo()) && (isUnDef(aLogin) || isUnDef(aPass))) {
      // If local docker config exists try to determine if there is local authentication info that can be used
      if (io.fileExists(ow.format.getUserHome() + "/.docker/config.json")) {
         var auths = io.readFileJSON(ow.format.getUserHome() + "/.docker/config.json");
         var host = String(url.getHost());

         // Determine if port needs to be appended
         if (url.getPort() > -1) {
            host += ":" + url.getPort();
         }

         // If entry found decode and user authentication
         if (isDef(auths.auths[host]) && isDef(auths.auths[host].auth)) {
            var auth = af.fromBytes2String(af.fromBase64(auths.auths[host].auth)).split(":");
            this._restparams.login = af.encrypt(auth[0]);
            this._restparams.pass  = af.encrypt(auth[1]);
         } else {
            // No authentication found
         }
      }
   } else {
      this._restparams.login = aLogin;
      this._restparams.pass  = aPass;
   }

   this._getToken()
};

DockerRegistry.prototype._getToken = function() {
   var _token = $rest().get(this._url + "/token")
   if (isMap(_token) && isDef(_token.token)) {
      _token = _token.token
      this._restparams.requestHeaders = merge(this._restparams.requestHeaders, { Authorization: "Bearer " + _token })
   }
}

/**
 * <odoc>
 * <key>DockerRegistry.listRepositories() : Array</key>
 * Retrieves a list of repositories of the remote registry.
 * </odoc>
 */
DockerRegistry.prototype.listRepositories = function() {
   return $rest(this._restparams).get(this._url + "/v2/_catalog").repositories;
};

/**
 * <odoc>
 * <key>DockerRegistry.listTags(aRepository) : Map</key>
 * Retrieves a list of tags for the provided aRepository.
 * </odoc>
 */
DockerRegistry.prototype.listTags = function(aRepository) {
   aRepository = _$(aRepository, "aRepository").isString().$_();

   if (this._url == this._dockerhub) {
      var _r = this.hubListTags(aRepository)
      return {
         name: aRepository,
         tags: _r.map(r => r.name)
      }
   } else {
      return $rest(this._restparams).get(this._url + "/v2/" + aRepository + "/tags/list")
   }
};

/**
 * <odoc>
 * <key>DockerRegistry.hubListTags(aRepository, onlyRecent) : Array</key>
 * Uses Docker Hub API to list more details about the tags of the provided aRepository.
 * Note: might not work with all docker container registries. If onlyRecent = true it will only
 * list the latest.
 * </odoc>
 */
DockerRegistry.prototype.hubListTags = function(aRepository, onlyRecent) {
   aRepository = _$(aRepository, "aRepository").isString().$_()
   var parent = this

   var data = [], url = this._url + "/" + aRepository + "/tags", go = true
   do {
      var lst = $rest(parent._restparams).get(url)
      if (isMap(lst) && isArray(lst.results)) {
        data = data.concat(lst.results)
        url = lst.next
      } else {
         if (isMap(lst) && isDef(lst.error) && lst.error.responseCode == 404) {
            var tags = parent.listTags(aRepository)
            if (isDef(tags) && isArray(tags.tags)) {
               if (onlyRecent) {
                  while(tags.tags.length > 10) {
                     tags.tags.shift()
                  }
               }

               tags.tags.forEach(r => {
                  var manif = parent.getManifest(aRepository, r)
                  if (isUnDef(manif.error)) {
                     data.push({
                        name         : r,
                        last_updated : (isUnDef(manif.history) || manif.history.length <= 0? __ : $from(manif.history).attach("date", s=>new Date(s.v1Compatibility.created.substring(0, 23))).max("date").date.toISOString()),
                        //images       : $from(r.history).select(r => ({ architecture: r.v1Compatibility.architecture })),
                        full_size    : (isUnDef(manif.layers) || manif.layers.length <= 0 ? __ : $from(manif.layers).sum("size"))
                     })
                  }
               })
            }
            go = false
         }
      }
   } while(!onlyRecent && go && isMap(lst) && isString(url))

   traverse(data, (aK, aV, aP, aO) => {
      try {
         if (isString(aV) && aV.match(/\d+-\d+-\d+T\d+:\d+:\d+\.\d{3}\d+Z/)) {
            aO[aK] = aV.replace(/\.(\d{3})\d+Z$/, ".$1Z")
         }
      } catch(e) {
         // do nothing
      }
   })

   return data
}

/**
 * <odoc>
 * <key>DockerRegistry.getManifest(aImage, aReference, shouldParseV1Compatibility) : Map</key>
 * Retrieves data given aImage and aReference. If shouldParseV1Compatibility = false (defaults to true) no json parsing to the v1Compatibility history entries
 * will be performed.
 * </odoc>
 */
DockerRegistry.prototype.getManifest = function(aImage, aReference, shouldParseV1Compatibility) {
   aImage = _$(aImage, "aImage").isString().$_();
   aReference = _$(aReference, "aReference").isString().$_();
   shouldParseV1Compatibility = _$(shouldParseV1Compatibility, "shouldParseV1Compatibility").isBoolean().default(true);

   // Get version 1 info
   //var res = $rest(merge(this._restparams, { requestHeaders: { Accept: "application/vnd.oci.image.index.v1+json" } })).get(this._url + "/v2/" + aImage + "/manifests/" + aReference)
   // Get version 2 info
   var res2 = $rest(merge(this._restparams, { requestHeaders: { Accept: "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json" } }))
             .get(this._url + "/v2/" + aImage + "/manifests/" + aReference)

   // Parse JSON on history.v1Compatibility if it exists
   /*if (shouldParseV1Compatibility && isDef(res) && isDef(res.history)) {
      res.history = res.history.map(r => {
         if (isString(r.v1Compatibility)) {
            r.v1Compatibility = jsonParse(r.v1Compatibility);
         }
   
         return r;
      });
   }*/

   // Result clean up
   delete res2.schemaVersion2
   //delete res2.schemaVersion;

   //return merge(res, res2);
   return res2
}

/**
 * <odoc>
 * <key>DockerRegistry.getImage(aImage, aTag, shouldParseV1Compatibility) : Map</key>
 * Retrieves data given aImage and aTag. If shouldParseV1Compatibility = false (defaults to true) no json parsing to the v1Compatibility history entries
 * will be performed.
 * </odoc>
 */
DockerRegistry.prototype.getImage = function(aImage, aTag, shouldParseV1Compatibility) {
   if (isString(aImage) && aImage.indexOf(":") > 0 && isUnDef(aTag)) {
      var parts = aImage.match(/^(.+)\:(.+)$/);
      if (parts.length > 2) {
         aImage = parts[1];
         aTag = parts[2];
      }
   }
   return this.getManifest(aImage, aTag, shouldParseV1Compatibility);
};

/**
 * <odoc>
 * <key>DockerRegistry.manifestExists(aImage, aReference) : Boolean</key>
 * Verifies if aImage with aReference exists in the repository or not.
 * </odoc>
 */
DockerRegistry.prototype.manifestExists = function(aImage, aReference) {
   aImage = _$(aImage, "aImage").isString().$_();
   aReference = _$(aReference, "aReference").isString().$_();

   var res = $rest(this._restparams).head(this._url + "/v2/" + aImage + "/manifests/" + aReference);
   if (isDef(res.error) && res.error.responseCode != 404) throw af.toSLON(res.error)
   return isUnDef(res.error)
};

/**
 * <odoc>
 * <key>DockerRegistry.imageExists(aImage, aTag) : Boolean</key>
 * Verifies if aImage with aTag exists in the repository or not.
 * </odoc>
 */
DockerRegistry.prototype.imageExists = function(aImage, aTag) {
   if (isString(aImage) && aImage.indexOf(":") > 0 && isUnDef(aTag)) {
      var parts = aImage.match(/^(.+)\:(.+)$/);
      if (parts.length > 2) {
         aImage = parts[1];
         aTag = parts[2];
      }
   }

   return this.manifestExists(aImage, aTag);
}

/**
 * <odoc>
 * <key>DockerRegistry.deleteManifest(aImage, aReference) : Map</key>
 * Keep in mind that you should run the docker registry garbage-collector afterwards (docker exec -it myRegistry bin/registry garbage-collect /etc/docker/registry/config.yml)
 * Note: if you get an error message with "The operation is unsupported" please check the docker registry documentation https://docs.docker.com/registry/configuration/#delete 
 * to enable the delete function (REGISTRY_STORAGE_DELETE_ENABLED environment variable)
 * </odoc>
 */
DockerRegistry.prototype.deleteManifest = function(aImage, aReference, aType) {
   aImage = _$(aImage, "aImage").isString().$_();
   aReference = _$(aReference, "aReference").isString().$_();
   aType = _$(aType, "aType").isString().default("application/vnd.docker.distribution.manifest.v2+json")

   //return $rest(merge(this._restparams, { requestHeaders: { Accept: aType } }))
   return $rest(this._restparams)
          .delete(this._url + "/v2/" + aImage + "/manifests/" + aReference)
}

/**
 * <odoc>
 * <key>DockerRegistry.deleteManifest(aImage, aReference) : Map</key>
 * Keep in mind that you should run the docker registry garbage-collector afterwards (docker exec -it myRegistry bin/registry garbage-collect /etc/docker/registry/config.yml)
 * Note: if you get an error message with "The operation is unsupported" please check the docker registry documentation https://docs.docker.com/registry/configuration/#delete 
 * to enable the delete function (REGISTRY_STORAGE_DELETE_ENABLED environment variable)
 * </odoc>
 */
DockerRegistry.prototype.deleteImage = function(aImage, aTag) {
   if (isString(aImage) && aImage.indexOf(":") > 0 && isUnDef(aTag)) {
      var parts = aImage.match(/^(.+)\:(.+)$/);
      if (parts.length > 2) {
         aImage = parts[1];
         aTag = parts[2];
      }
      
      var res = this.getImage(aImage, aTag)
      if (isDef(res.manifests) && res.manifests.length > 0) {
         var _res = []
         res.manifests.forEach(r => {
            _res.push(this.deleteManifest(aImage, r.digest, r.mediaType))
         })
         return _res
      }
      /*if (isDef(res.config) && isDef(res.config.digest)) {
         aTag = res.config.digest;
      }*/
   }

   return this.deleteManifest(aImage, aTag)
}