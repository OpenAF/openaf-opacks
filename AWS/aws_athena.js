// Author: Nuno Aguiar
// Athena

loadLib("aws_core.js");
loadLib("aws_s3.js");

/**
 * <odoc>
 * <key>AWS.ATHENA_ListQueryExecutions(aRegion, aNextToken, aWorkGroup, aMaxResults) : Map</key>
 * List query executions.
 * </odoc>
 */
AWS.prototype.ATHENA_ListQueryExecutions = function(aRegion, aNextToken, aWorkGroup, aMaxResults) {
    aRegion     = _$(aRegion).isString().default(this.region);
    aNextToken  = _$(aNextToken).isString().default(__);
    aWorkGroup  = _$(aWorkGroup).isString().default(__);
    aMaxResults = _$(aMaxResults).isNumber().default(50);
 
    var res = this.post("athena", aRegion, __, "", {
       MaxResults: aMaxResults,
       NextToken : aNextToken,
       WorkGroup : aWorkGroup
    }, { "X-Amz-Target": "AmazonAthena.ListQueryExecutions" }, __, "application/x-amz-json-1.1");
 
    return res;
}; 

/**
 * <odoc>
 * <key>AWS.ATHENA_GetQueryExecution(aRegion, aQueryExecutionId) : Map</key>
 * Retrieves information about a previous query execution aQueryExecutionId
 * </odoc>
 */
 AWS.prototype.ATHENA_GetQueryExecution = function(aRegion, aQueryExecutionId) {
    aRegion            = _$(aRegion).isString().default(this.region);
    aQueryExecutionId  = _$(aQueryExecutionId).isString().$_();

    var res = this.post("athena", aRegion, __, "", {
       QueryExecutionId: aQueryExecutionId
    }, { "X-Amz-Target": "AmazonAthena.GetQueryExecution" }, __, "application/x-amz-json-1.1");

    return res;
};

/**
 * <odoc>
 * <key>AWS.ATHENA_StartQueryExecution(aRegion, aQueryString, aOptions) : Map</key>
 * Starts a new Athena query execution for aQueryString on aRegion. Returns a Map with the new QueryExecutionId.
 * aOptions can include:\
 * \
 *    - database                - the database to run the query against\
 *    - catalog                 - the data catalog to run the query against\
 *    - workGroup                - the Athena work group to use\
 *    - outputLocation           - a s3://bucket/prefix/ location to store the results (not needed if the work group has one configured)\
 *    - encryptionConfiguration  - a Map with EncryptionOption (and, if needed, KmsKey) for the results\
 *    - clientRequestToken       - a client-provided idempotency token\
 *    - executionParameters      - an array of values for a parameterized aQueryString\
 * \
 * </odoc>
 */
AWS.prototype.ATHENA_StartQueryExecution = function(aRegion, aQueryString, aOptions) {
   aRegion      = _$(aRegion).isString().default(this.region);
   aQueryString = _$(aQueryString, "aQueryString").isString().$_();
   aOptions     = _$(aOptions).isMap().default({});

   var body = {
      QueryString           : aQueryString,
      ClientRequestToken    : aOptions.clientRequestToken,
      WorkGroup              : aOptions.workGroup,
      ExecutionParameters    : aOptions.executionParameters,
      QueryExecutionContext  : (isDef(aOptions.database) || isDef(aOptions.catalog)) ? {
         Database: aOptions.database,
         Catalog : aOptions.catalog
      } : __,
      ResultConfiguration    : (isDef(aOptions.outputLocation) || isDef(aOptions.encryptionConfiguration)) ? {
         OutputLocation         : aOptions.outputLocation,
         EncryptionConfiguration: aOptions.encryptionConfiguration
      } : __
   };

   var res = this.post("athena", aRegion, __, "", body, { "X-Amz-Target": "AmazonAthena.StartQueryExecution" }, __, "application/x-amz-json-1.1");

   return res;
};

/**
 * <odoc>
 * <key>AWS.ATHENA_StopQueryExecution(aRegion, aQueryExecutionId) : Map</key>
 * Cancels a running Athena query execution aQueryExecutionId on aRegion.
 * </odoc>
 */
AWS.prototype.ATHENA_StopQueryExecution = function(aRegion, aQueryExecutionId) {
   aRegion           = _$(aRegion).isString().default(this.region);
   aQueryExecutionId = _$(aQueryExecutionId, "aQueryExecutionId").isString().$_();

   var res = this.post("athena", aRegion, __, "", {
      QueryExecutionId: aQueryExecutionId
   }, { "X-Amz-Target": "AmazonAthena.StopQueryExecution" }, __, "application/x-amz-json-1.1");

   return res;
};

/**
 * <odoc>
 * <key>AWS.ATHENA_GetQueryResults(aRegion, aQueryExecutionId, aNextToken, aMaxResults) : Map</key>
 * Retrieves a page of results (raw ResultSet with ColumnInfo and Rows) for the finished query execution
 * aQueryExecutionId on aRegion, optionally paginating with aNextToken and limiting to aMaxResults rows.
 * </odoc>
 */
AWS.prototype.ATHENA_GetQueryResults = function(aRegion, aQueryExecutionId, aNextToken, aMaxResults) {
   aRegion           = _$(aRegion).isString().default(this.region);
   aQueryExecutionId = _$(aQueryExecutionId, "aQueryExecutionId").isString().$_();
   aNextToken        = _$(aNextToken).isString().default(__);
   aMaxResults       = _$(aMaxResults).isNumber().default(__);

   var res = this.post("athena", aRegion, __, "", {
      QueryExecutionId: aQueryExecutionId,
      NextToken       : aNextToken,
      MaxResults      : aMaxResults
   }, { "X-Amz-Target": "AmazonAthena.GetQueryResults" }, __, "application/x-amz-json-1.1");

   return res;
};

/**
 * <odoc>
 * <key>AWS.ATHENA_GetQueryResultsAsArray(aRegion, aQueryExecutionId, aOptions) : Array</key>
 * Retrieves all (or up to aOptions.maxPages) pages of results for the finished query execution aQueryExecutionId
 * on aRegion and converts them into an array of Maps keyed by column label. aOptions can include:\
 * \
 *    - maxResults    - max rows per underlying GetQueryResults page\
 *    - maxPages      - max number of pages to fetch (defaults to -1 = all pages)\
 *    - skipHeaderRow - if true (default) skips the duplicated header row Athena includes as the first result row\
 * \
 * </odoc>
 */
AWS.prototype.ATHENA_GetQueryResultsAsArray = function(aRegion, aQueryExecutionId, aOptions) {
   aRegion           = _$(aRegion).isString().default(this.region);
   aQueryExecutionId = _$(aQueryExecutionId, "aQueryExecutionId").isString().$_();
   aOptions          = _$(aOptions).isMap().default({});

   var maxResults    = _$(aOptions.maxResults).isNumber().default(__);
   var maxPages      = _$(aOptions.maxPages).isNumber().default(-1);
   var skipHeaderRow = _$(aOptions.skipHeaderRow).isBoolean().default(true);

   var res = [], nextToken = __, page = 0, columns = __;

   do {
      var r = this.ATHENA_GetQueryResults(aRegion, aQueryExecutionId, nextToken, maxResults);
      if (isDef(r.error)) throw af.toSLON(r.error);

      var rs = r.ResultSet;
      if (isUnDef(columns)) columns = rs.ResultSetMetadata.ColumnInfo.map(c => c.Label);

      var rows = _$(rs.Rows).isArray().default([]);
      for (var i = 0; i < rows.length; i++) {
         if (page == 0 && i == 0 && skipHeaderRow) continue;

         var cells = rows[i].Data;
         var row = {};
         for (var j = 0; j < columns.length; j++) {
            row[columns[j]] = (isDef(cells[j]) && isDef(cells[j].VarCharValue)) ? cells[j].VarCharValue : __;
         }
         res.push(row);
      }

      nextToken = r.NextToken;
      page++;
   } while (isDef(nextToken) && (maxPages < 0 || page < maxPages));

   return res;
};

/**
 * <odoc>
 * <key>AWS.ATHENA_DeleteQueryResults(aRegion, aQueryExecutionId, aOptions) : Map</key>
 * Athena has no native "delete query results" API call: the results are just a file in S3 (the query's
 * ResultConfiguration.OutputLocation). This looks up that location, via AWS.ATHENA_GetQueryExecution, and deletes
 * it directly from S3 (using AWS.S3_DeleteObject). If the output location is a "folder" (e.g. CTAS/UNLOAD queries)
 * all objects under that prefix are listed (AWS.S3_ListObjectsV2) and deleted. Returns a Map with Bucket, the
 * Deleted keys and any per-key Errors. aOptions can include:\
 * \
 *    - deleteMetadataFile - if true (default) also (best-effort) deletes the ".metadata" sidecar file Athena\
 *                            writes alongside a single-file (e.g. SELECT) query result's key\
 * \
 * </odoc>
 */
AWS.prototype.ATHENA_DeleteQueryResults = function(aRegion, aQueryExecutionId, aOptions) {
   aRegion           = _$(aRegion).isString().default(this.region);
   aQueryExecutionId = _$(aQueryExecutionId, "aQueryExecutionId").isString().$_();
   aOptions          = _$(aOptions).isMap().default({});

   var deleteMetadataFile = _$(aOptions.deleteMetadataFile).isBoolean().default(true);

   var qe = this.ATHENA_GetQueryExecution(aRegion, aQueryExecutionId);
   if (isDef(qe.error)) throw af.toSLON(qe.error);
   if (isUnDef(qe.QueryExecution)) throw "Query execution not found: " + aQueryExecutionId;

   var rc = qe.QueryExecution.ResultConfiguration;
   if (isUnDef(rc) || isUnDef(rc.OutputLocation)) throw "No S3 result output location found for query execution: " + aQueryExecutionId;

   var loc = this.S3_ParseURL(rc.OutputLocation);
   var keysToDelete = [];

   if (loc.Key.length == 0 || loc.Key.endsWith("/")) {
      var continuationToken = __;
      do {
         var list = this.S3_ListObjectsV2(aRegion, loc.Bucket, loc.Key, __, continuationToken);
         var lbr = list && list.ListBucketResult;
         var contents = _$(lbr && lbr.Contents).default([]);
         if (!isArray(contents)) contents = [contents];
         keysToDelete = keysToDelete.concat(contents.map(c => c.Key));

         continuationToken = (lbr && String(lbr.IsTruncated) == "true") ? lbr.NextContinuationToken : __;
      } while (isDef(continuationToken));
   } else {
      keysToDelete.push(loc.Key);
      if (deleteMetadataFile) keysToDelete.push(loc.Key + ".metadata");
   }

   var deleted = [], errors = [];
   keysToDelete.forEach(k => {
      var r = this.S3_DeleteObject(aRegion, loc.Bucket, k);
      if (isMap(r) && isDef(r.error)) {
         errors.push({ key: k, error: r.error });
      } else {
         deleted.push(k);
      }
   });

   return { Bucket: loc.Bucket, Deleted: deleted, Errors: errors };
};

/**
 * <odoc>
 * <key>AWS.ATHENA_Query(aRegion, aQueryString, aOptions) : Map</key>
 * High-level helper that starts an Athena query (AWS.ATHENA_StartQueryExecution) for aQueryString on aRegion, polls
 * (AWS.ATHENA_GetQueryExecution) until it finishes, and optionally fetches (AWS.ATHENA_GetQueryResultsAsArray)
 * and/or deletes (AWS.ATHENA_DeleteQueryResults) the results. Returns a Map with QueryExecutionId, QueryExecution
 * (the final status/statistics), Results (if fetched), ResultsDeleted (if deleted) and, if the query didn't
 * succeed, an error with the failure reason. aOptions accepts everything AWS.ATHENA_StartQueryExecution does, plus:\
 * \
 *    - pollIntervalMs - milliseconds between status polls (default 1000)\
 *    - timeoutMs      - milliseconds to wait for the query to finish before throwing (default 300000)\
 *    - fetchResults   - if true (default) fetches the results as an array once the query succeeds\
 *    - skipHeaderRow  - passed through to AWS.ATHENA_GetQueryResultsAsArray (defaults to true for DML\
 *                        statements like SELECT, false for DDL/UTILITY statements like SHOW/DESCRIBE)\
 *    - maxResultPages - passed through to AWS.ATHENA_GetQueryResultsAsArray as maxPages (default -1 = all pages)\
 *    - deleteResults  - if true deletes the query results from S3 once fetched (default false)\
 * \
 * </odoc>
 */
AWS.prototype.ATHENA_Query = function(aRegion, aQueryString, aOptions) {
   aRegion      = _$(aRegion).isString().default(this.region);
   aQueryString = _$(aQueryString, "aQueryString").isString().$_();
   aOptions     = _$(aOptions).isMap().default({});

   var pollIntervalMs = _$(aOptions.pollIntervalMs).isNumber().default(1000);
   var timeoutMs      = _$(aOptions.timeoutMs).isNumber().default(300000);
   var fetchResults   = _$(aOptions.fetchResults).isBoolean().default(true);
   var deleteResults  = _$(aOptions.deleteResults).isBoolean().default(false);
   var skipHeaderRow  = _$(aOptions.skipHeaderRow).isBoolean().default(__);
   var maxResultPages = _$(aOptions.maxResultPages).isNumber().default(-1);

   var start = this.ATHENA_StartQueryExecution(aRegion, aQueryString, aOptions);
   if (isDef(start.error)) throw af.toSLON(start.error);
   var queryExecutionId = start.QueryExecutionId;

   var startTime = now(), qe;
   do {
      qe = this.ATHENA_GetQueryExecution(aRegion, queryExecutionId);
      if (isDef(qe.error)) throw af.toSLON(qe.error);

      var state = qe.QueryExecution.Status.State;
      if (state == "SUCCEEDED" || state == "FAILED" || state == "CANCELLED") break;

      if ((now() - startTime) > timeoutMs) throw "Timeout waiting for Athena query " + queryExecutionId + " to finish (last state: " + state + ")";
      sleep(pollIntervalMs);
   } while (true);

   var res = {
      QueryExecutionId: queryExecutionId,
      QueryExecution  : qe.QueryExecution
   };

   if (qe.QueryExecution.Status.State != "SUCCEEDED") {
      res.error = qe.QueryExecution.Status.StateChangeReason;
      return res;
   }

   // Athena only prepends a duplicated header row to DML (e.g. SELECT) results, not to DDL/UTILITY
   // statements (e.g. SHOW, DESCRIBE) where the first row is real data.
   if (isUnDef(skipHeaderRow)) skipHeaderRow = (qe.QueryExecution.StatementType == "DML" || isUnDef(qe.QueryExecution.StatementType));

   if (fetchResults) {
      res.Results = this.ATHENA_GetQueryResultsAsArray(aRegion, queryExecutionId, {
         skipHeaderRow: skipHeaderRow,
         maxPages     : maxResultPages
      });
   }

   if (deleteResults) res.ResultsDeleted = this.ATHENA_DeleteQueryResults(aRegion, queryExecutionId);

   return res;
};