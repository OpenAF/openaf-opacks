/**
 * <odoc>
 * <key>DockerRegistry.DockerRegistry(aURL, aLogin, aPass) : DockerRegistry</key>
 * Creates an instance of DockerRegistry to access a remote registry on aURL (e.g. http://myregistry:5000). Optionally you can provide aLogin and aPassword.
 * If not provided it will try to determine if there is authentication data on the current user's docker configuration.
 * </odoc>
 */
 var DockerRegistry = function(aURL, aLogin, aPass) {
   this._restparams = {};

   this._url = _$(aURL, "aURL").isString().$_();
   var url = (new java.net.URL(aURL));

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
};

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

   return $rest(this._restparams).get(this._url + "/v2/" + aRepository + "/tags/list");
};

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
   var res = $rest(this._restparams).get(this._url + "/v2/" + aImage + "/manifests/" + aReference);
   // Get version 2 info
   var res2 = $rest(merge(this._restparams, { requestHeaders: { Accept: "application/vnd.docker.distribution.manifest.v2+json" } }))
             .get(this._url + "/v2/" + aImage + "/manifests/" + aReference);

   // Parse JSON on history.v1Compatibility if it exists
   if (shouldParseV1Compatibility && isDef(res) && isDef(res.history)) {
      res.history = res.history.map(r => {
         if (isString(r.v1Compatibility)) {
            r.v1Compatibility = jsonParse(r.v1Compatibility);
         }
   
         return r;
      });
   }

   // Result clean up
   delete res.schemaVersion;
   delete res2.schemaVersion;

   return merge(res, res2);
};

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
   return isUnDef(res.error);
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
DockerRegistry.prototype.deleteManifest = function(aImage, aReference) {
   aImage = _$(aImage, "aImage").isString().$_();
   aReference = _$(aReference, "aReference").isString().$_();

   return $rest(merge(this._restparams, { requestHeaders: { Accept: "application/vnd.docker.distribution.manifest.v2+json" } }))
          .delete(this._url + "/v2/" + aImage + "/manifests/" + aReference);
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
      
      var res = this.getImage(aImage, aTag);
      if (isDef(res.config) && isDef(res.config.digest)) {
         aTag = res.config.digest;
      }
   }

   print(aImage);
   print(aTag);
   return this.deleteManifest(aImage, aTag);
}