// Author: Nuno Aguiar

plugin("XML");
ow.loadFormat();

/**
 * <odoc>
 * <key>RSS.RSS(aTitle, aDescription, aLink, aLang, aTTL)</key>
 * Creates a RSS object instance given a RSS feed aTitle, aDescription, aLink, aLang (e.g. en-US, pt-PT, ...) and aTTL in minutes (defaults to 10 hours).
 * </odoc>
 */
var RSS = function(aTitle, aDescription, aLink, aLang, aTTL) {
    this.title = _$(aTitle, "title").isString().default("Untitled");
    this.description = _$(aDescription, "description").isString().default(this.title);
    this.link = _$(aLink, "link").isString().default("http://no.where");
    this.lang = _$(aLang, "lang").isString().default("en-US");
    this.ttl = _$(aTTL, "ttl").isNumber().default(36000);

    this.items = [];
};

/**
 * <odoc>
 * <key>RSS.addItem(aTitle, aDescription, aLink, aGuid, aPubDate, aCategory)</key>
 * Adds a new rss feed item with aTitle, aDescription, aLink, an unique guid, aPubDate and aCategory.
 * </odoc>
 */
RSS.prototype.addItem = function(aTitle, aDescription, aLink, aGuid, aPubDate, aCategory) {
    aTitle = _$(aTitle, "title").isString().default("Untitled");
    aDescription = _$(aDescription, "description").isString().default(aTitle);
    aLink = _$(aLink, "link").isString().default("");
    aPubDate = _$(aPubDate, "pubdate").isDate().default(new Date());
    aGuid = _$(aGuid, "guid").isString().default(this.link + "/" + ow.format.fromDate(aPubDate, "yyyyMMddHHmmssSSS"));
    aCategory = _$(aCategory, "category").isString().default("");

    this.items.push({
        title: aTitle,
        description: aDescription,
        link: aLink,
        pubDate: aPubDate,
        guid: aGuid,
        category: aCategory
    });
};

/**
 * <odoc>
 * <key>RSS.generate(aPubDate, aBuildDate) : String</key>
 * Generates and returns a rss feed xml given aPubDate and aBuildDate.
 * </odoc>
 */
RSS.prototype.generate = function(aPubDate, aBuildDate) {
    var xml = new XML();

    aPubDate = _$(aPubDate, "pubdate").isDate().default(new Date());
    aBuildDate = _$(aBuildDate, "builddate").isDate().default(aPubDate);

    var cont = xml.x("rss").a("version", "2.0").a("xmlns:atom", "http://www.w3.org/2005/Atom")
       .e("channel")
        .e("title").t(this.title).up()
        .e("description").t(this.description).up()
        .e("link").t(this.link).up()
        .e("pubDate").t(aPubDate.toUTCString()).up()
        .e("lastBuildDate").t(aBuildDate.toUTCString()).up()
        .e("language").t(this.lang).up()
        .e("ttl").t(this.ttl).up()
        .e("atom:link").a("xmlns:atom10", "http://www.w3.org/2005/Atom").a("href", this.link).a("rel", "self").a("type", "application/rss+xml").up();
    
    for(var ii in this.items) {
        cont = cont.e("item")
               .e("title").t(this.items[ii].title).up()
               .e("description").t(this.items[ii].description).up()
               .e("category").t(this.items[ii].category).up()
               .e("pubDate").t(this.items[ii].pubDate.toUTCString()).up()
               .e("guid").t(this.items[ii].guid).up()
               .e("link").t(this.items[ii].link).up()
               .up();
    }

    cont.up();

    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + xml.w();
};

/**
 * <odoc>
 * <key>RSS.serverReply(aServer, aRequest, aPubDate, aBuildDate) : Map</key>
 * Given a HTTPServer plugin aServer and aRequest will return the appropriate map for request handling reply calling the method
 * generate with aPubDate and aBuildDate.\
 * \
 * Example:\
 * \
 * ow.loadServer();\
 * var hs = ow.server.httpd.start(80);\
 * ow.server.httpd.route(hs, {\
 *    "/rss": function(req) {\
 *       // ... create rss object\
 *       return rss.serverReply(hs, req);\
 *    }\
 * })\
 * \
 * </odoc>
 */
RSS.prototype.serverReply = function(aServer, aRequest, aPubDate, aBuildDate) {
    _$(aServer, "server").$_();
    _$(aRequest, "request").$_();
    
    return aServer.reply((aRequest.method == "HEAD" ? "" : this.generate(aPubDate, aBuildDate)), "text/xml; charset=UTF-8", 200);
};

/**
 * <odoc>
 * <key>RSS.serverReplyMD(aServer, aRequest, aPubDate, aBuildDate) : Map</key>
 * Given a HTTPServer plugin aServer and aRequest will return the appropriate map for request handling a reply in HTML from Markdown
 * calling the method generateMD with aPubDate and aBuildDate.\
 * \
 * Example:\
 * \
 * ow.loadServer();\
 * var hs = ow.server.httpd.start(80);\
 * ow.server.httpd.route(hs, {\
 *    "/rss": function(req) {\
 *       // ... create rss object\
 *       return rss.serverReplyMD(hs, req);\
 *    }\
 * })\
 * \
 * </odoc>
 */
RSS.prototype.serverReplyMD = function(aServer, aRequest, aPubDate, aBuildDate) {
    _$(aServer, "server").$_();
    _$(aRequest, "request").$_();
    
    ow.loadTemplate();
    return aServer.reply((aRequest.method == "HEAD" ? "" : ow.template.parseMD2HTML(this.generateMD(aPubDate, aBuildDate), true)), "text/html; charset=UTF-8", 200);
};

/**
 * <odoc>
 * <key>RSS.generateMD(aPubDate, aBuildDate) : String</key>
 * Generates and returns a markdown represation of a feed xml given aPubDate and aBuildDate.
 * </odoc>
 */
RSS.prototype.generateMD = function(aPubDate, aBuildDate) {
    aPubDate = _$(aPubDate, "pubdate").isDate().default(new Date());
    aBuildDate = _$(aBuildDate, "builddate").isDate().default(aPubDate);

    var fnNotes = (aTxt) => {
       return '<div style="font-family: -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen-Sans,Ubuntu,Cantarell,\'Helvetica Neue\',sans-serif; text-align: right; float: right; font-size: 8pt; font-weight: 200; line-height: 110%;"><i>' + aTxt + '</i></div>';
    }

    var fnDesc = (aTxt) => {
       return '<div style="font-family: -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen-Sans,Ubuntu,Cantarell,\'Helvetica Neue\',sans-serif; font-weight: 200; line-height: 110%;"><i>' + aTxt + '</i></div>';
    }

    var md = "# [" + this.title + "](" + this.link + ")" + fnNotes(aPubDate) + "\n";
    md += "\n_" + fnDesc(this.description) + "_\n\n";

    for(var ii in this.items) {
       if (isDef(this.items[ii].link) && this.items[ii].link != "")
          md += "## [" + this.items[ii].title + "](" + this.items[ii].link + ")" + fnNotes(this.items[ii].pubDate) + "\n\n";
       else
          md += "## " + this.items[ii].title + " " + fnNotes(this.items[ii].pubDate) + "\n\n";

       md += this.items[ii].description + "\n\n";
    }

    return md;
};

/**
 * <odoc>
 * <key>RSS.set4RSS(aRSS)</key>
 * Tries to retrieve the internal fields from a aRSS string XML representation.
 * </odoc>
 */
RSS.prototype.set4RSS = function(aRSS) {
    var obj = af.fromXML2Obj(aRSS);

    if (isDef(obj.RDF)) { obj.rss = obj.RDF; obj.rss.channel.item = obj.RDF.item; }

    this.title = obj.rss.channel.title;
    this.description = obj.rss.channel.description;
    this.link = obj.rss.channel.link.join(" ").trim();
    this.lang = obj.rss.channel.language;

    this.items = [];
    for (var ii in obj.rss.channel.item) {
       var item = obj.rss.channel.item[ii];

       this.items.push({
          title: item.title,
          description: item.description,
          category: item.category,
          pubDate: item.pubDate,
          guid: item.guid,
          link: item.link
       });
    }
};