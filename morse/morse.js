// Author: Nuno Aguiar

(function() {
    const morse = {
        mode: {
            binary: {
                short    : "1",
                longer   : "111",
                intraGap : "0",
                letterGap: "000",
                wordsGap : "0000000"
            },
            human: {
                short    : ".",
                longer   : "-",
                intraGap : "",
                letterGap: " ",
                wordsGap : "  "
            }
        },
        alphabet: {
            "A": ".-",
            "B": "-...",
            "C": "-.-.",
            "D": "-..",
            "E": ".",
            "F": "..-.",
            "G": "--.",
            "H": "....",
            "I": "..",
            "J": ".---",
            "K": "-.-",
            "L": ".-..",
            "M": "--",
            "N": "-.",
            "O": "---",
            "P": ".--.",
            "Q": "--.-",
            "R": ".-.",
            "S": "...",
            "T": "-",
            "U": "..-",
            "V": "...-",
            "W": ".--",
            "X": "-..-",
            "Y": "-.--",
            "Z": "--..",

            "1": ".----",
            "2": "..---",
            "3": "...--",
            "4": "....-",
            "5": ".....",
            "6": "-....",
            "7": "--...",
            "8": "---..",
            "9": "----.",
            "0": "-----",

            ".": ".-.-.-",
            ",": "--..--",
            "?": "..--..",
            "'": ".----.",
            "!": "-.-.--",
            "/": "--..-.",
            "(": "_.__.",
            ")": "_.__._",
            "&": "._...",
            ":": "___...",
            ";": "_._._.",
            "=": "_..._",
            "+": "._._.",
            "-": "_...._",
            "_": "..__._",
            "\"": "._.._.",
            "$": "..._.._",
            "@": ".__._.",
            "È": "._.._",
            "É": ".._..",
            "Ç": "_._..",
            "À": ".__._"
        }
    }

    /**
     * <odoc>
     * <key>Morse.translateTo(aString, aMode) : String</key>
     * Converts the simple aString (case insensitive) provided into morse code. Optionally you can provide
     * the following aMode: human (default) and binary.
     * </odoc>
     */
    exports.translateTo = function(aStr, aMode) {
        _$(aStr, "aStr").isString().$_()
        aMode = _$(aMode, "aMode").isString().default("human")

        aStr = aStr.toUpperCase();
        var m = aStr.split(/ +/).map(word => {
            var w = ""
            for(var ii = 0; ii < word.length; ii++) {
                var c = word.charAt(ii)
                w += morse.alphabet[c].split("").map(r => ((r == "-") ? morse.mode[aMode].longer : morse.mode[aMode].short) ).join(morse.mode[aMode].intraGap)
                if (ii+1 < word.length) w += morse.mode[aMode].letterGap
            }
            return w
        }).join(morse.mode[aMode].wordsGap)

        return m
    };

    /**
     * <odoc>
     * <key>Morse.translateFrom(aMorseString, aMode) : String</key>
     * Converts aMorseString into the original, case insensitive, text. Optionally you can provide
     * the following source aMode: human (default) and binary.
     * </odoc>
     */
    exports.translateFrom = function(aMorse, aMode) {
        _$(aMorse, "aMorse").isString().$_()
        aMode = _$(aMode, "aMode").isString().default("human")

        return aMorse.split(morse.mode[aMode].wordsGap).map(word => {
            return word.split(morse.mode[aMode].letterGap).map(letter => {
                var mletter = letter.split(morse.mode[aMode].intraGap).map(symbol => {
                    if (symbol == morse.mode[aMode].short) return "."
                    if (symbol == morse.mode[aMode].longer) return "-"
                }).join("")
                return Object.keys(morse.alphabet)[Object.values(morse.alphabet).indexOf(mletter)]
            }).join("")
        }).join(" ")
    }
 })()