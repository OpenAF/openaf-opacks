// Author: nuno.aguiar@wedotechnologies.com

var IMEICheck = function(aDataPath) {
    if (isUnDef(aDataPath)) this.dataPath = (isDef(getOPackPaths()["IMEICheck"])) ? getOPackPaths()["IMEICheck"]+"/data" : "./data";
    this.DATA_PATH = (new java.io.File(this.dataPath)).getAbsolutePath();
}

IMEICheck.prototype.luhnCheck = function(aValue) {
    // accept only digits, dashes or spaces
    aValue = String(aValue);
    if (/[^0-9-\s]+/.test(aValue)) return false;

    var nCheck = 0, nDigit = 0, bEven = false;
    aValue = aValue.replace(/\D/g, "");

    for (var n = aValue.length - 1; n >= 0; n--) {
       var cDigit = aValue.charAt(n),
       nDigit = parseInt(cDigit, 10);

       if (bEven) {
          if ((nDigit *= 2) > 9) nDigit -= 9;
       }

       nCheck += nDigit;
       bEven = !bEven;
    }

    return (nCheck % 10) == 0;
}

IMEICheck.prototype.getLuhn = function(aValue) {
    aValue = String(aValue);

    var luhnArr = [[0,1,2,3,4,5,6,7,8,9],[0,2,4,6,8,1,3,5,7,9]], sum = 0;
    aValue.replace(/\D+/g,"").replace(/[\d]/g, function(c, p, o){
        sum += luhnArr[ (o.length-p)&1 ][ parseInt(c,10) ]
    });
    return aValue + ((10 - sum%10)%10);
}

IMEICheck.prototype.getName = function(aIMEI) {
  aIMEI = String(aIMEI);
  if ($ch().list().indexOf("imeicheck::tacdb") < 0) {
    var csv = new CSV();
    csv.setSeparator(",");
    csv.readFile(this.DATA_PATH + "/tacdb.csv");
    $ch("imeicheck::tacdb").create();
    $ch("imeicheck::tacdb").setAll(["tac"], csv.csv());
  }

  var res = $ch("imeicheck::tacdb").get({ tac: Number(aIMEI.substr(0, 8)) });

  if (isUnDef(res)) res = "n/a"; else res = res.name;
  return res.trim();
}

IMEICheck.prototype.getInfo = function(aIMEI) {
    return {
       isValidIMEI: this.isValidIMEI(aIMEI),
       name       : this.getName(aIMEI)
    }
}

IMEICheck.prototype.isValidIMEI = function(aIMEI) {
  return (this.getLuhn(String(aIMEI).substring(0, 14)) == String(aIMEI));
}

IMEICheck.prototype.convertIMEISV2IMEI = function(aIMEISV) {
  return (this.getLuhn(String(aIMEISV).substring(0,14)));
}