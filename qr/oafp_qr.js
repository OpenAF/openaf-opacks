;(function() {
    loadLib("qr.js")

    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            fileExtensions: [ { ext: ".test", type: "test" } ],
            input         : [ { 
                type: "qrtemplate", 
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    var _m = {}
                    r = oafp._fromJSSLON(r, true)

                    if (isMap(r) && Object.keys(r).length <= 1) {
                        switch(r.type) {
                        case "wifi": 
                            _m = { type: "wifi", ssid: "test", password: "test", type: "WPA", hidden: false }
                            break
                        case "sms": 
                            _m = { type: "sms", number: "123456789", message: "test" }
                            break
                        case "tel": 
                            _m = { type: "tel", number: "123456789" }
                            break
                        case "geo": 
                            _m = { type: "geo", lat: 0, lon: 0, query: { q: "query", z: "zoom from 1 (zoom out) to 20 (zoom in)", t: "m - map, k - satelite, h - hybrid, p - terrain, e - google earth, 8 - 8-bit", layer: "t - traffic, c - street view" } }
                            break
                        case "email": 
                            _m = { type: "email", address: "a@b.c,x@y.z", cclist: "c@b.a,z@y.x", subject: "test", body: "test" }
                            break
                        case "contact": 
                            _m = { type: "contact", cardType: "mecard or vcard", name: "test", company: "test", title: "onlyVcard", tel: "123456789", email: "a@b.c", address: "test", address2: "test", url: "http://test.com", memo: "test" }
                            break
                        case "cal": 
                            _m = { type: "cal", name: "name", beginDate: "yyyyMMdd'T'hhmmss'Z'", endDate: "yyyyMMdd'T'hhmmss'Z'", location: "location", description: "description" }
                            break
                        case "youtube": 
                            _m = { type: "youtube", videoId: "test" }
                            break
                        case "facetime": 
                            _m = { type: "facetime", id: "a@b.c", onlyAudio: false }
                            break
                        case "otp":
                            _m = { type: "otp", accountName: "test", issuer: "test", secret: "test", algorithm: "SHA1", digits: 6, period: 30 }
                            break
                        default:
                            _m = [
                                { type: "wifi" },
                                { type: "sms" },
                                { type: "tel" },
                                { type: "geo" },
                                { type: "email" },
                                { type: "contact" },
                                { type: "cal" },
                                { type: "youtube" },
                                { type: "facetime" },
                                { type: "otp" }
                            ]
                        }
                    } else {
                        _m = r
                    }

                    _$o(_m, options)
                }
            } ],
            output        : [ { 
                type: "qr", 
                fn: (r, options) => {
                    var _m = r
                    var qr = new QR(), _qr = ""

                    switch(_m.type) {
                    case "wifi": 
                        _qr = qr.genWifiString(_m.ssid, _m.password, _m.type, _m.hidden)
                        break
                    case "sms":
                        _qr = qr.genSMSString(_m.number, _m.message)
                        break
                    case "tel":
                        _qr = qr.genTelString(_m.number)
                        break
                    case "geo":
                        _qr = qr.genGeoString(_m.lat, _m.lon, _m.query)
                        break
                    case "email":
                        _qr = qr.genEmailString(_m.address, _m.cclist, _m.subject, _m.body)
                        break
                    case "contact":
                        _qr = qr.genContactString(_m.cardType, { name: _m.name, company: _m.company, title: _m.title, tel: _m.tel, email: _m.email, address: _m.address, address2: _m.address2, url: _m.url, memo: _m.memo })
                        break
                    case "cal":
                        _qr = qr.genCalString(_m.name, _m.beginDate, _m.endDate, _m.location, _m.description)
                        break
                    case "youtube":
                        _qr = qr.genYTString(_m.videoId)
                        break
                    case "facetime":
                        _qr = qr.genFTString(_m.id, _m.onlyAudio)
                        break
                    case "otp":
                        _qr = qr.genOTPAuth(_m.accountName, _m.issuer, _m.secret, _m.algorithm, _m.digits, _m.period)
                        break
                    default:
                        _qr = _m
                    }
                    
                    if (isDef(params.qrfile)) {
                        qr.write2File(_qr, params.qrfile, params.qrwidth, params.qrheight, params.qrformat)
                    } else {
                        oafp._exit(-1, "Only file output is supported (use qrfile=)")
                    }
                }
            } ],
            /*transform     : [ { 
                type: "test", 
                fn: (r) => {
                    return { test: 'test transform' }
                }
            } ],*/
            help          : 
`# QR oafp lib

## ⬇️ QR input types:

Extra input types added by the QR lib:

| Input type | Description |
|------------|-------------|
| qrtemplate | QR input text template |

---

### 🧾 QRTemplate input option

Use with _in=qrtemplate_:

* If no option is provided, a list of available templates will be shown.
* If a map is provided with only the type, a template for the corresponding type will be shown.

---

## ⬆️  QR output formats

Extra output formats added by the QR lib:

| Output format | Description |
|---------------|-------------|
| qr            | Output a QR text or picture |

---

### 🧾 QR output options

List of options to use when _out=qr_:

| Option | Type | Description |
|--------|------|-------------|
| qrfile | string | Output file name |
| qrwidth | number | Width in pixels |
| qrheight | number | Height in pixels |
| qrformat | string | File format (png, jpg, gif) |

`
        }

        return _r
    }
})()