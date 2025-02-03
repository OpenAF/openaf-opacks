// Author: Nuno Aguiar
// RDS

loadLib("aws_core.js");

/**
 * RDS =========================
 */
/**  
 * <odoc>
 * <key>AWS.RDS_DescribeDBClusters(aRegion, aDBClusterIdentifier, aMaxRecords, aMarker, aIncludeShared)</key>
 * Tries to retrieve the aRegion RDS DB clusters information optionally providing aDBClusterIdentifier, aMaxRecords, aIncludeShared boolean and/or aMarker.
 * See more in https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DescribeDBClusters.html
 * </odoc>
 */
AWS.prototype.RDS_DescribeDBClusters = function(aRegion, aDBClusterIdentifier, aMaxRecords, aMarker, aIncludeShared) {
    aRegion = _$(aRegion).isString().default(this.region);
    var aURL = "https://rds." + aRegion + ".amazonaws.com/";
    
    var params = { 
       Action: "DescribeDBClusters", 
       MaxRecords: aMaxRecords,
       IncludeShared: aIncludeShared,
       Marker: aMarker,
       DBClusterIdentifier: aDBClusterIdentifier,
       Version: "2014-10-31"
    };
 
    aURL += "?" + $rest().query(params);
 
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var res = this.getURLEncoded(aURL, aURI, $rest().query(params), {}, "rds", aHost, aRegion);
    if (isDef(res.error)) return res;
 
    res = af.fromXML2Obj(res);
 
    if (isDef(res.DescribeDBClustersResponse) && isDef(res.DescribeDBClustersResponse.DescribeDBClustersResult)) {
       res = res.DescribeDBClustersResponse.DescribeDBClustersResult;
    }
    return res;
 };
 
 /** 
  * <odoc>
  * <key>AWS.RDS_DescribeDBClusters(aRegion, aDBClusterIdentifier, aMaxRecords, aMarker, aIncludeShared)</key>
  * Tries to retrieve the aRegion RDS DB clusters information optionally providing aDBClusterIdentifier, aMaxRecords, aIncludeShared boolean and/or aMarker.
  * See more in https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DescribeDBInstances.html
  * </odoc>
  */
 AWS.prototype.RDS_DescribeDBInstances = function(aRegion, aDBClusterIdentifier, aMaxRecords, aMarker, aIncludeShared) {
    aRegion = _$(aRegion).isString().default(this.region);
    var aURL = "https://rds." + aRegion + ".amazonaws.com/";
    
    var params = { 
       Action: "DescribeDBInstances", 
       MaxRecords: aMaxRecords,
       IncludeShared: aIncludeShared,
       Marker: aMarker,
       DBClusterIdentifier: aDBClusterIdentifier,
       Version: "2014-10-31"
    };
 
    aURL += "?" + $rest().query(params);
 
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var res = this.getURLEncoded(aURL, aURI, $rest().query(params), {}, "rds", aHost, aRegion);
    res = af.fromXML2Obj(res);
 
    if (isDef(res.DescribeDBInstancesResponse) && isDef(res.DescribeDBInstancesResponse.DescribeDBInstancesResult)) {
       res = res.DescribeDBInstancesResponse.DescribeDBInstancesResult;
    }
    return res;
 };
 
 /** 
  * <odoc>
  * <key>AWS.RDS_ModifyCurrentDBClusterCapacity(aRegion, aDBClusterIdentifier, aCapacity, aSecondsBeforeTimeout, aTimeoutAction)</key>
  * Tries to change the aRegion RDS DB cluster to aCapacity (from 2 to 384) for aDBClusterIdentifier optionally providing aSecondsBeforeTimeout and aTimeoutAction (e.g. ForceApplyCapacityChange or RollbackCapacityChange).
  * See more in https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_ModifyCurrentDBClusterCapacity.html
  * </odoc>
  */
 AWS.prototype.RDS_ModifyCurrentDBClusterCapacity = function(aRegion, aDBClusterIdentifier, aCapacity, aSecondsBeforeTimeout, aTimeoutAction) {
    aRegion = _$(aRegion).isString().default(this.region);
    var aURL = "https://rds." + aRegion + ".amazonaws.com/";
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = { 
       Action: "ModifyCurrentDBClusterCapacity", 
       Capacity: aCapacity,
       SecondsBeforeTimeout: aSecondsBeforeTimeout,
       TimeoutAction: aTimeoutAction,
       DBClusterIdentifier: aDBClusterIdentifier,
       Version: "2014-10-31"
    };
 
    return af.fromXML2Obj(this.postURLEncoded(aURL, aURI, "", params, "rds", aHost, aRegion));
 };
 
 /**
  * <odoc>
  * <key>AWS.RDSDATA_ExecuteSQL(aRegion, aSecretArn, aDBArn, aSQL, aTransactionId, aDatabase, aSchema) : Map</key>
  * Given aRegion, aSecretArn, aDBArn, aSQL, aTransactionId, aDatabase and aSchema will execute the aSQL, on the specified RDS,
  * returning the result formatted as JSON.\
  * \
  * See more in https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_ExecuteStatement.html
  * </odoc>
  */
 AWS.prototype.RDSDATA_ExecuteSQL = function(aRegion, aSecretArn, aDBArn, aSQL, aTransactionId, aDatabase, aSchema) {
      aRegion = _$(aRegion).isString().default(this.region)
      var aURL = "https://rds-data." + aRegion + ".amazonaws.com/Execute"
      var url = new java.net.URL(aURL)
      var aHost = String(url.getHost())
      var aURI = String(url.getPath())
   
      var params = { 
         secretArn: aSecretArn,
         resourceArn: aDBArn,
         sql: aSQL,
         database: aDatabase,
         schema: aSchema,
         formatRecordsAs: "JSON",
         transactionId: aTransactionId
      }
   
      var _r = this.postURLEncoded(aURL, aURI, "", params, "rds-data", aHost, aRegion, {}, __, "application/json")
      if (isDef(_r.formattedRecords)) {
         _r.formattedRecords = jsonParse(_r.formattedRecords)
      }
      return _r
}

/**
 * <odoc>
 * <key>AWS.RDSDATA_BeginTransaction(aRegion, aSecretArn, aDBArn, aDatabase, aSchema) : Map</key>
 * Given aRegion, aSecretArn, aDBArn, aDatabase and aSchema will begin a transaction on the specified RDS, returning the transactionId.
 * \
 * See more in https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_BeginTransaction.html
 * </odoc>
 */
AWS.prototype.RDSDATA_BeginTransaction = function(aRegion, aSecretArn, aDBArn, aDatabase, aSchema) {
   aRegion = _$(aRegion).isString().default(this.region)
   var aURL = "https://rds-data." + aRegion + ".amazonaws.com/BeginTransaction"
   var url = new java.net.URL(aURL)
   var aHost = String(url.getHost())
   var aURI = String(url.getPath())

   var params = { 
      secretArn: aSecretArn,
      resourceArn: aDBArn,
      database: aDatabase,
      schema: aSchema
   }

   return this.postURLEncoded(aURL, aURI, "", params, "rds-data", aHost, aRegion, {}, __, "application/json")
}

/**
 * <odoc>
 * <key>AWS.RDSDATA_CommitTransaction(aRegion, aSecretArn, aDBArn, aTransactionId) : Map</key>
 * Given aRegion, aSecretArn, aDBArn and aTransactionId will commit the transaction on the specified RDS.
 * \
 * See more in https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_CommitTransaction.html
 * </odoc>
 */
AWS.prototype.RDSDATA_CommitTransaction = function(aRegion, aSecretArn, aDBArn, aTransactionId) {
   aRegion = _$(aRegion).isString().default(this.region)
   var aURL = "https://rds-data." + aRegion + ".amazonaws.com/CommitTransaction"
   var url = new java.net.URL(aURL)
   var aHost = String(url.getHost())
   var aURI = String(url.getPath())

   var params = { 
      secretArn: aSecretArn,
      resourceArn: aDBArn,
      transactionId: aTransactionId
   }

   return this.postURLEncoded(aURL, aURI, "", params, "rds-data", aHost, aRegion, {}, __, "application/json")
}

/**
 * <odoc>
 * <key>AWS.RDSDATA_RollbackTransaction(aRegion, aSecretArn, aDBArn, aTransactionId) : Map</key>
 * Given aRegion, aSecretArn, aDBArn and aTransactionId will rollback the transaction on the specified RDS.
 * \
 * See more in https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_RollbackTransaction.html
 * </odoc>
 */
AWS.prototype.RDSDATA_RollbackTransaction = function(aRegion, aSecretArn, aDBArn, aTransactionId) {
   aRegion = _$(aRegion).isString().default(this.region)
   var aURL = "https://rds-data." + aRegion + ".amazonaws.com/RollbackTransaction"
   var url = new java.net.URL(aURL)
   var aHost = String(url.getHost())
   var aURI = String(url.getPath())

   var params = { 
      secretArn: aSecretArn,
      resourceArn: aDBArn,
      transactionId: aTransactionId
   }

   return this.postURLEncoded(aURL, aURI, "", params, "rds-data", aHost, aRegion, {}, __, "application/json")
}