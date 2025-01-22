// Author: Nuno Aguiar
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