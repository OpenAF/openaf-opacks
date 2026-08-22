# QR oPack

Generate, customize, and read QR codes in OpenAF and via the `oafp` command-line utility. Supports generating image files (PNG, JPG, GIF), ANSI/Unicode terminal ASCII output, and encoding specialized QR text formats (Wi-Fi, vCard/MeCard, Calendar, Email, SMS, Geolocation, WhatsApp, Telegram, OTP/2FA, Crypto, SEPA/EPC banking transfers, UPI, and more).

## Installing

```bash
opack install qr
```

---

## Using with oAFp

Check all options by executing:

```bash
oafp libs=qr help=qr
```

### Output Formats

| Format | Description |
|---|---|
| `qr` | Output a QR image (when `qrfile` is set) or ASCII QR in console |
| `qrascii` | Output an ASCII QR in console (or text file if `qrfile` is set) |

### Common Output Options

| Option | Type | Default | Description |
|---|---|---|---|
| `qrfile` | string | _none_ | Output file name (for image or ASCII text file) |
| `qrwidth` | number | 350 | Width in pixels (for image output) |
| `qrheight` | number | 350 | Height in pixels (for image output) |
| `qrformat` | string | `png` | File format (`png`, `jpg`, `gif`) (for image output) |
| `qrcompact` | boolean | `true` | Use compact Unicode half-blocks (2 modules per line) |
| `qrinvert` | boolean | `false` | Invert black and white modules |
| `qransi` | boolean | `false` | Use ANSI escape color sequences |
| `qrmargin` | number | 4 | Quiet zone margin in modules |
| `qrecc` | string | `M` | Error correction level (`L`, `M`, `Q`, `H`) |
| `qrcharblack` | string | `'  '` | Custom character(s) for black in non-compact mode |
| `qrcharwhite` | string | `'██'` | Custom character(s) for white in non-compact mode |

---

## QR Text Formats & Scanner Actions

When scanned by smartphones (iOS Camera, Google Lens, Android Camera) or barcode scanner apps, QR codes trigger different actions based on their text format.

### Supported Formats Summary

| Format / Type | Description / Scanner Action | `in=qrtemplate` Type | `qr.js` Method |
|:---|:---|:---|:---|
| **URL / Web** | Opens webpage in default browser | `type: url` | `qr.genURLString(url)` |
| **Bookmark** | Prompts to bookmark a URL in browser | `type: bookmark` | `qr.genBookmarkString(title, url)` |
| **Wi-Fi** | Connects device automatically to Wi-Fi | `type: wifi` | `qr.genWifiString(ssid, pass, type, hidden)` |
| **Contact (vCard)** | Adds contact with full details to address book | `type: contact` | `qr.genContactString("vcard", map)` |
| **Contact (MeCard)** | Adds compact contact to address book | `type: contact` | `qr.genContactString("mecard", map)` |
| **Calendar Event** | Adds event to calendar (iCalendar / vEvent) | `type: cal` | `qr.genCalString(name, start, end, loc, desc)` |
| **Phone (Call)** | Prompts phone dialer to call number | `type: tel` | `qr.genTelString(number)` |
| **SMS** | Opens SMS app with recipient & message | `type: sms` | `qr.genSMSString(number, message)` |
| **Email** | Opens email composer with to, cc, subject, body | `type: email` | `qr.genEmailString(to, subj, cc, body)` |
| **Geolocation** | Opens coordinates / query in Maps app | `type: geo` | `qr.genGeoString(lat, lon, query)` |
| **WhatsApp** | Opens WhatsApp chat with contact & text | `type: whatsapp` | `qr.genWhatsAppString(phone, message)` |
| **Telegram** | Opens Telegram user, channel, or share link | `type: telegram` | `qr.genTelegramString(username, message)` |
| **YouTube** | Opens video in YouTube app or browser | `type: youtube` | `qr.genYTString(videoId)` |
| **FaceTime** | Starts FaceTime video or audio call | `type: facetime` | `qr.genFTString(id, onlyAudio)` |
| **2FA / OTP** | Adds 2-Factor Auth token to Authenticator app | `type: otp` | `qr.genOTPAuth(account, issuer, secret, ...)` |
| **Cryptocurrency** | Opens crypto wallet to pay (BTC, ETH, LTC, XMR) | `type: crypto` | `qr.genCryptoString(coin, addr, amt, ...)` |
| **EPC / SEPA Transfer**| European banking apps prefill wire transfer | `type: epc` | `qr.genEPCString(iban, name, amt, bic, ...)` |
| **UPI Payment** | Indian payment apps (GPay, PhonePe) pay | `type: upi` | `qr.genUPIString(vpa, name, amt, note, ...)` |
| **Skype** | Opens Skype to call or chat | `type: skype` | `qr.genSkypeString(username, action)` |

> For complete specifications and detailed raw formats, see [FORMATS.md](FORMATS.md).

---

### Examples with oafp & OpenAF

#### 1. URL / Web Link
```bash
# Using oafp template
oafp libs=qr in=qrtemplate data='(type: url, url: "https://openaf.io")' out=qr

# Direct raw string
oafp libs=qr in=raw data="https://openaf.io" out=qr
```
```javascript
// OpenAF Script
loadLib("qr.js");
var qr = new QR();
qr.printASCII(qr.genURLString("openaf.io"));
```

#### 2. Wi-Fi Network Configuration
* Automatically connects mobile devices to the Wi-Fi network without typing passwords.
```bash
# Generate template file to edit
oafp libs=qr in=qrtemplate data="(type: wifi)" > wifi.yaml

# Generate image or print to console
oafp libs=qr in=qrtemplate data='(type: wifi, ssid: "MyOffice", password: "SecretPassword", authType: "WPA")' out=qr qrfile=wifi.png
```
```javascript
// OpenAF Script
var text = qr.genWifiString("MyOffice", "SecretPassword", "WPA", false);
qr.write2File(text, "wifi.png", 350, 350, "PNG");
```

#### 3. Contact Card (vCard 3.0 & MeCard)
* Prompts to import contact details directly into the phone's address book.
```bash
# Get contact template
oafp libs=qr in=qrtemplate data="(type: contact)" > contact.yaml

# Generate QR code from template
oafp libs=qr in=qrtemplate data='(type: contact, cardType: "vcard", name: "Doe;John", fn: "John Doe", company: "Acme Corp", title: "Software Architect", tel: "+15551234567", email: "john.doe@example.com", address: "123 Main St", url: "https://example.com")' out=qr

# Or from raw .vcf / .txt file
oafp libs=qr in=raw contact.vcf out=qr qrfile=contact.png
```
```javascript
// OpenAF Script
var vcard = qr.genContactString("vcard", {
  name   : "Doe;John",
  fn     : "John Doe",
  company: "Acme Corp",
  title  : "Software Architect",
  tel    : "+15551234567",
  email  : "john.doe@example.com",
  address: "123 Main St",
  url    : "https://example.com"
});
qr.printASCII(vcard);
```

#### 4. Calendar Event (iCalendar / vEvent)
* Prompts calendar apps (Google Calendar, Apple Calendar, Outlook) to add an event.
```bash
oafp libs=qr in=qrtemplate data='(type: cal, name: "Project Kickoff", beginDate: "20260901T090000Z", endDate: "20260901T100000Z", location: "Meeting Room A", description: "Discuss project roadmap")' out=qr
```
```javascript
// OpenAF Script
var start = new Date();
var end   = new Date(Date.now() + 3600000);
qr.printASCII(qr.genCalString("Project Kickoff", start, end, "Meeting Room A", "Discuss project roadmap"));
```

#### 5. Email Message
* Opens the default email app with recipient, subject, CC, and message prefilled.
```bash
oafp libs=qr in=qrtemplate data='(type: email, address: "support@example.com", subject: "Inquiry", cclist: "admin@example.com", body: "Hello team")' out=qr
```
```javascript
// OpenAF Script
qr.printASCII(qr.genEmailString("support@example.com", "Inquiry", "admin@example.com", "Hello team"));
```

#### 6. SMS & Phone Calls
```bash
# Phone call
oafp libs=qr in=qrtemplate data='(type: tel, number: "+15551234567")' out=qr

# SMS text message
oafp libs=qr in=qrtemplate data='(type: sms, number: "+15551234567", message: "Hello from OpenAF")' out=qr
```
```javascript
// OpenAF Script
qr.printASCII(qr.genTelString("+15551234567"));
qr.printASCII(qr.genSMSString("+15551234567", "Hello from OpenAF"));
```

#### 7. Geolocation / Maps
* Opens map navigation apps at the specified coordinates or search location.
```bash
oafp libs=qr in=qrtemplate data='(type: geo, lat: 38.7223, lon: -9.1393, query: { q: "Lisbon", z: 15 })' out=qr
```
```javascript
// OpenAF Script
qr.printASCII(qr.genGeoString(38.7223, -9.1393, { q: "Lisbon", z: 15 }));
```

#### 8. WhatsApp & Telegram
```bash
# WhatsApp chat
oafp libs=qr in=qrtemplate data='(type: whatsapp, phone: "+15551234567", message: "Hello!")' out=qr

# Telegram
oafp libs=qr in=qrtemplate data='(type: telegram, username: "openaf", message: "Hi!")' out=qr
```
```javascript
// OpenAF Script
qr.printASCII(qr.genWhatsAppString("+15551234567", "Hello!"));
qr.printASCII(qr.genTelegramString("openaf", "Hi!"));
```

#### 9. 2-Factor Authentication (OTP / 2FA)
* Scanned by authenticator apps (Google Authenticator, Authy, 1Password, Bitwarden) to import 2FA token.
```bash
oafp libs=qr in=qrtemplate data='(type: otp, accountName: "user@example.com", issuer: "MyApp", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ", algorithm: "SHA1", digits: 6, period: 30)' out=qr
```
```javascript
// OpenAF Script
var otp = qr.genOTPAuth("user@example.com", "MyApp", "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ", "SHA1", 6, 30);
qr.printASCII(otp);
```

#### 10. Cryptocurrency Payments (Bitcoin, Ethereum, etc.)
* Opens wallet apps prefilled with recipient address, amount, label, and message.
```bash
# Bitcoin (BIP 21)
oafp libs=qr in=qrtemplate data='(type: crypto, coin: "bitcoin", address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", amount: 0.005, label: "Donation", message: "Thanks")' out=qr

# Ethereum (EIP 681)
oafp libs=qr in=qrtemplate data='(type: crypto, coin: "ethereum", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", amount: 0.25)' out=qr
```
```javascript
// OpenAF Script
qr.printASCII(qr.genBitcoinString("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", 0.005, "Donation", "Thanks"));
qr.printASCII(qr.genEthereumString("0x742d35Cc6634C0532925a3b844Bc454e4438f44e", 0.25));
```

#### 11. EPC SEPA Bank Transfer / GiroCode
* Scanned by European mobile banking apps (Revolut, N26, Sparkasse, ING, BNP Paribas, Caixa, Millennium BCP, etc.) to immediately prefill a SEPA bank wire transfer.
```bash
oafp libs=qr in=qrtemplate data='(type: epc, iban: "PT50000000000000000000000", name: "John Doe", amount: 25.50, bic: "TESTPTPL", remittance: "Invoice 12345")' out=qr
```
```javascript
// OpenAF Script
var epc = qr.genEPCString("PT50000000000000000000000", "John Doe", 25.50, "TESTPTPL", "Invoice 12345");
qr.printASCII(epc);
```

#### 12. UPI Payment
* Scanned by UPI apps (Google Pay, PhonePe, Paytm, BHIM) for instant payment.
```bash
oafp libs=qr in=qrtemplate data='(type: upi, vpa: "john@upi", name: "John Doe", amount: 500.00, note: "Dinner Bill", currency: "INR")' out=qr
```
```javascript
// OpenAF Script
qr.printASCII(qr.genUPIString("john@upi", "John Doe", 500.00, "Dinner Bill", "INR"));
```

---

## Reading QR Codes

Decode QR codes from an image file using `in=qr`:

```bash
# Read QR code from image file
oafp libs=qr in=qr data="my-qr.png" out=raw
```

```javascript
// In OpenAF script
loadLib("qr.js");
var qr = new QR();
var text = String(qr.read4File("my-qr.png"));
print("Decoded content: " + text);
```

---

## OpenAF Scripting Reference

```javascript
loadLib("qr.js");

var qr = new QR();

// 1. Print compact ASCII QR to console
qr.printASCII("https://openaf.io");

// 2. Get ASCII QR string with custom options
var ascii = qr.getASCII("https://openaf.io", {
  compact  : true,   // Unicode half-blocks (2 modules per line)
  margin   : 4,      // Quiet zone margin in modules
  invert   : false,  // Invert colors
  ansi     : false,  // ANSI escape color sequences
  ecc      : "M",    // Error correction: L (7%), M (15%), Q (25%), H (30%)
  charBlack: "  ",   // Custom characters for non-compact mode
  charWhite: "██"
});

// 3. Write QR code to an image file (PNG, JPG, GIF)
qr.write2File("https://openaf.io", "qr.png", 350, 350, "PNG");

// 4. Write QR code to a stream
var os = af.newOutputStream();
qr.write2Stream("https://openaf.io", os, 350, 350, "PNG");

// 5. Decode QR code from image file or stream
var content = String(qr.read4File("qr.png"));
var streamContent = String(qr.read4Stream(inputStream));
```