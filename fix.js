// fixer.js
const fs = require('fs');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

class NameFixer {
    static fixMojibake(text) {
        if (!text) return '';
        text = text.toString().trim();

        // Extended mojibake patterns with better Scandinavian support
        const mojibakeMap = {
            // Common UTF-8 misinterpreted as Latin1
            'Ã¡':'á', 'Ã©':'é', 'Ã­':'í', 'Ã³':'ó', 'Ãº':'ú', 'Ã±':'ñ',
            'Ã¢':'â', 'Ã£':'ã', 'Ã¤':'ä', 'Ã¥':'å',
            'Ã¨':'è', 'Ãª':'ê', 'Ã«':'ë',
            'Ã¬':'ì', 'Ãî':'î', 'Ãï':'ï',
            'Ã°':'ð', 'Ãñ':'ñ', 'Ãò':'ò', 'Ãô':'ô', 'Ãõ':'õ', 'Ãö':'ö',
            'Ã¹':'ù', 'Ãú':'ú', 'Ãû':'û', 'Ãü':'ü',
            'Ãý':'ý', 'Ãþ':'þ', 'Ãÿ':'ÿ',
            
            // Scandinavian characters - FIXED MAPPINGS
            'Ã˜':'Ø', 'Ã¸':'ø',  // O with stroke
            'Ã†':'Æ', 'Ã¦':'æ',  // AE ligature  
            'Ã…':'Å', 'Ã¥':'å',  // A with ring
            
            // Special characters
            'â€“': '–', 'â€”': '—', 'â€˜': '‘', 'â€™': '’',
            'â€œ': '“', 'â€': '”', 'â€¦': '…'
        };

        // Try multiple decoding strategies if mojibake patterns detected
        if (/Ã|â|Â|ð|ÿ|þ|â€/.test(text)) {
            const patterns = [
                { encoding: 'utf8' },
                { encoding: 'latin1' },
                { encoding: 'windows-1252' }
            ];

            for (const pattern of patterns) {
                try {
                    const buffer = Buffer.from(text, 'binary');
                    const decoded = iconv.decode(buffer, pattern.encoding);
                    // Check if decoding improved the text
                    if (!/Ã|â|Â|ð|ÿ|þ|â€/.test(decoded) || decoded !== text) {
                        text = decoded;
                        break;
                    }
                } catch (e) {
                    // Continue to next pattern
                }
            }
        }

        // Apply character replacements
        for (const [wrong, correct] of Object.entries(mojibakeMap)) {
            text = text.replace(new RegExp(wrong, 'g'), correct);
        }

        return text;
    }

    static capitalizeFirstLetter(text) {
        if (!text) return '';
        text = text.toString().trim();
        
        // Handle multiple words (like first and middle names)
        return text.split(/\s+/)
            .map(word => {
                if (word.length === 0) return word;
                // Capitalize first letter, keep the rest as-is
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    }

    static normalizeToASCII(text, options = {}) {
        if (!text) return '';
        text = text.toString().trim();

        const {
            preserveAccents = false,
            removeSpecialChars = true,
            caseSensitive = false,
            capitalizeFirst = true  // NEW OPTION: capitalize first letter
        } = options;

        // Special replacements for Scandinavian characters
        const map = {
            'Ø':'O','ø':'o','Æ':'AE','æ':'ae','Å':'A','å':'a',
            'Ä':'A','ä':'a','Ö':'O','ö':'o','Ñ':'N','ñ':'n',
            'Ü':'U','ü':'u','ß':'ss','Ç':'C','ç':'c'
        };

        for (const [wrong, correct] of Object.entries(map)) {
            text = text.split(wrong).join(correct);
        }

        if (!preserveAccents) {
            // Remove accents using Unicode normalization
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        if (removeSpecialChars) {
            // Keep only alphanumeric and spaces (optionally keep hyphens and apostrophes)
            text = text.replace(/[^a-zA-Z0-9\s\-']/g, '');
            // Replace multiple spaces with single space
            text = text.replace(/\s+/g, ' ');
        }

        if (!caseSensitive) {
            text = text.toLowerCase();
        }

        // NEW: Capitalize first letter if requested
        if (capitalizeFirst && !caseSensitive) {
            text = this.capitalizeFirstLetter(text);
        }

        return text;
    }
}

function processCSV(inputFile, outputFile, options = {}) {
    const {
        preserveAccents = false,
        removeSpecialChars = true,
        caseSensitive = false,
        capitalizeFirst = true,  // NEW: default to true
        logProgress = false,
        encoding = 'utf8'
    } = options;

    try {
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Input file not found: ${inputFile}`);
        }

        let content;
        try {
            content = fs.readFileSync(inputFile, encoding);
        } catch (readError) {
            const buffer = fs.readFileSync(inputFile);
            content = iconv.decode(buffer, 'utf8');
        }

        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        const records = parse(content, { 
            columns: true, 
            skip_empty_lines: true, 
            trim: true,
            relax_quotes: true,
            relax_column_count: true
        });

        const processed = records.map((r) => {
            const firstRaw = r.first_name || r.firstName || r.FirstName || r.First_Name || '';
            const lastRaw = r.last_name || r.lastName || r.LastName || r.Last_Name || '';

            const firstFixed = NameFixer.fixMojibake(firstRaw);
            const lastFixed = NameFixer.fixMojibake(lastRaw);

            const first = NameFixer.normalizeToASCII(firstFixed, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst
            });
            const last = NameFixer.normalizeToASCII(lastFixed, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst
            });

            return {
                ...r,
                first_name: first,
                last_name: last,
                first_name_original: firstRaw,
                last_name_original: lastRaw
            };
        });

        const csvOutput = stringify(processed, { 
            header: true, 
            quoted: true,
            quoted_empty: true
        });

        fs.writeFileSync(outputFile, '\uFEFF' + csvOutput, 'utf8');
        
        if (logProgress) {
            console.log(`Processed ${processed.length} records`);
            console.log(`Output saved to: ${outputFile}`);
        }
        
        return processed.length;

    } catch (error) {
        console.error('Error processing CSV:', error.message);
        throw error;
    }
}





// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2 || args.includes('--help')) {
        console.log(`

        `);
        process.exit(args.includes('--help') ? 0 : 1);
    }

    const inputFile = args[0];
    const outputFile = args[1];
    
    const options = {
        preserveAccents: args.includes('--preserve-accents'),
        removeSpecialChars: !args.includes('--keep-special-chars'),
        caseSensitive: args.includes('--case-sensitive'),
        capitalizeFirst: !args.includes('--no-capitalize'), // NEW OPTION
        logProgress: args.includes('--verbose')
    };

    try {
        const count = processCSV(inputFile, outputFile, options);
        console.log(`Successfully processed ${count} records`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

module.exports = {
    processCSV,
    NameFixer
};
