/**
 * <odoc>
 * <key>Mac.macSay(aMsg, aVoice, quiet) : String</key>
 * Tries to say aMsg using the mac "say" command. Optionally you can specify aVoice name.
 * </odoc>
 */
var macSay = (msg, voice, quiet) => { 
    quiet = _$(quiet, "quiet").isBoolean().default(false)
    var _args = ["say"]

    if (isString(voice)) {
        _args.push("-v")
        _args.push(voice)
    }

    _args.push(msg)
    if (!quiet) print(ansiColor("BOLD", "🎙  mac talking... "))
    $sh(["say", "-v", "Jamie", msg]).exec()

    return !quiet ? ansiColor("ITALIC", msg) : msg
}