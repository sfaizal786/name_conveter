// fixer.js
const fs = require('fs');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

class NameFixer {
    static fixMojibake(text) {
        if (!text) return '';
        text = text.toString().trim();

        // Extended mojibake patterns with proper European character support
        const mojibakeMap = {
            // Common UTF-8 misinterpreted as Latin1/Western European
            // Scandinavian/Nordic characters
            'Ã˜': 'Ø', 'Ã¸': 'ø',  // Ø/ø
            'Ã…': 'Å', 'Ã¥': 'å',  // Å/å
            'Ã†': 'Æ', 'Ã¦': 'æ',  // Æ/æ
            'Ã–': 'Ö', 'Ã¶': 'ö',  // Ö/ö
            'Ã„': 'Ä', 'Ã¤': 'ä',  // Ä/ä
            
            // French and other European accents
            'Ã‰': 'É', 'Ã©': 'é',  // É/é - FIXED
            'Ã€': 'À', 'Ã€': 'à',  // À/à
            'Ã‡': 'Ç', 'Ã§': 'ç',  // Ç/ç
            'ÃŽ': 'Î', 'Ã®': 'î',  // Î/î
            'Ã”': 'Ô', 'Ã´': 'ô',  // Ô/ô
            'Ã›': 'Û', 'Ã»': 'û',  // Û/û
            'Ã‹': 'Ë', 'Ã«': 'ë',  // Ë/ë
            'Ã�': 'Ï', 'Ã¯': 'ï',  // Ï/ï
            'Ãˆ': 'È', 'Ã¨': 'è',  // È/è
            'Ã‰': 'É', 'Ã©': 'é',  // É/é (duplicate for clarity)
            'ÃŠ': 'Ê', 'Ãª': 'ê',  // Ê/ê
            
            // Other common mojibake
            'Ã¡': 'á', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
            'Ã¢': 'â', 'Ã£': 'ã',
            'Ã°': 'ð', 'Ãý': 'ý',
            'Ãñ': 'ñ', 'Ãò': 'ò', 'Ãô': 'ô', 'Ãõ': 'õ',
            'Ã¹': 'ù', 'Ãû': 'û', 'Ãü': 'ü',
            'Ãþ': 'þ', 'Ãÿ': 'ÿ',
            
            // Special quotation marks and dashes
            'â€"': '—', 'â€"': '–', 'â€˜': '「', 'â€™': '」',
            'â€œ': '「', 'â€': '」', 'â€¦': '…',
            
            // Direct fixes for common mis-encodings
            'A‰': 'É',  // Direct fix for A‰ -> É (your specific case)
            'E‰': 'É',  // Alternative encoding
            '‰': 'É',   // Just the percent sign case
        };

        // Special handling for the specific pattern you mentioned
        // Check for "A‰" pattern first
        if (text.includes('A‰') || text.includes('E‰')) {
            text = text.replace(/A‰/g, 'É').replace(/E‰/g, 'É');
        }

        // Apply character replacements first
        for (const [wrong, correct] of Object.entries(mojibakeMap)) {
            text = text.replace(new RegExp(wrong, 'g'), correct);
        }

        // Try multiple decoding strategies if mojibake patterns still detected
        if (/Ã|â|Â|ð|ÿ|þ|â€|A‰|E‰/.test(text)) {
            const patterns = [
                { encoding: 'utf8' },
                { encoding: 'latin1' },
                { encoding: 'windows-1252' },
                { encoding: 'iso-8859-1' },
                { encoding: 'iso-8859-15' }, // Added for European support
                { encoding: 'cp1252' } // Added for Windows Western European
            ];

            for (const pattern of patterns) {
                try {
                    const buffer = Buffer.from(text, 'binary');
                    const decoded = iconv.decode(buffer, pattern.encoding);
                    // Check if decoding improved the text
                    if (!/Ã|â|Â|ð|ÿ|þ|â€|A‰|E‰/.test(decoded) || decoded !== text) {
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

    static removeTitlesAndProfessions(text) {
        if (!text) return '';
        
        // Comprehensive list of titles and professions to remove (case insensitive)
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
            "ca", "cpa", "cfa", "cma", "acca", "cs", "cp",
            
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
            "sir", "madam", "dame", "lord", "lady", "IDM", "CPA", "OBE", 
            
            // Corporate titles
            "ceo", "cto", "cfo", "coo", "cio",
            "vp", "svp", "evp", "avp",
            "director", "manager", "lead", "head", "PMP", "PG", "Dip", "MA",
            
            // Nobility / Special
            "his excellency", "her excellency",
            "hon", "honorable",
            
            // Suffixes
            "jr", "sr", "ii", "iii", "iv", 
           
        ];
        
        let cleaned = text;
        
        // First, handle the text as a whole string
        for (const title of titles) {
            // Create regex pattern for the title
            // Match with optional dot, optional space, and word boundaries
            const titleRegex = new RegExp(
                `\\b${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?\\b`,
                'gi'
            );
            
            // Remove the title
            cleaned = cleaned.replace(titleRegex, '');
        }
        
        // Clean up extra spaces and trim
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned;
    }

    static cleanPunctuation(text) {
        if (!text) return '';
        
        // Remove punctuation at word boundaries (start and end of words)
        // This handles cases like ".John", "Smith,", "O'Connor", etc.
        
        // First, normalize multiple spaces
        text = text.replace(/\s+/g, ' ');
        
        // Split into words
        const words = text.split(' ');
        
        const cleanedWords = words.map(word => {
            if (!word) return '';
            
            // Remove leading punctuation (.,;:!?~`'"()[]{})
            let cleaned = word.replace(/^[.,;:!?~`'"()\[\]{}]+/, '');
            
            // Remove trailing punctuation
            cleaned = cleaned.replace(/[.,;:!?~`'"()\[\]{}]+$/, '');
            
            // Handle hyphenated names (keep hyphen in the middle)
            // Remove hyphen if it's at start or end
            cleaned = cleaned.replace(/^-+|-+$/g, '');
            
            return cleaned;
        }).filter(word => word.length > 0); // Remove empty words
        
        return cleanedWords.join(' ');
    }

    static capitalizeFirstLetter(text) {
        if (!text) return '';
        text = text.toString().trim();

        // Handle multiple words (like first and middle names)
        return text.split(/\s+/)
            .map(word => {
                if (word.length === 0) return word;
                
                // Special handling for names with apostrophes or hyphens
                if (word.includes("'")) {
                    // Like O'Connor -> O'Connor (not O'connor)
                    return word.split("'")
                        .map((part, i) => i === 0 ? 
                            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() :
                            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                        .join("'");
                }
                
                if (word.includes("-")) {
                    // Like Jean-Claude -> Jean-Claude
                    return word.split("-")
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                        .join("-");
                }
                
                // Regular word
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
            capitalizeFirst = true,
            removeTitles = true,
            cleanPunctuation: cleanPunct = true
        } = options;

        // Step 1: Fix mojibake first - VERY IMPORTANT
        text = this.fixMojibake(text);
        
        console.log(`After fixMojibake: "${text}"`); // Debug log
        
        // Step 2: Remove titles and professions if requested
        if (removeTitles) {
            text = this.removeTitlesAndProfessions(text);
        }
        
        // Step 3: Clean punctuation if requested
        if (cleanPunct) {
            text = this.cleanPunctuation(text);
        }

        // Step 4: Handle accents and special characters
        if (!preserveAccents) {
            const map = {
                // Scandinavian
                'Ø': 'O', 'ø': 'o', 'Æ': 'AE', 'æ': 'ae', 'Å': 'A', 'å': 'a',
                'Ä': 'A', 'ä': 'a', 'Ö': 'O', 'ö': 'o',
                // French and other European
                'É': 'E', 'é': 'e', 'È': 'E', 'è': 'e',
                'À': 'A', 'à': 'a', 'Â': 'A', 'â': 'a',
                'Ç': 'C', 'ç': 'c', 'Ê': 'E', 'ê': 'e',
                'Î': 'I', 'î': 'i', 'Ô': 'O', 'ô': 'o',
                'Û': 'U', 'û': 'u', 'Ë': 'E', 'ë': 'e',
                'Ï': 'I', 'ï': 'i', 'Ü': 'U', 'ü': 'u',
                // Other European
                'Ñ': 'N', 'ñ': 'n', 'ß': 'ss', 
                'Ð': 'D', 'ð': 'd',
                'Þ': 'Th', 'þ': 'th', 'Ý': 'Y', 'ý': 'y',
                'Á': 'A', 'á': 'a',
                'Í': 'I', 'í': 'i', 'Ó': 'O', 'ó': 'o',
                'Ú': 'U', 'ú': 'u'
            };

            for (const [wrong, correct] of Object.entries(map)) {
                text = text.split(wrong).join(correct);
            }

            // Remove remaining accents using Unicode normalization
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        if (removeSpecialChars) {
            // Keep only alphanumeric, spaces, hyphens, and apostrophes
            text = text.replace(/[^a-zA-Z0-9\s\-']/g, '');
            // Replace multiple spaces with single space
            text = text.replace(/\s+/g, ' ');
        }

        if (!caseSensitive && !capitalizeFirst) {
            // Only lowercase if not capitalizing (capitalizeFirst handles case)
            text = text.toLowerCase();
        }

        // Capitalize first letter if requested
        if (capitalizeFirst) {
            text = this.capitalizeFirstLetter(text);
        }

        return text.trim();
    }
}

function processCSV(inputFile, outputFile, options = {}) {
    const {
        preserveAccents = false,
        removeSpecialChars = true,
        caseSensitive = false,
        capitalizeFirst = true,
        removeTitles = true,
        cleanPunctuation = true,
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
            const firstRaw = r.first_name || r.firstName || r.FirstName || r.First_Name || r.first || '';
            const lastRaw = r.last_name || r.lastName || r.LastName || r.Last_Name || r.last || '';

            // Apply normalization with all options
            const first = NameFixer.normalizeToASCII(firstRaw, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst,
                removeTitles,
                cleanPunctuation
            });
            
            const last = NameFixer.normalizeToASCII(lastRaw, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst,
                removeTitles,
                cleanPunctuation
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

// Test specific French character issue
function testFrenchCharacters() {
    console.log("Testing French character fixes:");
    console.log("===============================\n");

    const testCases = [
        "A‰douard Mandon",  // Your specific case
        "Ã‰douard Mandon",  // Standard mojibake
        "Édouard Mandon",   // Correct
        "AndrÃ© Gide",      // Another French name
        "FranÃ§ois Hollande",
        "RenÃ© Descartes",
        "JosÃ© Mourinho",
        "NiÃ±o de la Torre",
        "BjÃ¶rn Borg",
        "HÃ¥kan Nilsson"
    ];

    testCases.forEach((name, index) => {
        console.log(`${index + 1}. Input: "${name}"`);
        
        // Show intermediate fixMojibake result
        const fixed = NameFixer.fixMojibake(name);
        console.log(`   After fixMojibake: "${fixed}"`);
        
        // Show final result without preserving accents
        const withoutAccents = NameFixer.normalizeToASCII(name, {
            capitalizeFirst: true,
            preserveAccents: false,
            removeTitles: false,
            cleanPunctuation: false
        });
        console.log(`   Without accents: "${withoutAccents}"`);
        
        // Show final result with preserving accents
        const withAccents = NameFixer.normalizeToASCII(name, {
            capitalizeFirst: true,
            preserveAccents: true,
            removeTitles: false,
            cleanPunctuation: false
        });
        console.log(`   With accents: "${withAccents}"`);
        
        console.log("---");
    });

    // Test your specific case in detail
    console.log("\nDetailed test for your specific case:");
    console.log("=====================================\n");
    
    const specificCase = "A‰douard Mandon";
    console.log(`Original: "${specificCase}"`);
    console.log(`Char codes:`);
    
    for (let i = 0; i < specificCase.length; i++) {
        console.log(`  [${i}] '${specificCase[i]}' = ${specificCase.charCodeAt(i).toString(16)}`);
    }
    
    const fixed = NameFixer.fixMojibake(specificCase);
    console.log(`\nAfter fixMojibake: "${fixed}"`);
    
    const final = NameFixer.normalizeToASCII(specificCase, {
        capitalizeFirst: true,
        preserveAccents: false,
        removeTitles: false,
        cleanPunctuation: false
    });
    
    console.log(`Final result: "${final}"`);
    console.log(`Expected: "Edouard Mandon"`);
}

// Run test
testFrenchCharacters();

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
  --keep-titles          Keep titles and professions (default: removed)
  --keep-punctuation     Keep punctuation (default: removed)
  --verbose              Show progress messages
  --help                 Show this help message

Examples:
  node fixer.js input.csv output.csv
  node fixer.js input.csv output.csv --preserve-accents --no-capitalize
  node fixer.js input.csv output.csv --keep-titles --keep-punctuation --verbose

Note: Now properly handles French characters like É, é, etc.
      "A‰douard" will become "Edouard" (or "Édouard" with --preserve-accents)
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
        removeTitles: !args.includes('--keep-titles'),
        cleanPunctuation: !args.includes('--keep-punctuation'),
        logProgress: args.includes('--verbose')
    };

    try {
        console.log('Processing CSV file...');
        console.log('Options:', {
            preserveAccents: options.preserveAccents,
            removeSpecialChars: options.removeSpecialChars,
            caseSensitive: options.caseSensitive,
            capitalizeFirst: options.capitalizeFirst,
            removeTitles: options.removeTitles,
            cleanPunctuation: options.cleanPunctuation
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







