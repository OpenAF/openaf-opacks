// Author: Nuno Aguiar
// ECR

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.ECR_ListImages(aRegion, aRepoName, params) : Map</key>
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

    return this.postURLEncoded(aURL, aURI, "", params, "ecr", aHost, aRegion, {
       "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.ListImages"
    }, void 0, "application/x-amz-json-1.1");
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