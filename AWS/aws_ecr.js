// Author: Nuno Aguiar, Helder Marques
// ECR

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.ECR_ListImages(aRegion, aRepoName, params) : Array</key>
 * List all images and tabs for aRepoName on aRegion. Optionally you can provide extra params.
 * \
 * Refer to: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_ListImages.html\
 * \
 * </odoc>
 */
AWS.prototype.ECR_ListImages = function(aRegion, aRepoName, params) {
    var aURL
    aRegion = _$(aRegion).isString().default(this.region)
    aRepoName = _$(aRepoName).isString().$_()
    params    = _$(params).isMap().default({})

    aURL = "https://ecr." + aRegion + ".amazonaws.com/"
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())

    params.repositoryName = aRepoName

    var _res = this.postURLEncoded(aURL, aURI, "", params, "ecr", aHost, aRegion, {
       "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.ListImages"
    }, __, "application/x-amz-json-1.1")

    var res
    if (isDef(_res) && isDef(_res.nextToken)) {
       res = _res.imageIds.concat(this.ECR_ListImages(aRegion, aRepoName, merge(params, { nextToken: _res.nextToken })))
    } else {
       res = _res
    }
    return (isDef(res.imageIds) ? res.imageIds : res)
}

/**
 * <odoc>
 * <key>AWS.ECR_DescribeImages(aRegion, aRepoName, params) : Array</key>
 * Describe all images and tabs for aRepoName on aRegion. Optionally you can provide extra params.
 * \
 * Refer to: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_DescribeImages.html\
 * \
 * </odoc>
 */
AWS.prototype.ECR_DescribeImages = function(aRegion, aRepoName, params) {
   var aURL
   aRegion = _$(aRegion).isString().default(this.region)
   aRepoName = _$(aRepoName).isString().$_()
   params    = _$(params).isMap().default({})

   aURL = "https://ecr." + aRegion + ".amazonaws.com/"
   var url = new java.net.URL(aURL)
   var aHost = String(url.getHost())
   var aURI = String(url.getPath())

   params.repositoryName = aRepoName

   var _res = this.postURLEncoded(aURL, aURI, "", params, "ecr", aHost, aRegion, {
      "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.DescribeImages"
   }, __, "application/x-amz-json-1.1")

   var res
   if (isDef(_res) && isDef(_res.nextToken)) {
      res = _res.imageDetails.concat(this.ECR_DescribeImages(aRegion, aRepoName, merge(params, { nextToken: _res.nextToken })))
   } else {
      res = _res
   }
   return (isDef(res.imageDetails) ? res.imageDetails : res)
}

/**
 * <odoc>
 * <key>AWS.ECR_ListImageReferrers(aRegion, aRepository, aRegistry, aDigest, aNextToken) : Map</key>
 * Returns one page of OCI artifacts referencing the image digest.
 * </odoc>
 */
AWS.prototype.ECR_ListImageReferrers = function(aRegion, aRepository, aRegistry, aDigest, aNextToken) {
   aRegion = _$(aRegion).isString().default(this.region)
   var host = "ecr." + aRegion + ".amazonaws.com"
   var params = { repositoryName: aRepository, registryId: aRegistry, subjectId: { imageDigest: aDigest },
      maxResults: 50, filter: { artifactStatus: "ANY" } }
   if (aNextToken) params.nextToken = aNextToken
   var response = this.postURLEncoded("https://" + host + "/", "/", "", params, "ecr", host, aRegion, {
      "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.ListImageReferrers"
   }, __, "application/x-amz-json-1.1")
   if (!response || !isArray(response.referrers)) throw new Error("ECR referrers unavailable")
   return response
}

/**
 * <odoc>
 * <key>AWS.ECR_GetImageRuntimeUsage(aRegion, aRepository, aRegistry, aDigest) : Map</key>
 * Returns the ECS/EKS workload count and last-in-use timestamp reported by Amazon Inspector.
 * </odoc>
 */
AWS.prototype.ECR_GetImageRuntimeUsage = function(aRegion, aRepository, aRegistry, aDigest) {
   aRegion = _$(aRegion).isString().default(this.region)
   var host = "inspector2." + aRegion + ".amazonaws.com"
   var path = "/findings/aggregation/list"
   var equals = value => [{ comparison: "EQUALS", value: value }]
   var params = {
      aggregationType: "AWS_ECR_CONTAINER",
      accountIds: equals(aRegistry),
      aggregationRequest: { awsEcrContainerAggregation: { imageShas: equals(aDigest), repositories: equals(aRepository) } },
      maxResults: 100
   }
   var tokens = new Set()
   do {
      var response = this.postURLEncoded("https://" + host + path, path, "", params, "inspector2", host, aRegion, {}, __, "application/json", true)
      if (!response || (!isArray(response.responses) && response.aggregationType != params.aggregationType)) throw new Error("Inspector runtime usage unavailable")
      for (var item of (response.responses || [])) {
         var image = item.awsEcrContainerAggregation
         if (!image) continue
         var matchesDigest = image.imageSha == aDigest || image.imageSha == aDigest.substring(7) ||
            (isString(image.resourceId) && image.resourceId.endsWith(":repository/" + aRepository + "/" + aDigest))
         if (matchesDigest && (!image.accountId || image.accountId == aRegistry) && (!image.repository || image.repository == aRepository) &&
             (isNumber(image.inUseCount) || isDef(image.lastInUseAt))) {
            return { inUseCount: image.inUseCount, lastInUseAt: image.lastInUseAt }
         }
      }
      var token = response.nextToken
      if (!token) return {}
      if (tokens.has(token) || tokens.size >= 4) throw new Error("Inspector runtime usage pagination limit reached")
      tokens.add(token)
      params.nextToken = token
   } while (true)
}

/**
 * <odoc>
 * <key>AWS.ECR_DescribeRepositories(aRegion, params) : Array</key>
 * List all repositories on aRegion. Optionally you can provide extra params.\
 * \
 * Refer to: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_DescribeRepositories.html\
 * \
 * </odoc>
 */
AWS.prototype.ECR_DescribeRepositories = function(aRegion, params) {
    var aURL
    aRegion = _$(aRegion).isString().default(this.region)
    params    = _$(params).isMap().default({})

    aURL = "https://ecr." + aRegion + ".amazonaws.com/"
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())

    var _res = this.postURLEncoded(aURL, aURI, "", params, "ecr", aHost, aRegion, {
       "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.DescribeRepositories"
    }, __, "application/x-amz-json-1.1")

    var res
    if (isDef(_res) && isDef(_res.nextToken)) {
       res = _res.repositories.concat(this.ECR_DescribeRepositories(aRegion, merge(params, { nextToken: _res.nextToken })))
    } else {
       res = _res
    }
    return (isDef(res.repositories) ? res.repositories : res)
}

/**
 * <odoc>
 * <key>AWS.ECR_BatchGetImage(aRegion, aRepoName, aImageTag, params) : Map</key>
 * Gets detailed information for an aImageTag from aRepoName on aRegion. Optionally you can provide extra params.\
 * \
 * Refer to: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_BatchGetImage.html\
 * \
 * </odoc>
 */
AWS.prototype.ECR_BatchGetImage = function(aRegion, aRepoName, aImageTag, params) {
   var aURL
   aRegion   = _$(aRegion, "aRegion").isString().default(this.region)
   params    = _$(params, "params").isMap().default({})
   aRepoName = _$(aRepoName, "aRepoName").isString().$_()
   aImageTag = _$(aImageTag, "aImageTag").isString().$_()

   aURL = "https://ecr." + aRegion + ".amazonaws.com/"
   var url = new java.net.URL(aURL)
   var aHost = String(url.getHost())
   var aURI = String(url.getPath())

   params.repositoryName      = aRepoName
   params.acceptMediaTypes    = [ 
      "application/vnd.docker.distribution.manifest.v1+json",
      "application/vnd.docker.distribution.manifest.v2+json",
      "application/vnd.oci.image.manifest.v1+json" 
   ]
   params.imageIds            = [ { imageTag: aImageTag } ]

   var _res = this.postURLEncoded(aURL, aURI, "", params, "ecr", aHost, aRegion, {
      "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.BatchGetImage"
   }, __, "application/x-amz-json-1.1")

   if (isDef(_res) && isArray(_res.images) && _res.images.length > 0) return _res.images[0]

   return _res
}

/**
 * <odoc>
 * <key>AWS.ECR_ReadRegistryJSON(aRegion, aRegistryId, aRepoName, aKind, aDigest) : Map</key>
 * Reads a private registry manifest or configuration blob by digest, with bounded response size.
 * </odoc>
 */
AWS.prototype.ECR_ReadRegistryJSON = function(aRegion, aRegistryId, aRepoName, aKind, aDigest) {
   aRegion = _$(aRegion, "region").isString().default(this.region)
   const registry = String(aRegistryId)
   if (!/^\d{12}$/.test(registry) || !/^[a-z0-9-]+$/.test(aRegion) ||
       !/^[a-z0-9]+(?:[._-]+[a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-]+[a-z0-9]+)*)*$/.test(aRepoName) ||
       !/^(manifests|blobs)$/.test(aKind) || !/^sha256:[0-9a-f]{64}$/.test(aDigest)) {
      throw new Error("Invalid private ECR registry reference")
   }

   const suffix = aRegion.startsWith("cn-") ? "amazonaws.com.cn" : "amazonaws.com"
   const host = registry + ".dkr.ecr." + aRegion + "." + suffix
   const token = this.ECR_GetAuthorizationToken(aRegion)
   if (!token || !isString(token.authorizationToken) || !/^[A-Za-z0-9+/=]+$/.test(token.authorizationToken)) {
      throw new Error("Private ECR registry authorization unavailable")
   }

   const limit = aKind == "manifests" ? 4 * 1024 * 1024 : 1024 * 1024
   const deadline = now() + 12000
   const media = [
      "application/vnd.oci.image.index.v1+json", "application/vnd.docker.distribution.manifest.list.v2+json",
      "application/vnd.oci.image.manifest.v1+json", "application/vnd.docker.distribution.manifest.v2+json",
      "application/vnd.oci.artifact.manifest.v1+json"
   ].join(", ")
   const registryURL = new java.net.URL("https://" + host + "/v2/" + aRepoName + "/" + aKind + "/" + aDigest)
   const request = (url, authorized) => {
      const connection = url.openConnection()
      connection.setInstanceFollowRedirects(false)
      connection.setConnectTimeout(5000)
      connection.setReadTimeout(5000)
      if (authorized) {
         connection.setRequestProperty("Authorization", "Basic " + token.authorizationToken)
         if (aKind == "manifests") connection.setRequestProperty("Accept", media)
      }

      try {
         const status = Number(connection.getResponseCode())
         if (authorized && aKind == "blobs" && [301, 302, 303, 307, 308].indexOf(status) >= 0) {
            const location = connection.getHeaderField("Location")
            if (location == null) throw new Error("Missing ECR blob redirect")
            return { redirect: String(location) }
         }
         if (status != 200) {
            const error = new Error("ECR registry returned HTTP " + status)
            error.httpStatus = status == 404 ? 404 : status == 401 || status == 403 ? 403 : 503
            throw error
         }
         if (connection.getContentLengthLong() > limit) throw new Error("ECR metadata exceeds the size limit")
         const stream = connection.getInputStream()
         const output = new java.io.ByteArrayOutputStream()
         const buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192)
         try {
            var count
            while ((count = stream.read(buffer)) != -1) {
               if (now() > deadline || output.size() + count > limit) throw new Error("ECR metadata exceeds the read limit")
               output.write(buffer, 0, count)
            }
         } finally { stream.close() }
         const bytes = output.toByteArray()
         if ("sha256:" + sha256(bytes) != aDigest) throw new Error("ECR metadata digest mismatch")
         const result = JSON.parse(String(new java.lang.String(bytes, java.nio.charset.StandardCharsets.UTF_8)))
         if (!isMap(result)) throw new Error("Invalid ECR metadata")
         return { value: result }
      } finally { connection.disconnect() }
   }

   const first = request(registryURL, true)
   if (!first.redirect) return first.value

   // Keep AWS credentials on the registry host when the blob is served by signed S3 URL.
   const url = new java.net.URL(registryURL, first.redirect)
   const redirectHost = String(url.getHost())
   const s3 = redirectHost.slice(0, -("." + suffix).length).split(".")
   if (String(url.getProtocol()) != "https" || url.getUserInfo() != null ||
       (url.getPort() != -1 && url.getPort() != 443) || !redirectHost.endsWith("." + suffix) ||
       !s3.some(label => /^s3(?:-[a-z0-9-]+)?$/.test(label))) {
      throw new Error("Unsupported ECR blob redirect")
   }
   return request(url, false).value
}

/**
 * <odoc>
 * <key>AWS.ECR_BatchDeleteImage(aRegion, aRepoName, aImageTag, params) : Map</key>
 * Deletes an aImageTag from aRepoName on aRegion. Optionally you can provide extra params.\
 * \
 * Refer to: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_BatchDeleteImage.html\
 * \
 * </odoc>
 */
AWS.prototype.ECR_BatchDeleteImage = function(aRegion, aRepoName, aImageTag, params) {
   var aURL
   aRegion   = _$(aRegion, "aRegion").isString().default(this.region)
   params    = _$(params, "params").isMap().default({})
   aRepoName = _$(aRepoName, "aRepoName").isString().$_()
   aImageTag = _$(aImageTag, "aImageTag").isString().$_()

   aURL = "https://ecr." + aRegion + ".amazonaws.com/"
   var url = new java.net.URL(aURL)
   var aHost = String(url.getHost())
   var aURI = String(url.getPath())

   params.repositoryName      = aRepoName
   params.imageIds            = [ { imageTag: aImageTag } ]

   var _res = this.postURLEncoded(aURL, aURI, "", params, "ecr", aHost, aRegion, {
      "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.BatchDeleteImage"
   }, __, "application/x-amz-json-1.1")

   if (isDef(_res) && isArray(_res.imageIds) && _res.imageIds.length > 0) return _res.imageIds[0]

   return _res
}

/**
 * <odoc>
 * <key>AWS.ECR_DescribeImageScanFindings(aRegion, aRepoName, aImageDigest, params) : Map</key>
 * List all scan findings for aImageDigest (from ECR_ListImages) from aRepoName on aRegion. Optionally you can provide extra params.
 * \
 * Refer to: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_DescribeImageScanFindings.html\
 * \
 * </odoc>
 */
AWS.prototype.ECR_DescribeImageScanFindings = function(aRegion, aRepoName, aImageDigest, params) {
    var aURL
    aRegion = _$(aRegion).isString().default(this.region)
    aRepoName = _$(aRepoName).isString().$_()
    params    = _$(params).isMap().default({})

    aURL = "https://ecr." + aRegion + ".amazonaws.com/"
    var url = new java.net.URL(aURL)
    var aHost = String(url.getHost())
    var aURI = String(url.getPath())

    params.repositoryName      = aRepoName
    params.imageId             = { imageDigest: aImageDigest }

    return this.postURLEncoded(aURL, aURI, "", params, "ecr", aHost, aRegion, {
       "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.DescribeImageScanFindings"
    }, void 0, "application/x-amz-json-1.1");
}

/**
 * <odoc>
 * <key>AWS.ECR_GetRepositoryPolicy(aRegion, aRepoName) : Map</key>
 * Get the repository policy for aRepoName on aRegion.\
 * \
 * Refer to: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_GetRepositoryPolicy.html\
 * \
 * </odoc>
 */
AWS.prototype.ECR_GetAuthorizationToken = function(aRegion) {
   var aURL
   aRegion = _$(aRegion).isString().default(this.region)

   aURL = "https://ecr." + aRegion + ".amazonaws.com/"
   var url = new java.net.URL(aURL)
   var aHost = String(url.getHost())
   var aURI = String(url.getPath())

   var _res = this.postURLEncoded(aURL, aURI, "", {}, "ecr", aHost, aRegion, {
      "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.GetAuthorizationToken"
   }, __, "application/x-amz-json-1.1")

   if (isDef(_res) && isDef(_res.authorizationData)) {
      return _res.authorizationData[0]
   }  
}

/**
 * <odoc>
 * <key>AWS.ECR_BatchDeleteImage(Region, aRepoName, aImageTag, params)</key>
 * Deletes a single or multiple (if an array) aImageTag from aRepoName on aRegion. 
 * Optionally you can provide extra params.
 * </odoc>
 */
AWS.prototype.ECR_BatchDeleteImage = function(aRegion, aRepoName, aImageTag, params) {
   var aURL
   aRegion   = _$(aRegion, "aRegion").isString().default(this.region)
   params    = _$(params, "params").isMap().default({})
   aRepoName = _$(aRepoName, "aRepoName").isString().$_()

   aURL = "https://ecr." + aRegion + ".amazonaws.com/"
   var url = new java.net.URL(aURL)
   var aHost = String(url.getHost())
   var aURI = String(url.getPath())

   params.repositoryName = aRepoName

   // If aImageTag is an array, validate each element; otherwise, wrap as [{ imageTag: aImageTag }]
   if (isArray(aImageTag)) {
      // Validate each element in the array
      for (var i = 0; i < aImageTag.length; i++) {
         var tagObj = aImageTag[i];
         if (
            !isMap(tagObj) ||
            (
               !(isDef(tagObj.imageTag) && isString(tagObj.imageTag)) &&
               !(isDef(tagObj.imageDigest) && isString(tagObj.imageDigest))
            )
         ) {
            throw new Error("Each element in aImageTag array must be an object with either an imageTag or imageDigest string property. Invalid element at index " + i + ": " + stringify(tagObj));
         }
      }
      params.imageIds = aImageTag
   } else if (isString(aImageTag)) {
      params.imageIds = [ { imageTag: aImageTag } ]
   } else {
      throw new Error("aImageTag must be a string or an array of objects with imageTag or imageDigest properties")
   }

   return this.postURLEncoded(aURL, aURI, "", params, "ecr", aHost, aRegion, {
      "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.BatchDeleteImage"
   }, __, "application/x-amz-json-1.1")
}