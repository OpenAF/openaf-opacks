;(function() {
    loadLib("qr.js")

    exports.oafplib = function(params, _$o, $o, oafp) {
        var _getQRString = (r) => {
            var _m = r
            var qr = new QR(), _qr = ""

            traverse(_m, (aK, aV, aP, aO) => {
                if (isNull(aV)) {
                    aO[aK] = __
                }
            })

            switch(_m.type) {
            case "url":
                _qr = qr.genURLString(_m.url)
                break
            case "bookmark":
                _qr = qr.genBookmarkString(_m.title, _m.url)
                break
            case "wifi": 
                _qr = qr.genWifiString(_m.ssid, _m.password, _m.authType || _m.wifiType || (_m.type !== "wifi" ? _m.type : void 0), _m.hidden)
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
                _qr = qr.genEmailString(_m.address, _m.subject, _m.cclist, _m.body)
                break
            case "contact":
                _qr = qr.genContactString(_m.cardType || "vcard", { name: _m.name, fn: _m.fn, company: _m.company || _m.org, title: _m.title, tel: _m.tel || _m.phone, email: _m.email, address: _m.address, address2: _m.address2, url: _m.url, memo: _m.memo || _m.note })
                break
            case "cal":
                _qr = qr.genCalString(_m.name || _m.summary, _m.beginDate || _m.start, _m.endDate || _m.end, _m.location, _m.description)
                break
            case "whatsapp":
                _qr = qr.genWhatsAppString(_m.phone || _m.number, _m.message || _m.text)
                break
            case "telegram":
                _qr = qr.genTelegramString(_m.username || _m.user, _m.message || _m.text)
                break
            case "youtube":
                _qr = qr.genYTString(_m.videoId || _m.id || _m.url)
                break
            case "facetime":
                _qr = qr.genFTString(_m.id || _m.number || _m.email, _m.onlyAudio)
                break
            case "otp":
                _qr = qr.genOTPAuth(_m.accountName || _m.account, _m.issuer || _m.issuerName, _m.secret, _m.algorithm || _m.alg, _m.digits, _m.period, _m.otpType || _m.type)
                break
            case "crypto":
                _qr = qr.genCryptoString(_m.coin || _m.cryptoType, _m.address, _m.amount, _m.label, _m.message)
                break
            case "bitcoin":
                _qr = qr.genBitcoinString(_m.address, _m.amount, _m.label, _m.message)
                break
            case "ethereum":
                _qr = qr.genEthereumString(_m.address, _m.amount)
                break
            case "epc":
            case "sepa":
            case "girocode":
                _qr = qr.genEPCString(_m.iban, _m.name, _m.amount, _m.bic, _m.remittance, _m.remittanceRef, _m.purpose)
                break
            case "upi":
                _qr = qr.genUPIString(_m.vpa, _m.name, _m.amount, _m.note, _m.currency, _m.merchantCode, _m.transactionRef)
                break
            case "skype":
                _qr = qr.genSkypeString(_m.username, _m.action)
                break
            default:
                _qr = isString(_m) ? _m : stringify(_m, __, "")
            }
            return _qr
        }

        var _getAsciiOpts = () => {
            var _opts = {
                compact: isDef(params.qrcompact) ? toBoolean(params.qrcompact) : true,
                invert : isDef(params.qrinvert)  ? toBoolean(params.qrinvert)  : false,
                ansi   : isDef(params.qransi)    ? toBoolean(params.qransi)    : false,
                margin : isDef(params.qrmargin)  ? Number(params.qrmargin)     : 4,
                ecc    : isDef(params.qrecc)     ? String(params.qrecc)        : "M"
            }
            if (isDef(params.qrcharblack)) _opts.charBlack = params.qrcharblack
            if (isDef(params.qrcharwhite)) _opts.charWhite = params.qrcharwhite
            return _opts
        }

        var _r = {
            fileExtensions: [ { ext: ".test", type: "test" } ],
            input         : [ {
                type: "qr",
                fn: (r, options) => {
                    var qr = new QR()
                    var _m = String(qr.read4File(r))
                    _$o(_m, options)
                }
            },{ 
                type: "qrtemplate", 
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    var _m = {}
                    r = oafp._fromJSSLON(r, true)

                    if (isMap(r) && Object.keys(r).length <= 1) {
                        switch(r.type) {
                        case "url": 
                            _m = { type: "url", url: "https://openaf.io" }
                            break
                        case "bookmark": 
                            _m = { type: "bookmark", title: "OpenAF", url: "https://openaf.io" }
                            break
                        case "wifi": 
                            _m = { type: "wifi", ssid: "MyNetwork", password: "SecretPassword", authType: "WPA", hidden: false }
                            break
                        case "sms": 
                            _m = { type: "sms", number: "+1234567890", message: "Hello from OpenAF" }
                            break
                        case "tel": 
                            _m = { type: "tel", number: "+1234567890" }
                            break
                        case "geo": 
                            _m = { type: "geo", lat: 38.7223, lon: -9.1393, query: { q: "Lisbon", z: 15 } }
                            break
                        case "email": 
                            _m = { type: "email", address: "user@example.com", cclist: "cc@example.com", subject: "Hello", body: "Message text" }
                            break
                        case "contact": 
                            _m = { type: "contact", cardType: "vcard", name: "Doe;John", fn: "John Doe", company: "Acme Corp", title: "Software Engineer", tel: "+1234567890", email: "john.doe@example.com", address: "123 Main St", address2: "Apt 4", url: "https://example.com", memo: "Notes" }
                            break
                        case "cal": 
                            _m = { type: "cal", name: "Project Kickoff", beginDate: "20260901T090000Z", endDate: "20260901T100000Z", location: "Meeting Room A", description: "Discuss project roadmap" }
                            break
                        case "whatsapp": 
                            _m = { type: "whatsapp", phone: "+1234567890", message: "Hello" }
                            break
                        case "telegram": 
                            _m = { type: "telegram", username: "username", message: "Hello" }
                            break
                        case "youtube": 
                            _m = { type: "youtube", videoId: "dQw4w9WgXcQ" }
                            break
                        case "facetime": 
                            _m = { type: "facetime", id: "user@example.com", onlyAudio: false }
                            break
                        case "otp": 
                            _m = { type: "otp", accountName: "user@example.com", issuer: "MyApp", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ", algorithm: "SHA1", digits: 6, period: 30, otpType: "totp" }
                            break
                        case "crypto": 
                            _m = { type: "crypto", coin: "bitcoin", address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", amount: 0.005, label: "Donation", message: "Thank you" }
                            break
                        case "epc": 
                        case "sepa": 
                        case "girocode": 
                            _m = { type: "epc", iban: "PT50000000000000000000000", name: "John Doe", amount: 25.50, bic: "TESTPTPL", remittance: "Invoice 123", remittanceRef: "", purpose: "" }
                            break
                        case "upi": 
                            _m = { type: "upi", vpa: "john@upi", name: "John Doe", amount: 500.00, note: "Dinner", currency: "INR", merchantCode: "", transactionRef: "" }
                            break
                        case "skype": 
                            _m = { type: "skype", username: "echo123", action: "call" }
                            break
                        default:
                            _m = [
                                { type: "url" },
                                { type: "bookmark" },
                                { type: "wifi" },
                                { type: "sms" },
                                { type: "tel" },
                                { type: "geo" },
                                { type: "email" },
                                { type: "contact" },
                                { type: "cal" },
                                { type: "whatsapp" },
                                { type: "telegram" },
                                { type: "youtube" },
                                { type: "facetime" },
                                { type: "otp" },
                                { type: "crypto" },
                                { type: "epc" },
                                { type: "upi" },
                                { type: "skype" }
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
                    var _qr = _getQRString(r)
                    var qr = new QR()
                    
                    if (isDef(params.qrfile)) {
                        qr.write2File(_qr, params.qrfile, params.qrwidth, params.qrheight, params.qrformat)
                    } else {
                        oafp._print(qr.getASCII(_qr, _getAsciiOpts()))
                    }
                }
            }, {
                type: "qrascii",
                fn: (r, options) => {
                    var _qr = _getQRString(r)
                    var qr = new QR()
                    var _ascii = qr.getASCII(_qr, _getAsciiOpts())

                    if (isDef(params.qrfile)) {
                        io.writeFileString(params.qrfile, _ascii)
                    } else {
                        oafp._print(_ascii)
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
| qr         | Reads data from the provided QR file |
| qrtemplate | QR input text template |

---

### 🧾 QR input option

Use with _in=qr_:

\`\`\`
oafp libs=qr in=qr data="my-qr.png"
\`\`\`

---

### 🧾 QRTemplate input option

Use with _in=qrtemplate_:

* If no option is provided, a list of available templates will be shown.
* If a map is provided with only the type (e.g. \`data="(type: wifi)"\`), a template for the corresponding type will be shown.

Available template types:
- \`url\`: Open URL in web browser
- \`bookmark\`: Save browser bookmark (MEBKM format)
- \`wifi\`: Connect to Wi-Fi network (WPA/WEP/nopass)
- \`sms\`: Send SMS text message
- \`tel\`: Make a phone call
- \`geo\`: Geolocation map coordinate / search query
- \`email\`: Compose email (mailto)
- \`contact\`: Add contact to address book (vCard 3.0 / MeCard)
- \`cal\`: Add event to calendar (iCalendar / vEvent)
- \`whatsapp\`: Open WhatsApp chat (wa.me)
- \`telegram\`: Open Telegram user/channel or share
- \`youtube\`: Open YouTube video
- \`facetime\`: FaceTime video or audio call
- \`otp\`: 2-Factor Authentication setup (TOTP/HOTP)
- \`crypto\`: Cryptocurrency payment (Bitcoin, Ethereum, Litecoin, Monero)
- \`epc\`: European Payments Council SEPA wire transfer (GiroCode)
- \`upi\`: Unified Payments Interface payment
- \`skype\`: Skype call or chat

---

## ⬆️  QR output formats

Extra output formats added by the QR lib:

| Output format | Description |
|---------------|-------------|
| qr            | Output a QR image (when qrfile is set) or ASCII QR in console |
| qrascii       | Output an ASCII QR in console (or text file if qrfile is set) |

If the input format is a map it's expected to follow one of the formats generated by in=qrtemplate.
If text (e.g. a VCARD or raw URL) is provided, it will be used as the QR content.

---

### 🧾 QR output options

List of options to use when _out=qr_ or _out=qrascii_:

| Option | Type | Description |
|--------|------|-------------|
| qrfile | string | Output file name (for image file or ASCII text file) |
| qrwidth | number | Width in pixels (for image output) |
| qrheight | number | Height in pixels (for image output) |
| qrformat | string | File format (png, jpg, gif) (for image output) |
| qrcompact | boolean | Use compact Unicode half-blocks (default: true) |
| qrinvert | boolean | Invert black and white modules (default: false) |
| qransi | boolean | Use ANSI color sequences (default: false) |
| qrmargin | number | Quiet zone margin in modules (default: 4) |
| qrecc | string | Error correction level (L, M, Q, H, default: M) |
| qrcharblack | string | Custom character(s) for black in non-compact mode (default: '  ') |
| qrcharwhite | string | Custom character(s) for white in non-compact mode (default: '██') |

`
        }

        return _r
    }
})()
