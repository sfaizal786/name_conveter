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
            
            // Scandinavian characters
            'Ã˜':'Ø', 'Ã¸':'ø',  // O with stroke
            'Ã†':'Æ', 'Ã¦':'æ',  // AE ligature  
            'Ã…':'Å', 'Ã¥':'å',  // A with ring
            
            // Special characters
            'â€“': '–', 'â€”': '—', 'â€˜': '‘', 'â€™': '’',
            'â€œ': '“', 'â€': '”', 'â€¦': '…'
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
                // More robust capitalization that works in all environments
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
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

        // Store original for capitalization decision
        const originalText = text;

        // Special replacements for Scandinavian characters (only if not preserving accents)
        if (!preserveAccents) {
            const map = {
                'Ø':'O','ø':'o','Æ':'AE','æ':'ae','Å':'A','å':'a',
                'Ä':'A','ä':'a','Ö':'O','ö':'o','Ñ':'N','ñ':'n',
                'Ü':'U','ü':'u','ß':'ss','Ç':'C','ç':'c'
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

        // Apply case handling
        if (!caseSensitive) {
            text = text.toLowerCase();
        }

        // CAPITALIZATION FIX: Always apply capitalization if requested, regardless of caseSensitive
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
            // Fallback to buffer reading with auto-detection
            const buffer = fs.readFileSync(inputFile);
            // Try to detect encoding
            if (buffer.slice(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF]))) {
                content = buffer.toString('utf8');
            } else {
                content = iconv.decode(buffer, 'latin1');
            }
        }

        // Remove BOM if present
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

        if (records.length === 0) {
            throw new Error('No records found in CSV file');
        }

        console.log(`Found ${records.length} records to process`);
        console.log('Processing options:', {
            preserveAccents,
            removeSpecialChars,
            caseSensitive,
            capitalizeFirst
        });

        const processed = records.map((r, index) => {
            // More flexible column name detection
            const firstRaw = r.first_name || r.firstName || r.FirstName || r.First_Name || r['First Name'] || r['first name'] || '';
            const lastRaw = r.last_name || r.lastName || r.LastName || r.Last_Name || r['Last Name'] || r['last name'] || '';

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

            if (logProgress && index < 3) {
                console.log(`Sample ${index + 1}: "${firstRaw} ${lastRaw}" -> "${first} ${last}"`);
            }

            // Return both original and processed names
            const result = {
                ...r,
                first_name: first,
                last_name: last
            };

            // Only include originals if they're different
            if (firstRaw !== first) {
                result.first_name_original = firstRaw;
            }
            if (lastRaw !== last) {
                result.last_name_original = lastRaw;
            }

            return result;
        });

        const csvOutput = stringify(processed, { 
            header: true, 
            quoted: true,
            quoted_empty: true
        });

        // Write with BOM for Excel compatibility
        fs.writeFileSync(outputFile, '\uFEFF' + csvOutput, 'utf8');
        
        if (logProgress) {
            console.log(`✅ Successfully processed ${processed.length} records`);
            console.log(`📁 Output saved to: ${outputFile}`);
            
            // Show final samples
            console.log('\nFinal samples:');
            processed.slice(0, 3).forEach((record, index) => {
                console.log(`${index + 1}. ${record.first_name} ${record.last_name}`);
            });
        }
        
        return processed.length;

    } catch (error) {
        console.error('❌ Error processing CSV:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Enhanced test function
function testMortenOrevik() {
    const testNames = [
        { first: "morten", last: "Ã˜revik" },
        { first: "MORTEN", last: "Ã˜REVIK" },
        { first: "anna-marie", last: "Ã…kesson" },
        { first: "john", last: "o'reilly" },
        { first: "pål", last: "johansen" },
        { first: "BJÖRN", last: "nilsson" },
        { first: "michael", last: "o'brien" }
    ];
    
    console.log("=== TESTING CAPITALIZATION (Render Environment Simulation) ===");
    
    const testCases = [
        { name: "Default (no accents, capitalize)", preserveAccents: false, capitalizeFirst: true },
        { name: "Preserve accents, capitalize", preserveAccents: true, capitalizeFirst: true },
        { name: "No capitalization", preserveAccents: false, capitalizeFirst: false }
    ];
    
    testCases.forEach(testCase => {
        console.log(`\n🔧 ${testCase.name}:`);
        console.log("=".repeat(50));
        
        testNames.forEach((name, index) => {
            const firstFixed = NameFixer.fixMojibake(name.first);
            const lastFixed = NameFixer.fixMojibake(name.last);
            
            const firstNormalized = NameFixer.normalizeToASCII(firstFixed, testCase);
            const lastNormalized = NameFixer.normalizeToASCII(lastFixed, testCase);
            
            console.log(`${index + 1}. ${firstNormalized} ${lastNormalized}`);
        });
    });
}

// Run test
testMortenOrevik();

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2 || args.includes('--help')) {
        console.log(`
📋 CSV Name Fixer - Process and normalize names in CSV files

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
  node fixer.js input.csv output.csv --preserve-accents --verbose
  node fixer.js input.csv output.csv --case-sensitive --no-capitalize

💡 First letter capitalization is ENABLED by default.
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
        console.log('🚀 Starting CSV processing...');
        console.log('⚙️  Options:', options);
        
        const count = processCSV(inputFile, outputFile, options);
        console.log(`\n✅ Successfully processed ${count} records`);
        console.log(`💾 Output file: ${outputFile}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Processing failed:', error.message);
        process.exit(1);
    }
}

module.exports = {
    processCSV,
    NameFixer
};
