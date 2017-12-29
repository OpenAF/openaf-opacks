ow.loadTemplate();

/**
 * <odoc>
 * <key>oDoc2MD.getListOfKeys(aId, aPath) : Array</key>
 * Returns a list of keys given an oDoc aId and aPath.
 * </odoc>
 */
function getListOfKeys(aId, aPath) {
    var list = searchHelp("", aPath, [ aId ]);

    return $stream(list).map("key").toArray();
};

/**
 * <odoc>
 * <key>oDoc2MD.id2MD(aId, aPath, aHBS, aOutputFile, aTranslationMap)</key>
 * Generates a markdown aOutputFile given a aHBS template provided with a map with:\
 *   - id (a generic name translated with aTranslationMap if needed)\
 *   - items (an array with key, fullkey, text and link)
 * </odoc>
 */
function id2MD(aId, aPath, aHBS, aOutputFile, aTranslationMap) {
    var list = getListOfKeys(aId, aPath);
    var items = [];

    for(var i in list) {
        var item = searchHelp(list[i], aPath, [ aId ]);
        item[0].text = item[0].text.replace(/\n/mg, "<br/>\n"); 
        item[0].text = item[0].text.replace(/  /mg, " &nbsp;"); 
        item[0].link = item[0].key.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "").replace(/ /g, "_");
        items.push(item[0]);
    }

    var data = {
        id: isDef(aTranslationMap[aId]) ? aTranslationMap[aId] : aId,
        items: items
    };

    io.writeFileString(aOutputFile, ow.template.parseHBS(aHBS, data));
};

/**
 * <odoc>
 * <key>oDoc2MD.index2MD(aList, aHBS, aOutputFile, aTranslationMap)</key>
 * Generates a markdown index aOutputFile given a aHBS template provided with an items array with:\
 *   - id (a generic id not translated)\
 *   - translated (a generic id translated with aTranslationMap if needed)
 * </odoc>
 */
function index2MD(aList, aHBS, aOutputFile, aTranslationMap) {
    var list = aList.sort();
    var items = [];

    for(var i in list) {
        if (isDef(aTranslationMap) && isDef(aTranslationMap[list[i]])) 
            tmp = aTranslationMap[list[i]];
        else
            tmp = list[i];
        
        items.push({
            id: list[i],
            translated: tmp
        });
    }

    var data = {
        items: items
    };

    io.writeFileString(aOutputFile, ow.template.parseHBS(aHBS, data));
};