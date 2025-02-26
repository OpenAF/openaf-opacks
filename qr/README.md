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

Common output _out=qr_ options:

| Option | Type | Description |
|--------|------|-------------|
| qrfile | string | Output file name |
| qrwidth | number | Width in pixels |
| qrheight | number | Height in pixels |
| qrformat | string | File format (png, jpg, gif) |

### Example: Generate a contact QR code with a template

To get a template execute:

```bash
oafp libs=qr in=qrtemplate data="(type: contact)" > data.yaml
```

Then change the _data.yaml_ file and finally generate the QR code:

```bash
oafp libs=qr in=qrtemplate data.yaml out=qr qrfile=data.png
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