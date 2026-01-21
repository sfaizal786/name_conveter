// fixer.js
const fs = require("fs");
const iconv = require("iconv-lite");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

class NameFixer {

    // 🔹 Fix mojibake (UTF-8 shown as Latin1 etc.)
    static fixMojibake(text) {
        if (!text) return "";
        text = text.toString().trim();

        const mojibakeMap = {
            "Ã¡": "á", "Ã©": "é", "Ã­": "í", "Ã³": "ó", "Ãº": "ú",
            "Ã±": "ñ", "Ã¤": "ä", "Ã¥": "å", "Ã¶": "ö",
            "Ã¸": "ø", "Ã˜": "Ø", "Ã…": "Å",
            "Ã†": "Æ", "Ã¦": "æ",
            "Ãœ": "Ü", "Ã¼": "ü",
            "â€“": "–", "â€”": "—", "â€™": "’", "â€˜": "‘",
            "â€œ": "“", "â€": "”", "â€¦": "…"
        };

        for (const [bad, good] of Object.entries(mojibakeMap)) {
            text = text.replace(new RegExp(bad, "g"), good);
        }

        // Attempt re-decode if mojibake remains
        if (/[ÃâÂ]/.test(text)) {
            try {
                const buffer = Buffer.from(text, "binary");
                text = iconv.decode(buffer, "utf8");
            } catch (_) { }
        }

        return text;
    }

    // 🔹 Remove titles & professions
    static removeTitles(text) {
        if (!text) return "";

        const titles = [
            // Medical
            "dr", "doctor", "md", "mbbs", "dmd", "dds", "do", "pharmd",
            "rn", "lpn", "np", "pa",

            // Academic
            "prof", "professor", "assoc prof", "asst prof",
            "phd", "dphil", "edd", "msc", "ma", "mba", "bsc", "ba", "bba",

            // Legal
            "esq", "esquire", "adv", "advocate", "attorney",
            "llb", "llm", "jd",

            // Engineering / Tech
            "eng", "engineer", "er",
            "architect", "arch",

            // Finance
            "ca", "cpa", "cfa", "cma", "acca", "cs",

            // Science / Research
            "scientist", "researcher",

            // Military / Govt
            "gen", "general", "col", "colonel", "maj", "major",
            "capt", "captain", "lt", "lieutenant",
            "cmdr", "commander", "sgt", "sergeant",

            // Religious
            "rev", "reverend", "fr", "father", "pastor",
            "imam", "rabbi", "bishop",

            // Honorifics
            "mr", "mrs", "ms", "miss", "mx",
            "sir", "madam", "dame", "lord", "lady",

            // Corporate titles
            "ceo", "cto", "cfo", "coo", "cio",
            "vp", "svp", "evp", "avp",
            "director", "manager", "lead", "head",

            // Nobility / Special
            "his excellency", "her excellency",
            "hon", "honorable",

            // Suffixes
            "jr", "sr", "ii", "iii", "iv"
        ];


        const pattern = new RegExp(
            `\\b(${titles.join("|")})\\b`,
            "gi"
        );

        return text.replace(pattern, "");
    }

    // 🔹 Remove punctuation except hyphen & apostrophe
    static removeSpecialCharacters(text) {
        return text
            .replace(/[.,;:!?()[\]{}\\/|]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    // 🔹 Capitalize name parts correctly
    static smartCapitalize(text) {
        return text
            .split(/\s+/)
            .map(word =>
                word
                    .split(/([-'])/)
                    .map(part =>
                        /^[a-zA-Z]/.test(part)
                            ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                            : part
                    )
                    .join("")
            )
            .join(" ");
    }

    // 🔹 Normalize to ASCII
    static normalizeToASCII(text, options = {}) {
        if (!text) return "";

        const { preserveAccents = false } = options;

        text = this.removeTitles(text);
        text = this.removeSpecialCharacters(text);

        if (!preserveAccents) {
            const map = {
                "Ø": "O", "ø": "o",
                "Å": "A", "å": "a",
                "Æ": "AE", "æ": "ae",
                "Ä": "A", "ä": "a",
                "Ö": "O", "ö": "o",
                "Ü": "U", "ü": "u",
                "Ñ": "N", "ñ": "n",
                "ß": "ss"
            };

            for (const [k, v] of Object.entries(map)) {
                text = text.replace(new RegExp(k, "g"), v);
            }

            text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        return this.smartCapitalize(text);
    }
}

/* ================= CSV PROCESSOR ================= */

function processCSV(inputFile, outputFile, options = {}) {
    const { preserveAccents = false, logProgress = false } = options;

    const content = fs.readFileSync(inputFile);
    let decoded = iconv.decode(content, "utf8");

    if (decoded.charCodeAt(0) === 0xFEFF) {
        decoded = decoded.slice(1);
    }

    const records = parse(decoded, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    const processed = records.map((r, i) => {
        const firstRaw = r.first_name || r.firstName || "";
        const lastRaw = r.last_name || r.lastName || "";

        const first = NameFixer.normalizeToASCII(
            NameFixer.fixMojibake(firstRaw),
            { preserveAccents }
        );

        const last = NameFixer.normalizeToASCII(
            NameFixer.fixMojibake(lastRaw),
            { preserveAccents }
        );

        if (logProgress && i < 5) {
            console.log(`"${firstRaw} ${lastRaw}" → "${first} ${last}"`);
        }

        return { ...r, first_name: first, last_name: last };
    });

    const output = stringify(processed, { header: true, quoted: true });
    fs.writeFileSync(outputFile, "\uFEFF" + output, "utf8");

    return processed.length;
}

/* ================= CLI ================= */

if (require.main === module) {
    const [input, output, ...flags] = process.argv.slice(2);

    if (!input || !output) {
        console.log("Usage: node fixer.js input.csv output.csv [--preserve-accents] [--verbose]");
        process.exit(1);
    }

    const options = {
        preserveAccents: flags.includes("--preserve-accents"),
        logProgress: flags.includes("--verbose")
    };

    const count = processCSV(input, output, options);
    console.log(`✅ Processed ${count} records`);
}

module.exports = { NameFixer, processCSV };
