# inBrowser

The inBrowser oPack enables the visualization and edition of maps and arrays in the operating system browser triggered from the openaf-console.

## Quick example:

1. On the openaf-console: 
````javascript
> load("inBrowser.js")
> var mymap = { a: 1, b: true, c: "test" }
> mymap = inBrowser.edit(mymap);
````
2. A browser window will be created: 
![](docs/example1.png "Example 1")
3. Change the contents as you like:
![](docs/example2.png "Example 2")
4. Close the browser and check the variable mymap
````javascript
> mymap
{
  "a": 1,
  "b": false,
  "c": "test",
  "d": [
    1,
    2,
    3,
    4
  ]
}
````

## Different formats for editing and visualize

While in the browser window you can change the way to edit and/or visualize by right-clicking on the window:

![](docs/right-click.png "Right-click")

From this menu you can choose different formats to edit (e.g. YAML, JSON) or to visualize (e.g. table, chart).

![table example](docs/table-example.png)
![chart example](docs/chart-example.png)

## Keyboard shortcuts

When using the main editors for YAML and JSON there are a couple of custom keyboard shortcuts:

   * **Ctrl-S / Command-S** will try to save to the current contents back to the server
   * **Ctrl-R / Command-R** will try to reload the contents from the server
   * **Ctrl-Alt-P / Ctrl-Option-P** will popup the current window if possible

Of course all the keyboard shortcuts for the ACE editor are still available including multicursor, find/replace, etc. Check them out on https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts.
