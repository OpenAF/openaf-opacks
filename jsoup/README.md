# Jsoup oPack

This oPack provides small OpenAF wrappers and helpers around the Java Jsoup HTML parser plus a tiny WebSearch helper and an oafp integration helper.

## Contents

- `jsoup.js` — OpenAF wrapper exposing convenience functions around the Java `org.jsoup.Jsoup` API (parse, clean, helpers to convert to a JS map).
- `webSearch.js` — Simple web search helper that scrapes Google search results and returns HTML/text/map variants of a URL.
- `oafp_Jsoup.js` — oafp integration that registers the package as an input handler for OpenAF pipelines (supports `html` and `websearch` inputs).

## Quick notes

This oPack expects the Java Jsoup jar to be available to the runtime. `jsoup.js` calls `loadExternalJars(getOPackPath("jsoup") || ".")` so put the Jsoup jar inside this oPack directory or ensure `getOPackPath("jsoup")` resolves correctly.

## Usage (OpenAF environment)

1) Basic Jsoup wrapper

```javascript
loadLib("jsoup.js")
var soup = new Jsoup()

// fetch and parse remote URL (returns Java Document)
var doc = soup.getURLDoc("https://example.com")

// parse HTML file or string
var docFromFile = soup.getHTMLDoc('/path/to/file.html', 'https://example.com')
var docFromStr = soup.getHTMLDoc4Str('<html>...</html>')

// clean HTML using Jsoup safelist options: none,basic,basicWithImages,relaxed,simpleText
var cleaned = soup.cleanHTML('<div>...</div>', 'basic')

// convert Document to a JS-friendly map
var map = soup.getDocMap(docFromStr)
```

2) WebSearch helper

```javascript
loadLib("webSearch.js")
var ws = new WebSearch()

// get content variants: "html", "basic", "text", "map"
var html = ws.getURL('https://example.com', 'html')
var basic = ws.getURL('https://example.com', 'basic')

// perform a (scraping) search. Example returns up to 12 results by default
var results = ws.search('openaf jsoup integration', 10)
// results.results is an array of { title, description, link }
```

3) oafp integration

The `oafp_Jsoup.js` file exports an oafp lib which registers two input types with OpenAF pipelines:
- `in=websearch` — input is a search string. Option: `inwebsearchlimit` (Number).
- `in=html` — input is HTML. Options: `inhtmlfilter` (String; one of `basic`, `basic-with-images`, `relaxed`, `simpletext`, `none`), `inhtmlraw` (Boolean).

The oafp helper formats HTML into either a cleaned string or the `getDocMap` representation depending on `inhtmlraw`.

Options reference (summary)
- `inwebsearchlimit` (Number): limit for `websearch` results
- `inhtmlfilter` (String): HTML filter to apply before further processing (see allowed values above)
- `inhtmlraw` (Boolean): when true, returns raw filtered HTML string instead of map

## Troubleshooting

- If the wrapper fails with class not found errors, ensure the Jsoup jar is present in the opack folder and that the runtime loads external jars.
- Google scraping in `webSearch.js` depends on the Google HTML structure used by the script. Scraping is fragile and can break if Google changes markup or throttles/block requests.

