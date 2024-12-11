// Author: Nuno Aguiar
// DynamoDB

loadLib("aws_core.js");

/**
 * DYNAMO DB=======================
 */

  /**
  * <odoc>
  * <key>AWS.DYNAMO_getCh(aRegion, aTable, aChName, extraOptions) : Channel</key>
  * Creates aChName (defaults to aTable) to access a Dynamo aTable on aRegion.
  * </odoc>
  */
 AWS.prototype.DYNAMO_getCh = function(aRegion, aTable, aChName, extraOptions) {
    aRegion = _$(aRegion).isString().default(this.region);
    _$(aTable).$_("Please provide a table.");
 
    aChName = _$(aChName).isString().default(aTable);
    $ch(aChName).create(1, "dynamo", merge({
       accessKey: this.accessKey,
       secretKey: this.secretKey,
       tableName: aTable,
       region: aRegion
    }, extraOptions))
 
    return $ch(aChName);
 };
 
 /**
  * <odoc>
  * <key>AWS.DYNAMO_ListTables(aRegion) : Array</key>
  * Given aRegion returns an array with all DynamoDB tables.
  * </odoc>
  */
 AWS.prototype.DYNAMO_ListTables = function(aRegion) {
    var aURL;
    aRegion = _$(aRegion).isString().default(this.region);
    if (aRegion == "local") {
       aURL = "http://127.0.0.1:8000";
    } else {
       aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
    }
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = {
    };
 
    return this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
       "X-Amz-Target": "DynamoDB_20120810.ListTables"
    }, void 0, "application/json");
 };
 
 /**
  * <odoc>
  * <key>AWS.DYNAMO_DeleteTable(aRegion, aTableName)</key>
  * Tries to delete a DynamoDB aTableName from aRegion.
  * </odoc>
  */
 AWS.prototype.DYNAMO_DeleteTable = function(aRegion, aTableName) {
    var aURL;
    aRegion = _$(aRegion).isString().default(this.region);
    if (aRegion == "local") {
       aURL = "http://127.0.0.1:8000";
    } else {
       aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
    }
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = {
       TableName: aTableName
    };
 
    return this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
       "X-Amz-Target": "DynamoDB_20120810.DeleteTable"
    }, void 0, "application/json");
 };
 
 /**
  * <odoc>
  * <key>AWS.DYNAMO_CreateTable(aRegion, aTableName, attrDefs, keySchema, globalSecondaryIdxs, localSecondaryIdxs, tags)</key>
  * Tries to create a DynamoDB aTableName in aRegion with the provided attributeDefinitions and optional keySchema, globalSecondaryIdxs, localSecondaryIdxs and tags.
  * Please check more details in https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html.
  * \
  * Example for local:\
  *    aws.DYNAMO_CreateTable("local", "xyz", [{AttributeName: "ID", AttributeType: "S"}], [{AttributeName: "ID", KeyType: "HASH"},{AttributeName: "VAL",KeyType:"RANGE"}])
  * </odoc>
  */
 AWS.prototype.DYNAMO_CreateTable = function(aRegion, tableName, attrDefs, keySchema, globalSecondaryIdxs, localSecondaryIdxs, tags) {
    var aURL;
    aRegion = _$(aRegion).isString().default(this.region);
    if (aRegion == "local") {
       aURL = "http://127.0.0.1:8000";
    } else {
       aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
    }
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = {
       AttributeDefinitions: attrDefs,
       TableName: tableName,
       LocalSecondaryIndexes: localSecondaryIdxs,
       KeySchema: keySchema,
       GlobalSecondaryIndexes: globalSecondaryIdxs,
       BillingMode: "PAY_PER_REQUEST",
       Tags: tags
    };
 
    return this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
       "X-Amz-Target": "DynamoDB_20120810.CreateTable"
    }, void 0, "application/json");
 };
 
 AWS.prototype.__DYNAMO_Item_Deconvert = function(aMap) {
    var __translate = (v) => {
       for(var ii in v) {
          switch(ii) {
          case "N": return String(v[ii]);
          case "S": return String(v[ii]);
          case "BOOL": return Boolean(v[ii]);
          case "NULL": return null;
          case "L": 
             var ar = [];
             for(var iii in v[ii]) {
                ar.push(__translate(v[ii][iii]));
             }
             return ar;
          case "M":
             var ar = {};
             for(var iii in v[ii]) {
                ar[iii] = __translate(v[ii][iii]);
             }
             return ar;
          case "B": 
             return af.fromBase64(v);
          default:
             if (isMap(v[ii])) {
                var ar = {};
                for(var iii in v[ii]) {
                   ar[iii] = __translate(v[ii][iii]);
                }
                return ar;
             } else {
                if (isArray(v[ii])) {
                   var ar = [];
                   for(var ii in v[ii]) {
                      ar.push(__translate(v[ii][iii]));
                   }
                   return ar;
                } else {
                   return __translate(v[ii]);
                }               
             }
          }
       }
    };
 
    if (isMap(aMap)) {
       var ar = {};
       for(var ii in aMap) {
          ar[ii] = __translate(aMap[ii]);
       }
       return ar;
    }
 };
 
 AWS.prototype.__DYNAMO_Item_Convert = function(aMap) {
    var __translate = (v) => {
       if (isNumber(v)) { return { N: String(v) }; }
       if (isString(v)) { return { S: String(v) }; }
       if (isBoolean(v)) { return { BOOL: v }; }
       if (isNull(v)) { return { NULL: v }; }
       if (isArray(v)) {
          var ar = [];
          for(var ii in v) {
             ar.push(__translate(v[ii]));
          }
          return { L: ar };
       }
       if (isMap(v)) {
          var ar = {};
          for(var ii in v) {
             ar[ii] = __translate(v[ii]);
          }
          return { M: ar };
       }
       if (isByteArray(v)) {
          return { B: af.fromBytes2String(af.toBase64Bytes(v)) };
       }
    };
 
    if (isMap(aMap)) {
       var ar = {};
       for(var ii in aMap) {
          ar[ii] = __translate(aMap[ii]);
       }
       return ar;
    }
 };
 
 /**
  * <odoc>
  * <key>AWS.DYNAMO_PutItem(aRegion, aTableName, aItem, aConditionExpression, aExpressionAttrValues)</key>
  * Tries to create or change a DynamoDB aTableName item on aRegion with aItem map (note: plain json, types will be automatically detected).
  * Optionally you can provide aConditionExpression and aExpressionAttrValues (see more details in https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html).
  * </odoc>
  */
 AWS.prototype.DYNAMO_PutItem = function(aRegion, aTableName, aItem, aConditionExpression, aExpressionAttrValues) {
    var aURL;
    aRegion = _$(aRegion).isString().default(this.region);
    if (aRegion == "local") {
       aURL = "http://127.0.0.1:8000";
    } else {
       aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
    }
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = {
       TableName: aTableName,
       Item: this.__DYNAMO_Item_Convert(aItem),
       ConditionExpression: aConditionExpression,
       ExpressionAttributeValues: this.__DYNAMO_Item_Convert(aExpressionAttrValues)
    };
 
    return this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
       "X-Amz-Target": "DynamoDB_20120810.PutItem"
    }, void 0, "application/json");
 };
 
 /**
  * <odoc>
  * <key>AWS.DYNAMO_UpdateItem(aRegion, aTableName, aKeyList, aUpdateExpression, aConditionExpression, aAttributeValues, aAttributeNames, returnValues)</key>
  * Tries to update a DynamoDB aTableName item on aRegion with aKeyList map (note: plain json, types will be automatically detected), aUpdateExpression,
  * aConditionExpression, the corresponding aAttributeValues (note: plain json, types will be automatically detected), optionaly aAttributeNames list and returnValues (defaults to ALL_NEW).
  * (see more details in https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html).
  * </odoc>
  */
AWS.prototype.DYNAMO_UpdateItem = function(aRegion, aTableName, aKeyList, aUpdateExpression, aConditionExpression, aAttributeValues, aAttributeNames, returnValues) {
   var aURL;
   aRegion = _$(aRegion).isString().default(this.region);
   if (aRegion == "local") {
      aURL = "http://127.0.0.1:8000";
   } else {
      aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
   }
   var url = new java.net.URL(aURL);
   var aHost = String(url.getHost());
   var aURI = String(url.getPath());

   returnValues = _$(returnValues).isString().default("ALL_NEW");

   var params = {
      TableName: aTableName,
      Key: this.__DYNAMO_Item_Convert(aKeyList),
      UpdateExpression: aUpdateExpression,
      ConditionExpression: aConditionExpression,
      ExpressionAttributeValues: this.__DYNAMO_Item_Convert(aAttributeValues),
      ExpressionAttributeNames: aAttributeNames,
      ReturnValues: returnValues
   };
   
   var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
      "X-Amz-Target": "DynamoDB_20120810.UpdateItem"
   }, void 0, "application/json");
   if (isDef(res) && isDef(res.Attributes)) {
      res.Attributes = this.__DYNAMO_Item_Deconvert(res.Attributes);
   }
   return res;
};

 /**
  * <odoc>
  * <key>AWS.DYNAMO_GetItem(aRegion, aTableName, aKey,  aProjectionExpression, shouldConsistentRead) : Map</key>
  * Tries to retrieve an item using aKey map from a DynamoDB aTableName in aRegion. Optionally you can provide aProjectionExpression
  * and/or a shouldConsistentRead boolean (defaults to true).
  * </odoc>
  */
 AWS.prototype.DYNAMO_GetItem = function(aRegion, aTableName, aKey, aProjectionExpression, shouldConsistentRead) {
    var aURL;
    aRegion = _$(aRegion).isString().default(this.region);
    if (aRegion == "local") {
       aURL = "http://127.0.0.1:8000";
    } else {
       aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
    }
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = {
       TableName: aTableName,
       Key: this.__DYNAMO_Item_Convert(aKey),
       ProjectionExpression: aProjectionExpression,
       ConsistentRead: (isDef(shouldConsistentRead) ? shouldConsistentRead : true)
    };
 
    var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
       "X-Amz-Target": "DynamoDB_20120810.GetItem"
    }, void 0, "application/json");
    if (isDef(res.Item)) {
       res.Item = this.__DYNAMO_Item_Deconvert(res.Item);
    }
    return res;
 };
 
 /**
  * <odoc>
  * <key>AWS.DYNAMO_GetAllItems(aRegion, aTableName, aFilterExpression, aExpressionAttributeValues, shouldConsistentRead, aIndexName, aSelect) : Map</key>
  * Tries to retrieve all items from a DynamoDB aTableName on aRegion. Optionally you can provide aFilterExpression, aExpressionAttributeValues
  * a boolean shouldConsistentRead, aIndexName and aSelect (if "COUNT" won't retrieve any items, just the count). See more details 
  * in https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html.
  * </odoc>
  */
 AWS.prototype.DYNAMO_GetAllItems = function(aRegion, aTableName, aFilterExpression, aExpressionAttributeValues, shouldConsistentRead, aIndexName, aSelect) {
    var aURL;
    aRegion = _$(aRegion).isString().default(this.region);
    if (aRegion == "local") {
       aURL = "http://127.0.0.1:8000";
    } else {
       aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
    }
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = {
       TableName: aTableName,
       FilterExpression: aFilterExpression,
       ExpressionAttributeValues: aExpressionAttributeValues,
       ConsistentRead: (isDef(shouldConsistentRead) ? shouldConsistentRead : true),
       IndexName: aIndexName,
       Select: aSelect
    };
 
    var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
       "X-Amz-Target": "DynamoDB_20120810.Scan"
    }, void 0, "application/json");
    if (isDef(res.Items)) {
       for(var ii in res.Items) {
          res.Items[ii] = this.__DYNAMO_Item_Deconvert(res.Items[ii]);
       }
    }
    return res;
 };
 
 /**
  * <odoc>
  * <key>AWS.DYNAMO_DeleteItem(aRegion, aTableName, aKey)</key>
  * Tries to delete an item, identified by aKey, from a DynamoDB aTableName on aRegion.
  * </odoc>
  */
 AWS.prototype.DYNAMO_DeleteItem = function(aRegion, aTableName, aKey) {
    var aURL;
    aRegion = _$(aRegion).isString().default(this.region);
    if (aRegion == "local") {
       aURL = "http://127.0.0.1:8000";
    } else {
       aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
    }
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = {
       TableName: aTableName,
       Key: this.__DYNAMO_Item_Convert(aKey)
    };
 
    var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
       "X-Amz-Target": "DynamoDB_20120810.DeleteItem"
    }, void 0, "application/json");
    return res;
 };
 
 /**
  * <odoc>
  * <key>AWS.DYNAMO_DescribeTable(aRegion, aTableName) : Map</key>
  * Retrieves a description map for a DynamoDB aTableName on aRegion.
  * </odoc>
  */
 AWS.prototype.DYNAMO_DescribeTable = function(aRegion, aTableName) {
    var aURL;
    aRegion = _$(aRegion).isString().default(this.region);
    if (aRegion == "local") {
       aURL = "http://127.0.0.1:8000";
    } else {
       aURL = "https://dynamodb." + aRegion + ".amazonaws.com/";
    }
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var params = {
       TableName: aTableName
    };
 
    var res = this.postURLEncoded(aURL, aURI, "", params, "dynamodb", aHost, aRegion, {
       "X-Amz-Target": "DynamoDB_20120810.DescribeTable"
    }, void 0, "application/json");
    return res;
 };
 
 ow.loadCh();
 if (isUnDef(ow.ch.__types.dynamo)) ow.ch.__types.dynamo = {
    __channels: {},
    create       : function(aName, shouldCompress, options) {
       options = _$(options).default({});
       options.accessKey = _$(options.accessKey).default(__) //$_("Please provide an accessKey.");
       options.secretKey = _$(options.secretKey).default(__) //$_("Please provide a secretKey.");
       _$(options.tableName).$_("Please provide a table name.");
       options.region = _$(options.region).default(getEnv("AWS_DEFAULT_REGION"));
       options.setUpdate = _$(options.setUpdate).isBoolean().default(false)
 
       ow.loadObj();
       options.aws = new AWS(options.accessKey, options.secretKey);
       
       this.__channels[aName] = options;
    },
    destroy      : function(aName) {
       delete this.__channels[aName];
    },
    size         : function(aName) {
       var options = this.__channels[aName];
       return options.aws.DYNAMO_GetAllItems(options.region, options.tableName, void 0, void 0, void 0, void 0, "COUNT").Count;
    },
    forEach      : function(aName, aFunction) {
       var options = this.__channels[aName];
       var keys = $path(options.aws.DYNAMO_DescribeTable(options.region, options.tableName).Table.KeySchema, "[].AttributeName");
       var oo = options.aws.DYNAMO_GetAllItems(options.region, options.tableName).Items;
       oo.forEach((vv) => {
          aFunction(ow.obj.filterKeys(keys, vv), vv);
       });
    },
    getAll      : function(aName, full) {
       var options = this.__channels[aName];
       return options.aws.DYNAMO_GetAllItems(options.region, options.tableName, full).Items;
    },
    getKeys      : function(aName, full) {
       var options = this.__channels[aName];
       var keys = $path(options.aws.DYNAMO_DescribeTable(options.region, options.tableName).Table.KeySchema, "[].AttributeName");
       return $from(options.aws.DYNAMO_GetAllItems(options.region, options.tableName, full).Items).select((r) => { return ow.obj.filterKeys(keys, r); });
    },
    getSortedKeys: function(aName, full) {
       return this.getKeys(aName, full);
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
      var options = this.__channels[aName]
      var conditions = [], keysV = {}
      _$(aMatch, "match").isMap().$_()
      if (isNumber(aTimestamp)) aTimestamp = { ts: aTimestamp }
      aTimestamp = _$(aTimestamp).isMap().default({})

      var addKeysAndConditions = (aMap) => {
         var keys = Object.keys(aMap)
         for(var ii in keys) {
            var kk = conditions.length
            conditions.push(keys[ii] + " = :v" + keys[ii])
            keysV[":v" + keys[ii]] = aMap[keys[ii]]
         }
      }

      addKeysAndConditions(aMatch)
      addKeysAndConditions(aK)

      if (aTimestamp.setUpdate || (isUnDef(aTimestamp.setUpdate) && options.setUpdate)) {
         var _fnK = o => {
            var _r = []
            traverse(o, (aK, aV, aP, aO) => {
               if (!isObject(aV)) {
                  _r.push((aP + (isNumber(aK) ? "[" + aK + "]" : "." + aK)).replace(/^\./, "") + " = :v" + (aP + aK).replace(/\./g, "_"))
               }
            })
            return "SET " + _r.join(", ")
         }
         var _fnV = o => {
            var _r = {}
            traverse(o, (aK, aV, aP, aO) => {
               if (!isObject(aV)) {
                  _r[":v" + (aP + aK).replace(/\./g, "_")] = aV
               }
            })
            return _r
         }
         var _r = options.aws.DYNAMO_UpdateItem(
            options.region, 
            options.tableName, 
            aK, 
            _fnK(aV),
            conditions.join(" and "), 
            merge(keysV, _fnV(aV)),
            __, 
            "ALL_NEW")
         if (isMap(_r) && isDef(_r.Attributes)) return _r.Attributes; else return _r
      } else {
         return options.aws.DYNAMO_PutItem(options.region, options.tableName, merge(aK, aV), conditions.join(" and "), keysV)
      }  
      // return options.aws.DYNAMO_PutItem(options.region, options.tableName, aV, conditions.join(" and "), keysV);
    },
    set          : function(aName, aK, aV, aTimestamp) {
       var options = this.__channels[aName]
       if (isNumber(aTimestamp)) aTimestamp = { ts: aTimestamp }
       aTimestamp = _$(aTimestamp).isMap().default({})
       if (aTimestamp.setUpdate || (isUnDef(aTimestamp.setUpdate) && options.setUpdate)) {
         var _fnK = o => {
            var _r = []
            traverse(o, (aK, aV, aP, aO) => {
               if (!isObject(aV)) {
                  _r.push((aP + (isNumber(aK) ? "[" + aK + "]" : "." + aK)).replace(/^\./, "") + " = :v" + (aP + aK).replace(/\./g, "_"))
               }
            })
            return "SET " + _r.join(", ")
         }
         var _fnV = o => {
            var _r = {}
            traverse(o, (aK, aV, aP, aO) => {
               if (!isObject(aV)) {
                  _r[":v" + (aP + aK).replace(/\./g, "_")] = aV
               }
            })
            return _r
         }
         var _r = options.aws.DYNAMO_UpdateItem(
            options.region, 
            options.tableName, 
            aK, 
            _fnK(aV),
            __, 
            _fnV(aV),
            __, 
            "ALL_NEW")
         if (isMap(_r) && isDef(_r.Attributes)) return _r.Attributes; else return _r
       } else {
         return options.aws.DYNAMO_PutItem(options.region, options.tableName, aV)
       }
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
       ow.loadObj();
       for(var i in aVs) {
          this.set(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp);
       }
    },
    unsetAll     : function(aName, aKs, aVs, aTimestamp) {
       ow.loadObj();
       for(var i in aVs) {
          this.unset(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp);
       }
    },		
    get          : function(aName, aK) {
       var options = this.__channels[aName];
       return options.aws.DYNAMO_GetItem(options.region, options.tableName, aK).Item;
    },
    pop          : function(aName) {
       var elems = this.getSortedKeys(aName);
       var elem = elems[elems.length - 1];
       //var res = clone(this.get(aName, elem));
       //this.unset(aName, elem);
       return elem;
    },
    shift        : function(aName) {
       var elems = this.getSortedKeys(aName);
       var elem = elems[0];
       //var res = clone(this.get(aName, elem));
       //this.unset(aName, elem);
       return elem;
    },
    unset        : function(aName, aK, aTimestamp) {
       var options = this.__channels[aName];
       return options.aws.DYNAMO_DeleteItem(options.region, options.tableName, aK);
    }
 };