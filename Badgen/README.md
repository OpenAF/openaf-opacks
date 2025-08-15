# Badgen

The original [badgen](https://github.com/badgen/badgen/tree/master) rewritten for OpenAF.

## Usage

To use, install the badgen opack:

````
opack install badgen
````

and load it in your code:

````javascript
var r = require("badgen.js")
r.badgen({ ... })
r.fromSVG(...)
````

## Examples

### New options

The OpenAF version adds a few extra options beyond the original:

| Option       | Type    | Default   | Description |
|--------------|---------|-----------|-------------|
| label        | String  | label     | Left-side label text (omit to render status-only). |
| status       | String  | status    | Main status text (required). |
| color        | String  | blue      | Color name or hex for the status background (preset names available). |
| labelColor   | String  | grey2     | Color name or hex for the label background. |
| icon         | String  | (none)    | Icon SVG as data URI (use badgen.fromSVG(...)). |
| iconWidth    | Number  | 18        | Width of the provided icon (pixels; internal code multiplies by 10). |
| style        | String  | classic   | One of 'classic', 'flat', 'rounded'. |
| textColor    | String  | fff       | Override text color (can use preset name or hex without #). |
| labelTextColor | String | (defaults to textColor) | Override label text color independently (preset name or hex without #). |
| transparent  | Boolean | false     | If true renders only an outline (no fill). |
| borderColor  | String  | color     | Outline color (defaults to the main color). |
| borderStyle  | String  | solid     | One of 'solid', 'dash', 'dot', 'dashdot' or a custom SVG stroke-dasharray (digits and spaces/commas, e.g. "5 10"). |
| shadow       | Boolean | true      | Toggle the subtle text shadow (duplicate low-opacity text). Opacity is 0.25 in classic style and 0.1 otherwise. |
| scale        | Number  | 1         | Scales resulting width/height (SVG width/height divided by 10 * scale). |

All listed options are supported; presets from the code (e.g. blue, green, grey3) can be used for colors.

Notes:
* When transparent=true the border stroke width matches the rounded style (12) across all styles.
* Set shadow=false to remove the darker duplicate text layer. The shadow opacity varies by style: 0.25 for 'classic', 0.1 for other styles.
* Use borderStyle to create dashed or dotted outlines when transparent or in rounded outline mode. Custom dasharray patterns are sanitized to digits, commas and spaces (e.g. "5 10").
* textColor and borderColor accept preset names or hex values without the leading '#'.

### Rounded style

````javascript
var r = require("badgen.js")
io.writeFileString("rounded.svg", r.badgen({
    label: "build",
    status: "passing",
    color: 'green',
    labelColor: 'none',
    style: 'rounded'
}))
````

<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTAuNiIgaGVpZ2h0PSIyMiIgdmlld0JveD0iLTEwIC0xMCA5MDYgMjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iYnVpbGQ6IHBhc3NpbmciPjx0aXRsZT5idWlsZDogcGFzc2luZzwvdGl0bGU+PGc+PHJlY3QgZmlsbD0iI25vbmUiIHdpZHRoPSIzNjgiIGhlaWdodD0iMjAwIiByeD0iMTAwIi8+PHJlY3QgZmlsbD0iIzNDMSIgeD0iMzY4IiB3aWR0aD0iNTE4IiBoZWlnaHQ9IjIwMCIgcng9IjEwMCIvPjxyZWN0IGZpbGw9Im5vbmUiIHN0cm9rZT0iIzNDMSIgc3Ryb2tlLXdpZHRoPSIxMiIgIHJ4PSIxMDAiIHdpZHRoPSI4ODYiIGhlaWdodD0iMjAwIi8+PC9nPjxnIGFyaWEtaGlkZGVuPSJ0cnVlIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ic3RhcnQiIGZvbnQtZmFtaWx5PSJWZXJkYW5hLERlamFWdSBTYW5zLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEwIj48dGV4dCB4PSI2MCIgeT0iMTQ4IiB0ZXh0TGVuZ3RoPSIyNjgiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMSI+YnVpbGQ8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjEzOCIgdGV4dExlbmd0aD0iMjY4IiBmaWxsPSIjZmZmIj5idWlsZDwvdGV4dD48dGV4dCB4PSI0MjMiIHk9IjE0OCIgdGV4dExlbmd0aD0iNDE4IiBmaWxsPSIjMDAwIiBvcGFjaXR5PSIwLjEiPnBhc3Npbmc8L3RleHQ+PHRleHQgeD0iNDEzIiB5PSIxMzgiIHRleHRMZW5ndGg9IjQxOCIgZmlsbD0iI2ZmZiI+cGFzc2luZzwvdGV4dD48L2c+PC9zdmc+" style="background-color: black;">

### Rounded transparent (outline only)

````javascript
var r = require("badgen.js")
io.writeFileString("rounded-outline.svg", r.badgen({
    label: "tests",
    status: "123 passed",
    color: 'blue',
    style: 'rounded',
    transparent: true,
    labelTextColor: 'black',
    textColor: 'black'
}))
````

<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTExLjkiIGhlaWdodD0iMjIiIHZpZXdCb3g9Ii0xMCAtMTAgMTExOSAyMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSJ0ZXN0czogMTIzIHBhc3NlZCI+PHRpdGxlPnRlc3RzOiAxMjMgcGFzc2VkPC90aXRsZT48Zz48cmVjdCBmaWxsPSJub25lIiBzdHJva2U9IiMwOEMiIHN0cm9rZS13aWR0aD0iMTIiICByeD0iMTAwIiB3aWR0aD0iMTA5OSIgaGVpZ2h0PSIyMDAiLz48L2c+PGcgYXJpYS1oaWRkZW49InRydWUiIHRleHQtYW5jaG9yPSJzdGFydCIgZm9udC1mYW1pbHk9IlZlcmRhbmEsRGVqYVZ1IFNhbnMsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMTAiPjx0ZXh0IHg9IjYwIiB5PSIxNDgiIHRleHRMZW5ndGg9IjI2NiIgZmlsbD0iIzAwMCIgb3BhY2l0eT0iMC4xIj50ZXN0czwvdGV4dD48dGV4dCB4PSI1MCIgeT0iMTM4IiB0ZXh0TGVuZ3RoPSIyNjYiIGZpbGw9IiMyQTJBMkEiPnRlc3RzPC90ZXh0Pjx0ZXh0IHg9IjQyMSIgeT0iMTQ4IiB0ZXh0TGVuZ3RoPSI2MzMiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMSI+MTIzIHBhc3NlZDwvdGV4dD48dGV4dCB4PSI0MTEiIHk9IjEzOCIgdGV4dExlbmd0aD0iNjMzIiBmaWxsPSIjMkEyQTJBIj4xMjMgcGFzc2VkPC90ZXh0PjwvZz48L3N2Zz4=" style="background-color: white;">

### Custom text and border colors

````javascript
var r = require("badgen.js")
io.writeFileString("custom.svg", r.badgen({
    label: "coverage",
    status: "87%",
    color: 'yellow',
    labelTextColor: 'white',
    textColor: '24292E',
    borderColor: '24292E',
    transparent: false,
    style: 'flat'
}))
````

<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTguMyIgaGVpZ2h0PSIyMiIgdmlld0JveD0iLTEwIC0xMCA5ODMgMjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iY292ZXJhZ2U6IDg3JSI+PHRpdGxlPmNvdmVyYWdlOiA4NyU8L3RpdGxlPjxtYXNrIGlkPSJtZiI+PHJlY3Qgd2lkdGg9Ijk2MyIgaGVpZ2h0PSIyMDAiIHJ4PSIzMCIgZmlsbD0iI0ZGRiIvPjwvbWFzaz48ZyBtYXNrPSJ1cmwoI21mKSI+PHJlY3QgZmlsbD0iIzQ0NEQ1NiIgd2lkdGg9IjYwMyIgaGVpZ2h0PSIyMDAiLz48cmVjdCBmaWxsPSIjREIxIiB4PSI2MDMiIHdpZHRoPSIzNjAiIGhlaWdodD0iMjAwIi8+PC9nPjxnIGFyaWEtaGlkZGVuPSJ0cnVlIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ic3RhcnQiIGZvbnQtZmFtaWx5PSJWZXJkYW5hLERlamFWdSBTYW5zLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEwIj48dGV4dCB4PSI1MCIgeT0iMTM4IiB0ZXh0TGVuZ3RoPSI1MDMiIGZpbGw9IiN3aGl0ZSI+Y292ZXJhZ2U8L3RleHQ+PHRleHQgeD0iNjQ4IiB5PSIxMzgiIHRleHRMZW5ndGg9IjI2MCIgZmlsbD0iIzI0MjkyRSI+ODclPC90ZXh0PjwvZz48L3N2Zz4=">

### Status only (no label)

````javascript
var r = require("badgen.js")
io.writeFileString("status-only.svg", r.badgen({
    status: "ready",
    color: 'purple',
    style: 'flat'
}))
````

<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzkuNCIgaGVpZ2h0PSIyMiIgdmlld0JveD0iLTEwIC0xMCA3OTQgMjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0ibGFiZWw6IHJlYWR5Ij48dGl0bGU+bGFiZWw6IHJlYWR5PC90aXRsZT48bWFzayBpZD0ibWYiPjxyZWN0IHdpZHRoPSI3NzQiIGhlaWdodD0iMjAwIiByeD0iMzAiIGZpbGw9IiNGRkYiLz48L21hc2s+PGcgbWFzaz0idXJsKCNtZikiPjxyZWN0IGZpbGw9IiM0NDRENTYiIHdpZHRoPSIzNjEiIGhlaWdodD0iMjAwIi8+PHJlY3QgZmlsbD0iIzk0RSIgeD0iMzYxIiB3aWR0aD0iNDEzIiBoZWlnaHQ9IjIwMCIvPjwvZz48ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9InN0YXJ0IiBmb250LWZhbWlseT0iVmVyZGFuYSxEZWphVnUgU2FucyxzYW5zLXNlcmlmIiBmb250LXNpemU9IjExMCI+PHRleHQgeD0iNTAiIHk9IjEzOCIgdGV4dExlbmd0aD0iMjYxIiBmaWxsPSIjZmZmIj5sYWJlbDwvdGV4dD48dGV4dCB4PSI0MDYiIHk9IjEzOCIgdGV4dExlbmd0aD0iMzEzIiBmaWxsPSIjZmZmIj5yZWFkeTwvdGV4dD48L2c+PC9zdmc+">

### Including in HTML

````javascript
var r = require("badgen.js")
templify('<img src="{{{svg}}}">', { svg: r.fromSVG(r.badgen({
    label : "This is",
    status: "in HTML",
    color : "013220"
})) })
````

<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTkuNSIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDk5NSAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSJUaGlzIGlzOiBpbiBIVE1MIj48dGl0bGU+VGhpcyBpczogaW4gSFRNTDwvdGl0bGU+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4Mj0iMCIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1vcGFjaXR5PSIuMSIgc3RvcC1jb2xvcj0iI0VFRSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1vcGFjaXR5PSIuMSIvPjwvbGluZWFyR3JhZGllbnQ+PG1hc2sgaWQ9Im0iPjxyZWN0IHdpZHRoPSI5OTUiIGhlaWdodD0iMjAwIiByeD0iMzAiIGZpbGw9IiNGRkYiLz48L21hc2s+PGcgbWFzaz0idXJsKCNtKSI+PHJlY3Qgd2lkdGg9IjQ1MSIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM1NTUiLz48cmVjdCB3aWR0aD0iNTQ0IiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzAxMzIyMCIgeD0iNDUxIi8+PHJlY3Qgd2lkdGg9Ijk5NSIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjYSkiLz48L2c+PGcgYXJpYS1oaWRkZW49InRydWUiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJzdGFydCIgZm9udC1mYW1pbHk9IlZlcmRhbmEsRGVqYVZ1IFNhbnMsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMTAiPjx0ZXh0IHg9IjYwIiB5PSIxNDgiIHRleHRMZW5ndGg9IjM1MSIgZmlsbD0iIzAwMCIgb3BhY2l0eT0iMC4yNSI+VGhpcyBpczwvdGV4dD48dGV4dCB4PSI1MCIgeT0iMTM4IiB0ZXh0TGVuZ3RoPSIzNTEiPlRoaXMgaXM8L3RleHQ+PHRleHQgeD0iNTA2IiB5PSIxNDgiIHRleHRMZW5ndGg9IjQ0NCIgZmlsbD0iIzAwMCIgb3BhY2l0eT0iMC4yNSI+aW4gSFRNTDwvdGV4dD48dGV4dCB4PSI0OTYiIHk9IjEzOCIgdGV4dExlbmd0aD0iNDQ0Ij5pbiBIVE1MPC90ZXh0PjwvZz48L3N2Zz4=">

### Theme-aware SVG (dark / light)

You can use the HTML `<picture>` element with the `prefers-color-scheme` media query to serve different SVG badges for dark and light themes. The browser will pick the first matching `<source>`; include an `<img>` fallback.

Example (plain HTML, using data-URI SVGs):

````html
<picture>
  <source media="(prefers-color-scheme: dark)"
          srcset="data:image/svg+xml;utf8,<svg ...>...dark-badge...</svg>">
  <source media="(prefers-color-scheme: light)"
          srcset="data:image/svg+xml;utf8,<svg ...>...light-badge...</svg>">
  <!-- Fallback -->
  <img src="data:image/svg+xml;utf8,<svg ...>...light-badge...</svg>" alt="build status">
</picture>
````

Example (generate badges with badgen and insert into a template):

````javascript
var r = require("badgen.js")

var light = r.fromSVG(r.badgen({
  label: "label",
  status: "status",
  color: "white",
  labelColor: "grey",
  textColor: "grey",
  borderColor: "grey",
  transparent: true,
  style: "rounded"
}))

var dark = r.fromSVG(r.badgen({
  label: "label",
  status: "status",
  color: "black",
  labelColor: "grey",
  textColor: "grey",
  borderColor: "grey",
  transparent: true,
  style: "rounded"
}))

// Insert into HTML; browser will select the dark variant when the user prefers a dark theme
templify(
  '<picture>' +
    '<source media="(prefers-color-scheme: dark)" srcset="{{dark}}">' +
    '<img src="{{light}}" alt="build status">' +
  '</picture>',
  { dark: dark, light: light }
)
````

Notes:
- Use r.fromSVG(...) results (data-URI) in the `srcset`/`src` attributes.
- You can also reference external SVG files instead of data URIs.

<div><picture><source media="(prefers-color-scheme: dark)" srcset="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODMuMiIgaGVpZ2h0PSIyMiIgdmlld0JveD0iLTEwIC0xMCA4MzIgMjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0ibGFiZWw6IHN0YXR1cyI+PHRpdGxlPmxhYmVsOiBzdGF0dXM8L3RpdGxlPjxnPjxyZWN0IGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIxMiIgIHJ4PSIxMDAiIHdpZHRoPSI4MTIiIGhlaWdodD0iMjAwIi8+PC9nPjxnIGFyaWEtaGlkZGVuPSJ0cnVlIiB0ZXh0LWFuY2hvcj0ic3RhcnQiIGZvbnQtZmFtaWx5PSJWZXJkYW5hLERlamFWdSBTYW5zLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEwIj48dGV4dCB4PSI4NSIgeT0iMTQ4IiB0ZXh0TGVuZ3RoPSIyNjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMSI+bGFiZWw8L3RleHQ+PHRleHQgeD0iNzUiIHk9IjEzOCIgdGV4dExlbmd0aD0iMjYxIiBmaWxsPSIjOTk5Ij5sYWJlbDwvdGV4dD48dGV4dCB4PSI0MzEiIHk9IjE0OCIgdGV4dExlbmd0aD0iMzM2IiBmaWxsPSIjMDAwIiBvcGFjaXR5PSIwLjEiPnN0YXR1czwvdGV4dD48dGV4dCB4PSI0MjEiIHk9IjEzOCIgdGV4dExlbmd0aD0iMzM2IiBmaWxsPSIjOTk5Ij5zdGF0dXM8L3RleHQ+PC9nPjwvc3ZnPg&#x3D;&#x3D;"><img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODMuMiIgaGVpZ2h0PSIyMiIgdmlld0JveD0iLTEwIC0xMCA4MzIgMjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0ibGFiZWw6IHN0YXR1cyI+PHRpdGxlPmxhYmVsOiBzdGF0dXM8L3RpdGxlPjxnPjxyZWN0IGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIxMiIgIHJ4PSIxMDAiIHdpZHRoPSI4MTIiIGhlaWdodD0iMjAwIi8+PC9nPjxnIGFyaWEtaGlkZGVuPSJ0cnVlIiB0ZXh0LWFuY2hvcj0ic3RhcnQiIGZvbnQtZmFtaWx5PSJWZXJkYW5hLERlamFWdSBTYW5zLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEwIj48dGV4dCB4PSI4NSIgeT0iMTQ4IiB0ZXh0TGVuZ3RoPSIyNjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMSI+bGFiZWw8L3RleHQ+PHRleHQgeD0iNzUiIHk9IjEzOCIgdGV4dExlbmd0aD0iMjYxIiBmaWxsPSIjOTk5Ij5sYWJlbDwvdGV4dD48dGV4dCB4PSI0MzEiIHk9IjE0OCIgdGV4dExlbmd0aD0iMzM2IiBmaWxsPSIjMDAwIiBvcGFjaXR5PSIwLjEiPnN0YXR1czwvdGV4dD48dGV4dCB4PSI0MjEiIHk9IjEzOCIgdGV4dExlbmd0aD0iMzM2IiBmaWxsPSIjOTk5Ij5zdGF0dXM8L3RleHQ+PC9nPjwvc3ZnPg&#x3D;&#x3D;" alt="build status"></picture></div>

### Simple badge

````javascript
var r = require("badgen.js")
io.writeFileString("badgen.svg", r.badgen({ 
    label: "Label", 
    status: "some issues", 
    color: 'yellow' 
}))
````

<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTE4LjgiIGhlaWdodD0iMjIiIHZpZXdCb3g9Ii0xMCAtMTAgMTE4OCAyMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSJMYWJlbDogc29tZSBpc3N1ZXMiPjx0aXRsZT5MYWJlbDogc29tZSBpc3N1ZXM8L3RpdGxlPjxsaW5lYXJHcmFkaWVudCBpZD0iYSIgeDI9IjAiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3Atb3BhY2l0eT0iLjEiIHN0b3AtY29sb3I9IiNFRUUiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3Atb3BhY2l0eT0iLjEiLz48L2xpbmVhckdyYWRpZW50PjxtYXNrIGlkPSJtIj48cmVjdCB3aWR0aD0iMTE2OCIgaGVpZ2h0PSIyMDAiIHJ4PSIzMCIgZmlsbD0iI0ZGRiIvPjwvbWFzaz48ZyBtYXNrPSJ1cmwoI20pIj48cmVjdCB3aWR0aD0iMzkyIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzQ0NEQ1NiIvPjxyZWN0IHdpZHRoPSI3NzYiIGhlaWdodD0iMjAwIiBmaWxsPSIjREIxIiB4PSIzOTIiLz48cmVjdCB3aWR0aD0iMTE2OCIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjYSkiLz48L2c+PGcgYXJpYS1oaWRkZW49InRydWUiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJzdGFydCIgZm9udC1mYW1pbHk9IlZlcmRhbmEsRGVqYVZ1IFNhbnMsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMTAiPjx0ZXh0IHg9IjYwIiB5PSIxNDgiIHRleHRMZW5ndGg9IjI5MiIgZmlsbD0iIzAwMCIgb3BhY2l0eT0iMC4yNSI+TGFiZWw8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjEzOCIgdGV4dExlbmd0aD0iMjkyIiBmaWxsPSIjZmZmIj5MYWJlbDwvdGV4dD48dGV4dCB4PSI0NDciIHk9IjE0OCIgdGV4dExlbmd0aD0iNjc2IiBmaWxsPSIjMDAwIiBvcGFjaXR5PSIwLjI1Ij5zb21lIGlzc3VlczwvdGV4dD48dGV4dCB4PSI0MzciIHk9IjEzOCIgdGV4dExlbmd0aD0iNjc2IiBmaWxsPSIjZmZmIj5zb21lIGlzc3VlczwvdGV4dD48L2c+PC9zdmc+">

### Icon badge

````javascript
var r = require("badgen.js")
templify('<img src="{{{svg}}}">', { svg: r.fromSVG(r.badgen({
    label : "OpenAF",
    status: "12345",
    icon  : r.fromSVG("svgs/openaf.svg")
})) })
````

<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIyLjUiIGhlaWdodD0iMjIiIHZpZXdCb3g9Ii0xMCAtMTAgMTIyNSAyMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHJvbGU9ImltZyIgYXJpYS1sYWJlbD0iT3BlbkFGOiAxMjM0NSI+PHRpdGxlPk9wZW5BRjogMTIzNDU8L3RpdGxlPjxsaW5lYXJHcmFkaWVudCBpZD0iYSIgeDI9IjAiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3Atb3BhY2l0eT0iLjEiIHN0b3AtY29sb3I9IiNFRUUiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3Atb3BhY2l0eT0iLjEiLz48L2xpbmVhckdyYWRpZW50PjxtYXNrIGlkPSJtIj48cmVjdCB3aWR0aD0iMTIwNSIgaGVpZ2h0PSIyMDAiIHJ4PSIzMCIgZmlsbD0iI0ZGRiIvPjwvbWFzaz48ZyBtYXNrPSJ1cmwoI20pIj48cmVjdCB3aWR0aD0iNzU1IiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzQ0NEQ1NiIvPjxyZWN0IHdpZHRoPSI0NTAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMDhDIiB4PSI3NTUiLz48cmVjdCB3aWR0aD0iMTIwNSIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjYSkiLz48L2c+PGcgYXJpYS1oaWRkZW49InRydWUiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJzdGFydCIgZm9udC1mYW1pbHk9IlZlcmRhbmEsRGVqYVZ1IFNhbnMsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMTAiPjx0ZXh0IHg9IjI3MCIgeT0iMTQ4IiB0ZXh0TGVuZ3RoPSI0MzAiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMjUiPk9wZW5BRjwvdGV4dD48dGV4dCB4PSIyNjAiIHk9IjEzOCIgdGV4dExlbmd0aD0iNDMwIiBmaWxsPSIjZmZmIj5PcGVuQUY8L3RleHQ+PHRleHQgeD0iODEwIiB5PSIxNDgiIHRleHRMZW5ndGg9IjM1MCIgZmlsbD0iIzAwMCIgb3BhY2l0eT0iMC4yNSI+MTIzNDU8L3RleHQ+PHRleHQgeD0iODAwIiB5PSIxMzgiIHRleHRMZW5ndGg9IjM1MCIgZmlsbD0iI2ZmZiI+MTIzNDU8L3RleHQ+PC9nPjxpbWFnZSB4PSIzMCIgeT0iMTAiIHdpZHRoPSIxODAiIGhlaWdodD0iMTgyIiB4bGluazpocmVmPSJkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LFBEOTRiV3dnZG1WeWMybHZiajBpTVM0d0lpQmxibU52WkdsdVp6MGlkWFJtTFRnaVB6NEtQSE4yWnlCM2FXUjBhRDBpTWpBaUlHaGxhV2RvZEQwaU1qQWlJSGh0Ykc1elBTSm9kSFJ3T2k4dmQzZDNMbmN6TG05eVp5OHlNREF3TDNOMlp5SStDaUFnUEdjK0NpQWdJQ0E4Y0dGMGFDQm1hV3hzUFNJalpHVTNPRE01SWlCa1BTSk5JREUxTGpRMk1pQXlMak01TnlCRElERTBMams0TkNBeUxqSWdNVFF1TkRneUlESXVNU0F4TXk0NU5qa2dNaTR4SUVNZ01USXVNelkxSURJdU1TQXhNQzQ1TXpjZ015NHdOVGdnTVRBdU16STRJRFF1TlRRZ1F5QXhNQzR4T1NBMExqZzNOeUF4TUM0ek5URWdOUzR5TmpNZ01UQXVOamc0SURVdU5EQXhJRXdnTVRNdU1EVTNJRFl1TXpjMUlFTWdNVEl1TlRjZ05pNHlNellnTVRJdU1EVTNJRFl1TVRVM0lERXhMalV5TlNBMkxqRTFOeUJESURndU5ESTBJRFl1TVRVM0lEVXVPU0E0TGpZNElEVXVPU0F4TVM0M09ERWdReUExTGprZ01UUXVPRGd5SURndU5ESTBJREUzTGpRd05TQXhNUzQxTWpVZ01UY3VOREExSUVNZ01UUXVOakkzSURFM0xqUXdOU0F4Tnk0eE5EY2dNVFF1T0RneUlERTNMakUwTnlBeE1TNDNPREVnUXlBeE55NHhORGNnT1M0Mk5qY2dNVFV1T1RjMUlEY3VPREkwSURFMExqSTBOeUEyTGpnMk15Qk1JREUyTGpjME5TQTNMamc0T1NCRElERTJMamd5TlNBM0xqa3lNeUF4Tmk0NU1TQTNMamt6T1NBeE5pNDVPVFVnTnk0NU16a2dReUF4Tnk0d09ERWdOeTQ1TXprZ01UY3VNVFk0SURjdU9USXpJREUzTGpJMUlEY3VPRGc0SUVNZ01UY3VOREV4SURjdU9ESWdNVGN1TlRNNUlEY3VOamt4SURFM0xqWXdOaUEzTGpVeklFTWdNVGd1TkRJNElEVXVOVEl6SURFM0xqUTJPQ0F6TGpJeUlERTFMalEyTWlBeUxqTTVOeUJhSUUwZ01UVXVPREk0SURFeExqYzRNU0JESURFMUxqZ3lPQ0F4TkM0eE5UUWdNVE11T0RrNElERTJMakE0TlNBeE1TNDFNalVnTVRZdU1EZzFJRU1nT1M0eE5TQXhOaTR3T0RVZ055NHlNVGtnTVRRdU1UVTBJRGN1TWpFNUlERXhMamM0TVNCRElEY3VNakU1SURrdU5EQTRJRGt1TVRVeElEY3VORGMzSURFeExqVXlOU0EzTGpRM055QkRJREV6TGpnNU9DQTNMalEzTnlBeE5TNDRNamdnT1M0ME1EZ2dNVFV1T0RJNElERXhMamM0TVNCYUlFMGdNVFl1TlRVNElEWXVNemcySUV3Z01URXVPRGMzSURRdU5EWXpJRU1nTVRJdU5UWWdNeTQxTlRJZ01UTXVPRFU1SURNdU1UWXlJREUwTGprMk1TQXpMall4TnlCRElERTJMakE0TkNBMExqQTNPQ0F4Tmk0M01UUWdOUzR5TXpVZ01UWXVOVFU0SURZdU16ZzJJRm9nVFNBNUxqSTROQ0E1TGprek5pQkRJRGt1TURJNUlERXdMakU1TVNBNUxqQXlPU0F4TUM0Mk1EUWdPUzR5T0RRZ01UQXVPRFU0SUV3Z01UQXVNakEzSURFeExqYzRJRXdnT1M0eU9EUWdNVEl1TnpBeklFTWdPUzR3TWprZ01USXVPVFUySURrdU1ESTVJREV6TGpNM0lEa3VNamcwSURFekxqWXlOU0JESURrdU5ERXlJREV6TGpjMU1TQTVMalUzT1NBeE15NDRNVFVnT1M0M05EVWdNVE11T0RFMUlFTWdPUzQ1TVRJZ01UTXVPREUxSURFd0xqQTNPU0F4TXk0M05URWdNVEF1TWpBM0lERXpMall5TlNCTUlERXhMalU1SURFeUxqSTBJRU1nTVRFdU9EUTBJREV4TGprNE5pQXhNUzQ0TkRRZ01URXVOVGN6SURFeExqVTVJREV4TGpNeE9DQk1JREV3TGpJd055QTVMamt6TkNCRElEa3VPVFV5SURrdU5qZ3lJRGt1TlRNNUlEa3VOamd5SURrdU1qZzBJRGt1T1RNMklGb2dUU0F4TWk0NE9UVWdNVEV1TnpneElFd2dNVEV1T1RjeklERXlMamN3TXlCRElERXhMamN4TnlBeE1pNDVOVGNnTVRFdU56RTNJREV6TGpNM01TQXhNUzQ1TnpNZ01UTXVOakkxSUVNZ01USXVNU0F4TXk0M05USWdNVEl1TWpZMklERXpMamd4TmlBeE1pNDBNek1nTVRNdU9ERTJJRU1nTVRJdU5pQXhNeTQ0TVRZZ01USXVOelkzSURFekxqYzFNaUF4TWk0NE9UVWdNVE11TmpJMUlFd2dNVFF1TWpjNElERXlMakkwTVNCRElERTBMalV6TXlBeE1TNDVPRFlnTVRRdU5UTXpJREV4TGpVM05DQXhOQzR5TnpnZ01URXVNekU1SUV3Z01USXVPRGsxSURrdU9UTTFJRU1nTVRJdU5qTTRJRGt1TmpneElERXlMakl5TnlBNUxqWTRNU0F4TVM0NU56TWdPUzQ1TXpVZ1F5QXhNUzQzTVRjZ01UQXVNVGtnTVRFdU56RTNJREV3TGpZd05DQXhNUzQ1TnpNZ01UQXVPRFU0SUV3Z01USXVPRGsxSURFeExqYzRNU0JhSWk4K0NpQWdQQzluUGdvOEwzTjJaejRLIi8+PC9zdmc+">

