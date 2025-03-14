// Author: Nuno Aguiar
// AWS Secrets OpenAF sbucket implementation

// Usage:
//   loadLib("aws_secrets_sec.js")
//   $sec("awssecrets", "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-test-secret").get("SecretString")

loadLib("aws_core.js")
loadLib("aws_secrets.js")

ow.loadCh()
/**
 * <odoc>
 * <key>ow.ch.types.awssecrets</key>
 * The AWS Secrets Manager implementation for the $sec. Assumes all AWS configuration is already available through
 * environment variables and/or IMDS (with AWS_REGION set)\
 * \
 * Usage:\
 *  loadLib("aws_secrets_sec.js")\
 *  $ch("___openaf_sbuckets-awssecrets").create("awssecrets", {})\
 *  $sec("awssecrets", "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-test-secret").get("SecretString")\
 * \
 * </odoc>
 */
ow.ch.__types.awssecrets = {
    __channels: {},
    create       : function(aName, shouldCompress, options) {
      this.__channels[aName] = _$(options, "options").isMap().default({})
      this.__channels[aName]._aws = new AWS()
    },
    destroy      : function(aName) {
      delete this.__channels[aName]
    },
    size         : function(aName) {
      return 0
    },
    forEach      : function(aName, aFunction) {
      throw "Not implemented"
    },
    getAll       : function(aName, full) {
      throw "Not implemented"
    },
    getKeys      : function(aName, full) {
      return []
    },
    getSortedKeys: function(aName, full) {
      return []
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
      return {}
    },
    set          : function(aName, aK, aV, aTimestamp) {
      return {}
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
      return {}
    },
    unsetAll     : function(aName, aKs, aVs, aTimestamp) {
      return {}
    },
    get          : function(aName, aK) {
      var _res = this.__channels[aName]._aws.SECRETS_GetSecret(getEnv("AWS_REGION"), aK.sbucket)
      if (isDef(_res) && isDef(_res.SecretString)) {
        return {
            SecretString: _res.SecretString
        }
      } else {
        throw `Secret for ${aK.sbucket} could to be retrieved (${af.toSLON(_res)})`
      }
    },
    pop          : function(aName) {
      return {}
    },
    shift        : function(aName) {
      return {}
    },
    unset        : function(aName, aK, aTimestamp) {
      return {}
    }
}

// Create a new channel type awssecrets to be used with $sec
// Assumes all AWS configuration is already available through environment variables and/or IMDS (with AWS_REGION set)
// Usage:
//   $ch("___openaf_sbuckets-awssecrets").create("awssecrets", {})
//   $sec("awssecrets", "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-test-secret").get
//
$ch("___openaf_sbuckets-awssecrets").create("awssecrets", {})