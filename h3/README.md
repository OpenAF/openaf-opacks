# h3 oPack

This oPack provides an OpenAF wrapper around Uber's H3 geospatial indexing Java library (`com.uber:h3`).

## Install

```bash
opack install h3
```

## Usage

```javascript
loadLib("h3.js")

var h3 = new H3()
var idx = h3.latLngToCell(40.6892, -74.0445, 9)

print(idx)
print(h3.cellToLatLng(idx))
print(h3.gridDisk(idx, 1))
```

## API

- `latLngToCell(lat, lon, res)`
- `cellToLatLng(cell)`
- `cellToBoundary(cell)`
- `gridDisk(cell, k)`
- `gridDistance(cellA, cellB)`
- `gridPath(cellA, cellB)`
- `isValidCell(cell)`
- `getResolution(cell)`
- `cellToParent(cell, res)`
- `cellToChildren(cell, res)`
- `compactCells(cells)`
- `uncompactCells(cells, res)`

## Notes

- The wrapper supports different Java H3 naming conventions used by older and newer releases.
- Cell IDs are normalized to plain JavaScript strings on input and output, so methods can be chained reliably across Java H3 versions.
- External jars are loaded from the opack path through `loadExternalJars(getOPackPath("h3") || ".")`.
