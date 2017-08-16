#!openaf-sb

plugin("Console");

print("Encrypted password: " + af.encrypt((new Console).readLinePrompt("Enter password: ", "*")));