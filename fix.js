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
            'Ã¡': 'á', 'Ã©': 'e', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
            'Ã¢': 'â', 'Ã£': 'ã', 'Ã¤': 'ä', 'Ã¥': 'å',
            'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë', 'Ã˜': 'Ø',
            'Ã¬': 'ì', 'Ãî': 'î', 'Ãï': 'ï', 'Ã˜': 'Ø', 'Ã¸': 'ø',
            'Ã†': 'Æ', 'Ã¦': 'æ', 'Ãý': 'ý',
            'Ã°': 'ð', 'Ãñ': 'ñ', 'Ãò': 'ò', 'Ãô': 'ô', 'Ãõ': 'õ', 'Ãö': 'ö',
            'Ã¹': 'ù', 'Ãú': 'ú', 'Ãû': 'û', 'Ãü': 'ü', 'Å': 'A',
            'Ãþ': 'þ', 'Ãÿ': 'ÿ', 'â€“': '–', 'â€”': '—', 'â€˜': '‘', 'â€™': '’',
            'â€œ': '“', 'â€': '”', 'â€¦': '…', 'Ãœ': 'U', 'Ã©': 'e', 'Ä‡': 'c', 'Ã‰': 'e'

            // Scandinavian characters - FIXED MAPPINGS

            // Special characters

        };

        // Apply character replacements first
        for (const [wrong, correct] of Object.entries(mojibakeMap)) {
            text = text.replace(new RegExp(wrong, 'g'), correct);
        }

        // Try multiple decoding strategies if mojibake patterns still detected
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
            capitalizeFirst = true
        } = options;

        // Special replacements for Scandinavian characters (only if not preserving accents)
        if (!preserveAccents) {
            const map = {
                'Ø': 'O', 'ø': 'o', 'Æ': 'AE', 'æ': 'ae', 'Å': 'A', 'å': 'a',
                'Ä': 'A', 'ä': 'a', 'Ö': 'O', 'ö': 'o', 'Ñ': 'N', 'ñ': 'n',
                'Ü': 'U', 'ü': 'u', 'ß': 'ss', 'Ç': 'C', 'ç': 'c'
            };

            for (const [wrong, correct] of Object.entries(map)) {
                text = text.split(wrong).join(correct);
            }

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

        // Capitalize first letter if requested
        if (capitalizeFirst) {
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
        capitalizeFirst = true,
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

        const processed = records.map((r, index) => {
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

            if (logProgress && index < 5) {
                console.log(`Sample ${index + 1}: "${firstRaw} ${lastRaw}" -> "${first} ${last}"`);
            }

            return {
                ...r,
                first_name: first,
                last_name: last,
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

// Test with your specific data
function testMortenOrevik() {
    const testNames = [
        { first: "morten", last: "Ã˜revik" },
        { first: "Morten", last: "Ã˜revik" },
        { first: "anna-marie", last: "Ã…kesson" },
        { first: "john", last: "o'reilly" },
        { first: "pål", last: "johansen" },
        { first: "BJÖRN", last: "nilsson" }
    ];

    console.log("Testing name capitalization (WITHOUT preserving accents):");
    console.log("=========================================================");

    testNames.forEach((name, index) => {
        const firstFixed = NameFixer.fixMojibake(name.first);
        const lastFixed = NameFixer.fixMojibake(name.last);

        const firstNormalized = NameFixer.normalizeToASCII(firstFixed, {
            capitalizeFirst: true,
            preserveAccents: false
        });
        const lastNormalized = NameFixer.normalizeToASCII(lastFixed, {
            capitalizeFirst: true,
            preserveAccents: false
        });

        console.log(`${index + 1}. Input: "${name.first} ${name.last}"`);
        console.log(`   Fixed: "${firstFixed} ${lastFixed}"`);
        console.log(`   Output: "${firstNormalized} ${lastNormalized}"`);
        console.log("---");
    });

    console.log("\nTesting name capitalization (WITH preserving accents):");
    console.log("=====================================================");

    testNames.forEach((name, index) => {
        const firstFixed = NameFixer.fixMojibake(name.first);
        const lastFixed = NameFixer.fixMojibake(name.last);

        const firstNormalized = NameFixer.normalizeToASCII(firstFixed, {
            capitalizeFirst: true,
            preserveAccents: true
        });
        const lastNormalized = NameFixer.normalizeToASCII(lastFixed, {
            capitalizeFirst: true,
            preserveAccents: true
        });

        console.log(`${index + 1}. Input: "${name.first} ${name.last}"`);
        console.log(`   Fixed: "${firstFixed} ${lastFixed}"`);
        console.log(`   Output: "${firstNormalized} ${lastNormalized}"`);
        console.log("---");
    });
}

// Run test
testMortenOrevik();

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length < 2 || args.includes('--help')) {
        console.log(`
CSV Name Fixer - Process and normalize names in CSV files

Usage: node fixer.js <input.csv> <output.csv> [options]

Options:
  --preserve-accents     Keep accented characters (default: false)
  --keep-special-chars   Keep special characters (default: false)
  --case-sensitive       Preserve original case (default: false)
  --no-capitalize        Disable first letter capitalization (default: capitalized)
  --verbose              Show progress messages
  --help                 Show this help message

Examples:
  node fixer.js input.csv output.csv
  node fixer.js input.csv output.csv --preserve-accents --no-capitalize
  node fixer.js input.csv output.csv --case-sensitive --verbose

Note: First letter capitalization is ENABLED by default. Use --no-capitalize to disable.
        `);
        process.exit(args.includes('--help') ? 0 : 1);
    }

    const inputFile = args[0];
    const outputFile = args[1];

    const options = {
        preserveAccents: args.includes('--preserve-accents'),
        removeSpecialChars: !args.includes('--keep-special-chars'),
        caseSensitive: args.includes('--case-sensitive'),
        capitalizeFirst: !args.includes('--no-capitalize'),
        logProgress: args.includes('--verbose')
    };

    try {
        console.log('Processing CSV file...');
        console.log('Options:', {
            preserveAccents: options.preserveAccents,
            removeSpecialChars: options.removeSpecialChars,
            caseSensitive: options.caseSensitive,
            capitalizeFirst: options.capitalizeFirst
        });

        const count = processCSV(inputFile, outputFile, options);
        console.log(`✅ Successfully processed ${count} records`);
        console.log(`📁 Output file: ${outputFile}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

module.exports = {
    processCSV,
    NameFixer
};
