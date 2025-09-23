// fix.js
const fs = require('fs');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

class NameFixer {
    // Fix common mojibake issues
    static fixMojibake(text) {
        if (!text) return '';
        text = text.toString().trim();

        const mojibakeMap = {
            'Ã¡':'á','Ã©':'é','Ã­':'í','Ã³':'ó','Ãº':'ú','Ã±':'ñ',
            'Ã¢':'â','Ã£':'ã','Ã¤':'ä','Ã¥':'å',
            'Ã¨':'è','Ãª':'ê','Ã«':'ë',
            'Ã¬':'ì','Ãî':'î','Ãï':'ï',
            'Ã°':'ð','Ãñ':'ñ','Ãò':'ò','Ãô':'ô','Ãõ':'õ','Ãö':'ö',
            'Ã¹':'ù','Ãú':'ú','Ãû':'û','Ãü':'ü',
            'Ãý':'ý','Ãþ':'þ','Ãÿ':'ÿ',
            'Ã˜':'Ø','Ã¸':'ø','Ã†':'Æ','Ã¦':'æ','Ã…':'Å','Ã¥':'å',
            'â€“':'–','â€”':'—','â€˜':'‘','â€™':'’',
            'â€œ':'“','â€':'”','â€¦':'…'
        };

        if (/Ã|â|Â|ð|ÿ|þ|â€/.test(text)) {
            const patterns = ['utf8', 'latin1', 'windows-1252'];
            for (const encoding of patterns) {
                try {
                    const buffer = Buffer.from(text, 'binary');
                    const decoded = iconv.decode(buffer, encoding);
                    if (!/Ã|â|Â|ð|ÿ|þ|â€/.test(decoded) || decoded !== text) {
                        text = decoded;
                        break;
                    }
                } catch {}
            }
        }

        for (const [wrong, correct] of Object.entries(mojibakeMap)) {
            text = text.replace(new RegExp(wrong, 'g'), correct);
        }

        return text;
    }

    // Capitalize first letter of each word
    static capitalizeFirstLetter(text) {
        if (!text) return '';
        return text.split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Normalize to ASCII (with optional accent preservation)
    static normalizeToASCII(text, options = {}) {
        if (!text) return '';
        text = text.toString().trim();

        const {
            preserveAccents = false,
            removeSpecialChars = true,
            caseSensitive = false,
            capitalizeFirst = true
        } = options;

        const map = {
            'Ø':'O','ø':'o','Æ':'AE','æ':'ae','Å':'A','å':'a',
            'Ä':'A','ä':'a','Ö':'O','ö':'o','Ñ':'N','ñ':'n',
            'Ü':'U','ü':'u','ß':'ss','Ç':'C','ç':'c'
        };

        for (const [wrong, correct] of Object.entries(map)) {
            text = text.split(wrong).join(correct);
        }

        if (!preserveAccents) {
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        if (removeSpecialChars) {
            text = text.replace(/[^a-zA-Z0-9\s\-']/g, '');
            text = text.replace(/\s+/g, ' ');
        }

        if (!caseSensitive) {
            text = text.toLowerCase();
        }

        if (capitalizeFirst) {
            text = this.capitalizeFirstLetter(text);
        }

        return text;
    }
}

// Process CSV file
function processCSV(inputFile, outputFile, options = {}) {
    const {
        preserveAccents = false,
        removeSpecialChars = true,
        caseSensitive = false,
        capitalizeFirst = true,
        logProgress = false,
        encoding = 'utf8'
    } = options;

    if (!fs.existsSync(inputFile)) throw new Error(`Input file not found: ${inputFile}`);

    let content;
    try {
        content = fs.readFileSync(inputFile, encoding);
    } catch {
        const buffer = fs.readFileSync(inputFile);
        content = iconv.decode(buffer, 'utf8');
    }

    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true });

    const processed = records.map(r => {
        const firstRaw = r.first_name || r.firstName || r.FirstName || r.First_Name || '';
        const lastRaw = r.last_name || r.lastName || r.LastName || r.Last_Name || '';

        const firstFixed = NameFixer.fixMojibake(firstRaw);
        const lastFixed = NameFixer.fixMojibake(lastRaw);

        const first = NameFixer.normalizeToASCII(firstFixed, { preserveAccents, removeSpecialChars, caseSensitive, capitalizeFirst });
        const last = NameFixer.normalizeToASCII(lastFixed, { preserveAccents, removeSpecialChars, caseSensitive, capitalizeFirst });

        return { ...r, first_name: first, last_name: last, first_name_original: firstRaw, last_name_original: lastRaw };
    });

    const csvOutput = stringify(processed, { header: true, quoted: true, quoted_empty: true });
    fs.writeFileSync(outputFile, '\uFEFF' + csvOutput, 'utf8');

    if (logProgress) console.log(`Processed ${processed.length} records. Output saved: ${outputFile}`);

    return processed.length;
}

module.exports = { NameFixer, processCSV };
