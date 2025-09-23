// fixer.js
const fs = require('fs');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

class NameFixer {
    // Fix common mojibake from UTF-8 misinterpreted as Latin1
    static fixMojibake(text) {
        if (!text) return '';
        text = text.toString().trim();

        const mojibakeMap = {
            'Ã¡':'á','Ã©':'é','Ã­':'í','Ã³':'ó','Ãº':'ú','Ã±':'ñ',
            'Ã£':'ã','Ãµ':'õ','Ã§':'ç',
            'Ã˜':'Ø','Ã¸':'ø','Ã†':'Æ','Ã¦':'æ',
            'Ã…':'Å','Ã¥':'å','Ã„':'Ä','Ã¤':'ä',
            'Ã–':'Ö','Ã¶':'ö'
        };

        // Decode using Latin1 → UTF-8
        try {
            const buffer = Buffer.from(text, 'latin1');
            text = iconv.decode(buffer, 'utf8');
        } catch {}

        // Apply replacements
        for (const [wrong, correct] of Object.entries(mojibakeMap)) {
            text = text.split(wrong).join(correct);
        }

        return text;
    }

    // Capitalize first letter of each word
    static capitalizeFirstLetter(text) {
        return text.split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Normalize to ASCII (remove accents, convert special chars)
    static normalizeToASCII(text) {
        if (!text) return '';
        text = text.toString().trim();

        const map = {
            'Ø':'O','ø':'o','Æ':'AE','æ':'ae','Å':'A','å':'a',
            'Ä':'A','ä':'a','Ö':'O','ö':'o','Ñ':'N','ñ':'n',
            'Ü':'U','ü':'u','ß':'ss','Ç':'C','ç':'c'
        };

        for (const [wrong, correct] of Object.entries(map)) {
            text = text.split(wrong).join(correct);
        }

        // Remove accents
        text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Remove special chars except letters, numbers, spaces, hyphen, apostrophe
        text = text.replace(/[^a-zA-Z0-9\s\-']/g, '');
        // Convert to lowercase
        text = text.toLowerCase();
        // Capitalize first letter of each word
        text = NameFixer.capitalizeFirstLetter(text);

        return text;
    }
}

// Process CSV
function processCSV(inputFile, outputFile) {
    let content = fs.readFileSync(inputFile, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1); // Remove BOM

    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    const processed = records.map(r => {
        const firstRaw = r.first_name || '';
        const lastRaw = r.last_name || '';

        const first = NameFixer.normalizeToASCII(NameFixer.fixMojibake(firstRaw));
        const last = NameFixer.normalizeToASCII(NameFixer.fixMojibake(lastRaw));

        return { first_name: first, last_name: last };
    });

    const csvOutput = stringify(processed, { header: true, quoted: true });
    fs.writeFileSync(outputFile, '\uFEFF' + csvOutput, 'utf8');
}

module.exports = { processCSV };
