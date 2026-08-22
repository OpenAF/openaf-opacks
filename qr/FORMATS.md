# QR Code Text Formats & Scanner Actions Reference

When scanned by smartphones (iOS Camera, Google Lens, Android Camera) or dedicated barcode scanner apps, QR codes produce specialized actions based on their text prefix and structure.

Below is the complete reference of all QR text formats supported by the **QR** oPack and **oafp** (`libs=qr`).

---

## Summary of Supported Formats

| Format / Type | Description / Scanner Action | `oafp in=qrtemplate` Type | `qr.js` Helper Function |
|:---|:---|:---|:---|
| **URL / Web** | Opens webpage in default browser | `type: url` | `qr.genURLString(url)` |
| **Bookmark** | Prompts to bookmark a URL in browser | `type: bookmark` | `qr.genBookmarkString(title, url)` |
| **Wi-Fi** | Connects device automatically to Wi-Fi | `type: wifi` | `qr.genWifiString(ssid, pass, type, hidden)` |
| **Contact (vCard)** | Adds contact with full details to address book | `type: contact` (`cardType: vcard`) | `qr.genContactString("vcard", map)` |
| **Contact (MeCard)** | Adds compact contact to address book | `type: contact` (`cardType: mecard`) | `qr.genContactString("mecard", map)` |
| **Calendar Event** | Adds event to calendar (iCalendar / vEvent) | `type: cal` | `qr.genCalString(name, start, end, loc, desc)` |
| **Phone (Call)** | Prompts phone dialer to call a number | `type: tel` | `qr.genTelString(number)` |
| **SMS** | Opens SMS app with recipient & message | `type: sms` | `qr.genSMSString(number, message)` |
| **Email** | Opens email composer with to, cc, subject, body | `type: email` | `qr.genEmailString(to, subj, cc, body)` |
| **Geolocation** | Opens coordinates / query in Maps app | `type: geo` | `qr.genGeoString(lat, lon, query)` |
| **WhatsApp** | Opens WhatsApp chat with contact & text | `type: whatsapp` | `qr.genWhatsAppString(phone, message)` |
| **Telegram** | Opens Telegram user, channel, or share link | `type: telegram` | `qr.genTelegramString(username, message)` |
| **YouTube** | Opens video in YouTube app or browser | `type: youtube` | `qr.genYTString(videoId)` |
| **FaceTime** | Starts FaceTime video or audio call | `type: facetime` | `qr.genFTString(id, onlyAudio)` |
| **2FA / OTP** | Adds 2-Factor Auth token to Authenticator app | `type: otp` | `qr.genOTPAuth(account, issuer, secret, ...)` |
| **Cryptocurrency** | Opens crypto wallet to pay (BTC, ETH, LTC, XMR) | `type: crypto` | `qr.genCryptoString(coin, addr, amt, ...)` |
| **EPC / SEPA Transfer**| European banking apps prefill wire transfer | `type: epc` / `sepa` | `qr.genEPCString(iban, name, amt, bic, ...)` |
| **UPI Payment** | Indian payment apps (GPay, PhonePe) pay | `type: upi` | `qr.genUPIString(vpa, name, amt, note, ...)` |
| **Skype** | Opens Skype to call or chat | `type: skype` | `qr.genSkypeString(username, action)` |

---

## Detailed Format Specifications & Examples

### 1. URL / Web Link (`url`)

* **Scanner Action**: Directs the smartphone's default web browser to navigate to the specified URL.
* **Raw Format**: `https://openaf.io`

#### oafp Example
```bash
# Get template
oafp libs=qr in=qrtemplate data="(type: url)"

# Generate QR code
oafp libs=qr in=qrtemplate data='(type: url, url: "https://openaf.io")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genURLString("openaf.io"); // https://openaf.io
qr.printASCII(text);
```

---

### 2. Browser Bookmark (`bookmark`)

* **Scanner Action**: Prompts the browser to save a bookmark with the provided title and target URL (MEBKM format).
* **Raw Format**: `MEBKM:TITLE:OpenAF;URL:https://openaf.io;;`

#### oafp Example
```bash
# Get template
oafp libs=qr in=qrtemplate data="(type: bookmark)"

# Generate QR code
oafp libs=qr in=qrtemplate data='(type: bookmark, title: "OpenAF", url: "https://openaf.io")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genBookmarkString("OpenAF", "https://openaf.io");
qr.printASCII(text);
```

---

### 3. Wi-Fi Network Configuration (`wifi`)

* **Scanner Action**: Prompts the user to connect to the Wi-Fi network without requiring manual entry of the SSID or password.
* **Raw Format**: `WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<Password>;H:<true|false>;;`
  * `S`: Network SSID (name).
  * `T`: Authentication type (`WPA`, `WPA2`, `WPA3`, `WEP`, or `nopass`).
  * `P`: Password / Pre-shared key.
  * `H`: Hidden network flag (`true` or `false`).

#### oafp Example
```bash
# Get template
oafp libs=qr in=qrtemplate data="(type: wifi)"

# Generate QR code
oafp libs=qr in=qrtemplate data='(type: wifi, ssid: "MyOfficeWiFi", password: "SecretPassword123", authType: "WPA", hidden: false)' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genWifiString("MyOfficeWiFi", "SecretPassword123", "WPA", false);
qr.printASCII(text);
```

---

### 4. Contact Card (`contact` - vCard 3.0 & MeCard)

* **Scanner Action**: Prompts the operating system's address book / Contacts app to import a new contact with all specified fields.
* **Raw Formats**:
  * **vCard 3.0** (Standard & feature-rich):
    ```
    BEGIN:VCARD
    VERSION:3.0
    N:Doe;John;;;
    FN:John Doe
    ORG:Acme Corporation
    TITLE:Software Architect
    TEL;TYPE=WORK,VOICE:+15551234567
    EMAIL;TYPE=WORK:john.doe@example.com
    ADR;TYPE=WORK:;;123 Main St;City;State;12345;USA
    URL:https://example.com
    NOTE:Senior Engineer
    END:VCARD
    ```
  * **MeCard** (Compact format):
    ```
    MECARD:N:Doe,John;ORG:Acme Corporation;TEL:+15551234567;EMAIL:john.doe@example.com;ADR:123 Main St;URL:https://example.com;NOTE:Senior Engineer;;
    ```

#### oafp Example
```bash
# Get template
oafp libs=qr in=qrtemplate data="(type: contact)"

# Generate vCard QR
oafp libs=qr in=qrtemplate data='(type: contact, cardType: "vcard", name: "Doe;John", fn: "John Doe", company: "Acme Corp", title: "Engineer", tel: "+15551234567", email: "john@example.com", address: "123 Main St")' out=qr

# Generate from raw vCard file
oafp libs=qr in=raw contact.vcf out=qr qrfile=contact.png
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();

// vCard
var vcard = qr.genContactString("vcard", {
  name   : "Doe;John",
  fn     : "John Doe",
  company: "Acme Corp",
  title  : "Software Architect",
  tel    : "+15551234567",
  email  : "john.doe@example.com",
  address: "123 Main St",
  url    : "https://example.com",
  memo   : "Met at conference"
});
qr.printASCII(vcard);

// MeCard
var mecard = qr.genContactString("mecard", {
  name   : "Doe,John",
  tel    : "+15551234567",
  email  : "john.doe@example.com"
});
qr.printASCII(mecard);
```

---

### 5. Calendar Event (`cal` - iCalendar / vEvent)

* **Scanner Action**: Prompts calendar applications (Google Calendar, Apple Calendar, Outlook) to schedule an event.
* **Raw Format**:
  ```
  BEGIN:VEVENT
  SUMMARY:Quarterly Business Review
  DTSTART:20260901T090000Z
  DTEND:20260901T103000Z
  LOCATION:Main Conference Room
  DESCRIPTION:Discuss quarterly targets and achievements
  END:VEVENT
  ```

#### oafp Example
```bash
# Get template
oafp libs=qr in=qrtemplate data="(type: cal)"

# Generate QR code
oafp libs=qr in=qrtemplate data='(type: cal, name: "Sprint Planning", beginDate: "20260901T090000Z", endDate: "20260901T100000Z", location: "Room 4B", description: "Sprint backlog grooming")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var start = new Date();
var end   = new Date(Date.now() + 3600000); // 1 hour later
var text  = qr.genCalString("Sprint Planning", start, end, "Room 4B", "Sprint backlog grooming");
qr.printASCII(text);
```

---

### 6. Phone Number (`tel`)

* **Scanner Action**: Opens the device dialer with the phone number prefilled and ready to call.
* **Raw Format**: `tel:+15551234567`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: tel, number: "+15551234567")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
qr.printASCII(qr.genTelString("+15551234567"));
```

---

### 7. SMS Text Message (`sms`)

* **Scanner Action**: Opens the messaging app with the recipient number and message body prefilled.
* **Raw Format**: `smsto:+15551234567:Hello from OpenAF`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: sms, number: "+15551234567", message: "Hello! Here is the info you requested.")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
qr.printASCII(qr.genSMSString("+15551234567", "Hello! Here is the info you requested."));
```

---

### 8. Email Composer (`email`)

* **Scanner Action**: Opens the default email client with recipient(s), subject, CC addresses, and body text prefilled.
* **Raw Format**: `mailto:user@example.com?subject=Inquiry&cc=manager@example.com&body=Hello%20team`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: email, address: "support@example.com", subject: "Help Request", cclist: "admin@example.com", body: "Please help with my account.")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genEmailString("support@example.com", "Help Request", "admin@example.com", "Please help with my account.");
qr.printASCII(text);
```

---

### 9. Geolocation & Maps (`geo`)

* **Scanner Action**: Opens map navigation apps (Google Maps, Apple Maps, Waze) centered on coordinates or location search.
* **Raw Format**: `geo:38.7223,-9.1393?q=Lisbon`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: geo, lat: 38.7223, lon: -9.1393, query: { q: "Lisbon", z: 15 })' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genGeoString(38.7223, -9.1393, { q: "Lisbon", z: 15 });
qr.printASCII(text);
```

---

### 10. WhatsApp Chat (`whatsapp`)

* **Scanner Action**: Directly opens a chat window in WhatsApp with the designated phone number and prefilled text.
* **Raw Format**: `https://wa.me/15551234567?text=Hello%20there`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: whatsapp, phone: "+15551234567", message: "Hello there!")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genWhatsAppString("+15551234567", "Hello there!");
qr.printASCII(text);
```

---

### 11. Telegram (`telegram`)

* **Scanner Action**: Opens Telegram app to a user profile, channel, or message share dialog.
* **Raw Format**: `https://t.me/username?text=Hello`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: telegram, username: "openaf", message: "Hi OpenAF!")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genTelegramString("openaf", "Hi OpenAF!");
qr.printASCII(text);
```

---

### 12. YouTube Video (`youtube`)

* **Scanner Action**: Opens the video directly in the YouTube app or browser.
* **Raw Format**: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: youtube, videoId: "dQw4w9WgXcQ")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
qr.printASCII(qr.genYTString("dQw4w9WgXcQ"));
```

---

### 13. FaceTime (`facetime`)

* **Scanner Action**: Prompts a FaceTime video or audio call on Apple devices (iOS, macOS).
* **Raw Format**: `facetime:user@example.com` or `facetime-audio:+15551234567`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: facetime, id: "user@example.com", onlyAudio: false)' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
qr.printASCII(qr.genFTString("user@example.com", false));
```

---

### 14. 2-Factor Authentication / OTP (`otp`)

* **Scanner Action**: Authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, 1Password, Bitwarden) import the TOTP/HOTP secret key and automatically begin generating one-time codes.
* **Raw Format (Key URI)**: `otpauth://totp/IssuerName:accountName?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=IssuerName&algorithm=SHA1&digits=6&period=30`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: otp, accountName: "john.doe@example.com", issuer: "MySecureApp", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ", algorithm: "SHA1", digits: 6, period: 30)' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genOTPAuth("john.doe@example.com", "MySecureApp", "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ", "SHA1", 6, 30);
qr.printASCII(text);
```

---

### 15. Cryptocurrency Payment (`crypto` / `bitcoin` / `ethereum`)

* **Scanner Action**: Cryptocurrency wallet apps (Bitcoin core/mobile wallets, MetaMask, Trust Wallet, etc.) parse the address, prefill the transaction amount, label, and payment note.
* **Raw Formats**:
  * **Bitcoin (BIP 21)**: `bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.005&label=Donation&message=Thank%20you`
  * **Ethereum (EIP 681)**: `ethereum:0x0000000000000000000000000000000000000000?value=1.5`
  * **Litecoin**: `litecoin:L...`
  * **Monero**: `monero:4...`

#### oafp Example
```bash
# Bitcoin
oafp libs=qr in=qrtemplate data='(type: crypto, coin: "bitcoin", address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", amount: 0.005, label: "Donation", message: "Thank you")' out=qr

# Ethereum
oafp libs=qr in=qrtemplate data='(type: crypto, coin: "ethereum", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", amount: 0.25)' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var btc = qr.genBitcoinString("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", 0.005, "Donation", "Thank you");
qr.printASCII(btc);

var eth = qr.genEthereumString("0x742d35Cc6634C0532925a3b844Bc454e4438f44e", 0.25);
qr.printASCII(eth);
```

---

### 16. EPC SEPA Bank Transfer / GiroCode (`epc` / `sepa` / `girocode`)

* **Scanner Action**: Scanned by European mobile banking apps (Revolut, N26, Sparkasse, ING, BNP Paribas, Millennium BCP, Caixa, Santander, etc.) to immediately prefill a SEPA bank wire transfer without typing long IBANs.
* **Raw Format (EPC069-12 standard)**:
  ```
  BCD
  002
  1
  SCT
  TESTPTPL
  John Doe
  PT50000000000000000000000
  EUR25.50
  
  
  Invoice 12345
  ```

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: epc, iban: "PT50000000000000000000000", name: "John Doe", amount: 25.50, bic: "TESTPTPL", remittance: "Invoice 12345")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genEPCString("PT50000000000000000000000", "John Doe", 25.50, "TESTPTPL", "Invoice 12345");
qr.printASCII(text);
```

---

### 17. Unified Payments Interface (`upi`)

* **Scanner Action**: Scanned by UPI-enabled payment apps (Google Pay, PhonePe, Paytm, BHIM) to make an instant payment.
* **Raw Format**: `upi://pay?pa=recipient@upi&pn=John%20Doe&am=500.00&cu=INR&tn=Dinner%20Bill`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: upi, vpa: "john@upi", name: "John Doe", amount: 500.00, note: "Dinner Bill", currency: "INR")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
var text = qr.genUPIString("john@upi", "John Doe", 500.00, "Dinner Bill", "INR");
qr.printASCII(text);
```

---

### 18. Skype Action (`skype`)

* **Scanner Action**: Opens Skype to place a voice/video call or start a chat.
* **Raw Format**: `skype:username?call` or `skype:username?chat`

#### oafp Example
```bash
oafp libs=qr in=qrtemplate data='(type: skype, username: "echo123", action: "call")' out=qr
```

#### OpenAF Script Example
```javascript
loadLib("qr.js");
var qr = new QR();
qr.printASCII(qr.genSkypeString("echo123", "call"));
```
