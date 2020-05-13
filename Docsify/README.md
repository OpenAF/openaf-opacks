# Docsify

The OpenAF's [docsify](https://docsify.js.org) wrapper provides integration in OpenAF of docsify documentation based on markdown documentation/files.

## How to install

To install it, on an OpenAF installation, just execute:

````bash
opack install docsify
````

## How to use it

### In an OpenAF script

You can quickly test with this oPack documentation (the one you are reading). Use the following code on an OpenAF console or on an OpenAF script:

````javascript
loadLib("docsify.js");

var hs = ow.server.httpd.start(8080);
ow.server.httpd.route(hs, { "/" : function(r, aHs) {
    return ow.server.httpd.replyDocsify(aHs, getOPackPath("Docsify", "/", r));
}});

log("READY");
ow.server.daemon();
````

And point your browser to: http://127.0.0.1:8080

## Configuring it

Docsify has specific generic options and also specific for plugins.

### Themes

There are two ways to change the Docsify theme (from the Docsify original themes): by the query string or on the options map.

The default themes available under the docsify/themes folder are:

* vue (default)
* pure
* dark
* dolphin
* buble

#### Changing the theme through query string

You can change the current theme by adding the _t_ query string:

````
# URLs without theme
http://127.0.0.1:8080
http://127.0.0.1:8080/docs

# URLs with theme
http://127.0.0.1:8080?t=dark
http://127.0.0.1:8080/docs?t=pure
````

#### Changing the theme on the options map

On the options map just for the _theme_ key:

````javascript
ow.server.httpd.route(hs, { "/" : function(r, aHs) {
    return ow.server.httpd.replyDocsify(aHs, getOPackPath("Docsify", "/", r, {
        theme: "dark"
    }));
}});
````

_NOTE: This will disabled changing the theme through the query string._

### Plugins

This wrapper comes, by default, with the following docsify's plugins:

* Search
* Front matter
* GA (Google Analytics)
* Zoom image
* External script
* Docsify Copy Code
* Emoji

You can add more on the docsify/plugins folder. From this list "Docsify Copy Code" will be included, by default.

To configure your own list of plugins just add it to the _plugins_ array on the options map:

````javascript
ow.server.httpd.route(hs, { "/" : function(r, aHs) {
    return ow.server.httpd.replyDocsify(aHs, getOPackPath("Docsify"), "/", r, {
        plugins: [ "docsify-copy-code", "zoom-image" ]
    });
}});
````

_NOTE: Use the filename part as the reference to add to the plugins array._

For plugins that need specific options you can use the _options_ key but keep in mind that it's a string representing a JSON. So do use the _stringify_ function as in the example below:

````javascript
ow.server.httpd.route(hs, { "/" : function(r, aHs) {
    return ow.server.httpd.replyDocsify(aHs, getOPackPath("Docsify", "/", r, {
        plugins: [ "docsify-copy-code", "zoom-image", "search" ],
        options: stringify({
            search: {
                namespace: "test"
            }
        })
    }));
}});
````

### Adding more syntax-highlight languages

Docsify uses [PrismJS](https://prismjs.com/) for it's language syntax-highlight rendering. By default PrismJS includes support for:

* Markup
* CSS
* CLike
* Javascript

By default the docsify opack will also add:

* YAML
* Markdown
* Docker
* JSON
* SQL
* Python
* Bash

But you can customize to add or remove any of these. You can see the full list under the prismjs folder on the oPack source. If some language is missing you can go right ahead and add it there.

When invoking the docksify opack functions (replyDocsify and genStaticVersion) you can add on the options _langs_ entry your list of supported languages keeping in mind that you don't want to load to much or too little. For example:

````javascript
ow.server.httpd.route(hs, { "/" : function(r, aHs) {
    return ow.server.httpd.replyDocsify(aHs, getOPackPath("Docsify", "/", r, {
        plugins: [ "docsify-copy-code", "zoom-image", "search" ],
        options: stringify({
            langs: [ "r", "java", "javastacktrace", "plsql", "sql", "velocity", "regex" ]
        })
    }));
}});
````

## How to generate a static version

It's possible to use the OpenAF's ability to include all css and javascript on a single HTML file so this oPack extends that functionality to also include all the markdown content that would otherwise retrived from a web server.

To generate a single HTML file with everything just execute:

````javascript
loadLib("docsify.js");

var docsify = new Docsify();
io.writeFileString("README.html", docsify.genStaticVersion({
    "/README.md": "README.md"
}));
````

You can also include multiple markdown files, inline markdown and the docsify options as described for _replyDocsify_: 

````javascript
loadLib("docsify.js");

var docsify = new Docsify();
io.writeFileString("README.html", docsify.genStaticVersion({
    "/README.md" : "# Test\n[Link to README](read/me.md)", 
    "/read/me.md": "README.md" 
}, {
    theme: "dark"
}));
````

## How to update

There is an oJob "utils/update.yaml" to help on updating the existing content from the UnPKG CDN. Please run it directly on the oPack folder but be carefull that new versions might break existing functionality (specially the generation of static versions).