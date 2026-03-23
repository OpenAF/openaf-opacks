loadExternalJars(getOPackPath("h3") || ".")

/**
 * <odoc>
 * <key>H3.H3() : H3</key>
 * Creates a new H3 wrapper backed by the bundled Uber H3 Java library. The wrapper
 * normalizes cell identifiers to JavaScript strings so the same API can be used
 * across different Java H3 versions.
 * </odoc>
 */
var H3 = function() {
  this._h3 = Packages.com.uber.h3core.H3Core.newInstance()
}

H3.prototype._isCell = function(aCell) {
  return isString(aCell) || isNumber(aCell) || isJavaObject(aCell)
}

H3.prototype._cellToString = function(aCell) {
  if (isString(aCell)) return String(aCell)
  if (isNumber(aCell)) return String(this._invoke([ "h3ToString" ], [ aCell ]))
  if (isJavaObject(aCell)) {
    if (String(aCell.getClass().getName()) == "java.lang.String") return String(aCell)
    return String(this._invoke([ "h3ToString" ], [ aCell ]))
  }

  throw "aCell is not a string"
}

H3.prototype._cellsToStrings = function(aCells) {
  return this._toArray(aCells).map(cell => this._cellToString(cell))
}

H3.prototype._toArray = function(aObj) {
  if (isUnDef(aObj)) return []
  if (isArray(aObj)) return aObj
  if (isDef(aObj.toArray)) return af.fromJavaArray(aObj.toArray())
  return af.fromJavaArray(aObj)
}

H3.prototype._invoke = function(aNames, aArgs) {
  var c = this._h3.getClass()
  for (var i = 0; i < aNames.length; i++) {
    var n = aNames[i]
    var ms = c.getMethods()
    for (var m = 0; m < ms.length; m++) {
      if (String(ms[m].getName()) == n) {
        return this._h3[n].apply(this._h3, aArgs)
      }
    }
  }

  throw "Couldn't find any compatible H3 method in this version: " + aNames.join(", ")
}

/**
 * <odoc>
 * <key>H3.latLngToCell(aLat, aLon, aRes) : String</key>
 * Converts the latitude aLat, longitude aLon and H3 resolution aRes into an H3
 * cell identifier string.
 * </odoc>
 */
H3.prototype.latLngToCell = function(aLat, aLon, aRes) {
  _$(aLat, "aLat").isNumber().$_()
  _$(aLon, "aLon").isNumber().$_()
  _$(aRes, "aRes").isNumber().$_()

  return this._cellToString(this._invoke([ "latLngToCellAddress", "geoToH3Address", "latLngToCell", "geoToH3" ], [ aLat, aLon, aRes ]))
}

/**
 * <odoc>
 * <key>H3.cellToLatLng(aCell) : Map</key>
 * Converts an H3 cell identifier aCell into a map with the corresponding center
 * coordinates: { lat: Number, lon: Number }.
 * </odoc>
 */
H3.prototype.cellToLatLng = function(aCell) {
  if (!this._isCell(aCell)) throw "aCell is not a string"

  var r = this._invoke([ "cellToLatLng", "h3ToGeo" ], [ this._cellToString(aCell) ])
  return {
    lat: r.lat,
    lon: r.lng
  }
}

/**
 * <odoc>
 * <key>H3.cellToBoundary(aCell) : Array</key>
 * Returns the polygon boundary for the H3 cell identifier aCell as an array of
 * coordinate maps: [{ lat: Number, lon: Number }, ...].
 * </odoc>
 */
H3.prototype.cellToBoundary = function(aCell) {
  if (!this._isCell(aCell)) throw "aCell is not a string"

  var pts = this._invoke([ "cellToBoundary", "h3ToGeoBoundary" ], [ this._cellToString(aCell) ])
  return this._toArray(pts).map(r => ({ lat: r.lat, lon: r.lng }))
}

/**
 * <odoc>
 * <key>H3.gridDisk(aCell, aK) : Array</key>
 * Returns the neighbors around the H3 cell identifier aCell up to ring distance
 * aK. The result is an array of H3 cell identifier strings.
 * </odoc>
 */
H3.prototype.gridDisk = function(aCell, aK) {
  if (!this._isCell(aCell)) throw "aCell is not a string"
  _$(aK, "aK").isNumber().default(1)

  return this._cellsToStrings(this._invoke([ "gridDisk", "kRing" ], [ this._cellToString(aCell), aK ]))
}

/**
 * <odoc>
 * <key>H3.gridDistance(aCellA, aCellB) : Number</key>
 * Returns the grid distance between the H3 cell identifiers aCellA and aCellB.
 * </odoc>
 */
H3.prototype.gridDistance = function(aCellA, aCellB) {
  if (!this._isCell(aCellA)) throw "aCellA is not a string"
  if (!this._isCell(aCellB)) throw "aCellB is not a string"

  return this._invoke([ "gridDistance", "h3Distance" ], [ this._cellToString(aCellA), this._cellToString(aCellB) ])
}

/**
 * <odoc>
 * <key>H3.gridPath(aCellA, aCellB) : Array</key>
 * Returns the H3 grid path between the cell identifiers aCellA and aCellB as an
 * array of H3 cell identifier strings.
 * </odoc>
 */
H3.prototype.gridPath = function(aCellA, aCellB) {
  if (!this._isCell(aCellA)) throw "aCellA is not a string"
  if (!this._isCell(aCellB)) throw "aCellB is not a string"

  return this._cellsToStrings(this._invoke([ "gridPathCells", "h3Line" ], [ this._cellToString(aCellA), this._cellToString(aCellB) ]))
}

/**
 * <odoc>
 * <key>H3.isValidCell(aCell) : boolean</key>
 * Returns true if aCell is recognized as a valid H3 cell identifier.
 * </odoc>
 */
H3.prototype.isValidCell = function(aCell) {
  if (!this._isCell(aCell)) throw "aCell is not a string"
  return this._invoke([ "isValidCell", "h3IsValid" ], [ this._cellToString(aCell) ])
}

/**
 * <odoc>
 * <key>H3.getResolution(aCell) : Number</key>
 * Returns the H3 resolution number for the cell identifier aCell.
 * </odoc>
 */
H3.prototype.getResolution = function(aCell) {
  if (!this._isCell(aCell)) throw "aCell is not a string"
  return this._invoke([ "getResolution", "h3GetResolution" ], [ this._cellToString(aCell) ])
}

/**
 * <odoc>
 * <key>H3.cellToParent(aCell, aRes) : String</key>
 * Returns the parent H3 cell identifier for aCell at the target resolution aRes.
 * </odoc>
 */
H3.prototype.cellToParent = function(aCell, aRes) {
  if (!this._isCell(aCell)) throw "aCell is not a string"
  _$(aRes, "aRes").isNumber().$_()
  return this._cellToString(this._invoke([ "cellToParentAddress", "cellToParent", "h3ToParent" ], [ this._cellToString(aCell), aRes ]))
}

/**
 * <odoc>
 * <key>H3.cellToChildren(aCell, aRes) : Array</key>
 * Returns the child H3 cell identifiers for aCell at the target resolution aRes.
 * </odoc>
 */
H3.prototype.cellToChildren = function(aCell, aRes) {
  if (!this._isCell(aCell)) throw "aCell is not a string"
  _$(aRes, "aRes").isNumber().$_()
  return this._cellsToStrings(this._invoke([ "cellToChildren", "h3ToChildren" ], [ this._cellToString(aCell), aRes ]))
}

/**
 * <odoc>
 * <key>H3.compactCells(aCells) : Array</key>
 * Compacts the array of H3 cell identifiers aCells whenever possible and returns
 * the resulting array of H3 cell identifier strings.
 * </odoc>
 */
H3.prototype.compactCells = function(aCells) {
  _$(aCells, "aCells").isArray().$_()
  return this._cellsToStrings(this._invoke([ "compactCellAddresses", "compactCells", "compact" ], [ this._cellsToStrings(aCells) ]))
}

/**
 * <odoc>
 * <key>H3.uncompactCells(aCells, aRes) : Array</key>
 * Expands the compacted array of H3 cell identifiers aCells to the target
 * resolution aRes and returns the resulting array of H3 cell identifier strings.
 * </odoc>
 */
H3.prototype.uncompactCells = function(aCells, aRes) {
  _$(aCells, "aCells").isArray().$_()
  _$(aRes, "aRes").isNumber().$_()
  return this._cellsToStrings(this._invoke([ "uncompactCellAddresses", "uncompactCells", "uncompact" ], [ this._cellsToStrings(aCells), aRes ]))
}
