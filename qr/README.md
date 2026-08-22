# QR oPack

## Installing

```bash
opack install qr
```

## Using the oAFp

Check all options by executing:

```bash
oafp libs=qr help=qr
```

Output formats:

| Format | Description |
|--------|-------------|
| qr | Output a QR image (when `qrfile` is set) or ASCII QR in console |
| qrascii | Output an ASCII QR in console (or text file if `qrfile` is set) |

Common output options:

| Option | Type | Description |
|--------|------|-------------|
| qrfile | string | Output file name (image or ASCII text file) |
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

### Example: Print QR code in terminal (ASCII)

```bash
# Print QR code directly to console
oafp libs=qr in=raw data="https://openaf.io" out=qr

# Or using explicit qrascii output
oafp libs=qr in=raw data="https://openaf.io" out=qrascii

# Non-compact ASCII mode with custom margin
oafp libs=qr in=raw data="https://openaf.io" out=qrascii qrcompact=false qrmargin=1
```

### Example: Generate a contact QR code with a template

To get a template execute:

```bash
oafp libs=qr in=qrtemplate data="(type: contact)" > data.yaml
```

Then change the _data.yaml_ file and finally generate the QR code image or console ASCII:

```bash
# Generate image file
oafp libs=qr in=qrtemplate data.yaml out=qr qrfile=data.png

# Or display in console
oafp libs=qr in=qrtemplate data.yaml out=qr
```

> For more than simple options check below "with raw vCard"

### Example: Generate a contact QR code with raw vCard

Save the following contents to _test.txt_:

```
BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
ORG:Example Corporation
TITLE:Software Engineer
TEL;TYPE=WORK,VOICE:(555) 555-1234
TEL;TYPE=HOME,VOICE:(555) 555-5678
ADR;TYPE=WORK:;;123 Business St;City;State;12345;United States
EMAIL;TYPE=WORK:john.doe@example.com
URL:https://www.example.com
END:VCARD
```

Then execute:

```bash
oafp libs=qr in=raw test.txt out=qr qrfile=test.png
```

## Using in OpenAF Scripts

```javascript
loadLib("qr.js");

var qr = new QR();

// Print ASCII QR to console (compact Unicode mode by default)
qr.printASCII("https://openaf.io");

// Get ASCII QR string with options
var ascii = qr.getASCII("https://openaf.io", {
  compact: true,   // use half-block characters (default: true)
  margin : 4,      // quiet zone margin (default: 4)
  invert : false,  // invert colors (default: false)
  ansi   : false,  // use ANSI color sequences (default: false)
  ecc    : "M"     // error correction: L, M, Q, H (default: M)
});

// Non-compact ASCII with custom characters
var rawAscii = qr.getASCII("https://openaf.io", {
  compact  : false,
  charBlack: "  ",
  charWhite: "██"
});

// Write to image file
qr.write2File("https://openaf.io", "qr.png", 350, 350, "PNG");

// Read from image file
var text = String(qr.read4File("qr.png"));
```