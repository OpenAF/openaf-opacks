loadLib("googlePhoneNumber.js");
var params = processExpr(" ");

if (isDef(params.update)) {
   oJobRunFile("updateGooglePhoneNumber.yaml");
} else {
	if (isUnDef(params.number) || isUnDef(params.country)) {
	   print("Please enter, as parameters: \"number=123456789 country=PT\"");
	} else {
	   print(af.toYAML(new GooglePhoneNumber().getInfo(params.number, params.country)));
	}
}
