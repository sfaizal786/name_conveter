// fixer.js
const fs = require('fs');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

class NameFixer {
    // Function to clean first_name (take only the first part)
    static cleanFirstName(firstName) {
        if (!firstName) return firstName;
        
        // Convert to string and trim
        const name = String(firstName).trim();
        
        // Split by space or hyphen and take only the first part
        const parts = name.split(/[\s\-]+/);
        
        // Return the first part, capitalized properly
        if (parts.length > 0) {
            const firstPart = parts[0];
            return this.capitalizeFirstLetter(firstPart);
        }
        return name;
    }

    // Function to clean last_name (take only the last part)
    static cleanLastName(lastName) {
        if (!lastName) return lastName;
        
        // Convert to string and trim
        const name = String(lastName).trim();
        
        // Split by space OR hyphen and take the last part
        const parts = name.split(/[\s\-]+/);
        
        // Return the last part, capitalized properly
        if (parts.length > 0) {
            const lastPart = parts[parts.length - 1];
            return this.capitalizeFirstLetter(lastPart);
        }
        return name;
    }

    static fixMojibake(text) {
        if (!text) return '';
        text = text.toString().trim();

        console.log(`fixMojibake input: "${text}"`);
        
        // First, try direct character replacements
        const mojibakeMap = {
            // French and Western European - FIXED
            'Ã©': 'é',  // é
            'Ã¨': 'è',  // è
            'Ãª': 'ê',  // ê
            'Ã«': 'ë',  // ë
            'Ã ': 'à',  // à
            'Ã¡': 'á',  // á
            'Ã¢': 'â',  // â
            'Ã£': 'ã',  // ã
            'Ã¤': 'ä',  // ä
            'Ã¥': 'å',  // å
            'Ã§': 'ç',  // ç
            
            // Uppercase
            'Ã‰': 'É',  // É
            'Ãˆ': 'È',  // È
            'ÃŠ': 'Ê',  // Ê
            'Ã‹': 'Ë',  // Ë
            'Ã€': 'À',  // À
            'Ã': 'Á',  // Á
            'Ã‚': 'Â',  // Â
            'Ãƒ': 'Ã',  // Ã
            'Ã„': 'Ä',  // Ä
            'Ã…': 'Å',  // Å
            'Ã‡': 'Ç',  // Ç
            
            // German and Nordic
            'Ã¶': 'ö',  // ö
            'Ã–': 'Ö',  // Ö
            'Ã¼': 'ü',  // ü
            'Ãœ': 'Ü',  // Ü
            'ÃŸ': 'ß',  // ß
            'Ã¸': 'ø',  // ø
            'Ã˜': 'Ø',  // Ø
            'Ã¦': 'æ',  // æ
            'Ã†': 'Æ',  // Æ
            
            // Spanish and Portuguese
            'Ã±': 'ñ',  // ñ
            'Ã‘': 'Ñ',  // Ñ
            'Ã­': 'í',  // í
            'Ã³': 'ó',  // ó
            'Ãº': 'ú',  // ú
            
            // Polish characters
            'Å‚': 'ł',  // ł
            'Å„': 'ń',  // ń
            'Å›': 'ś',  // ś
            'Åº': 'ź',  // ź
            'Å¼': 'ż',  // ż
            'Ä…': 'ą',  // ą
            'Ä‡': 'ć',  // ć
            'Ä™': 'ę',  // ę
            'Å³': 'ó',  // ó
            'Å': 'Ł',  // Ł
            'Åš': 'Ś',  // Ś
            'Å»': 'Ż',  // Ż
        };

        let result = text;
        
        // Apply all replacements
        for (const [wrong, correct] of Object.entries(mojibakeMap)) {
            // Escape special regex characters
            const escapedWrong = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedWrong, 'g');
            const before = result;
            result = result.replace(regex, correct);
            if (before !== result) {
                console.log(`  Replaced "${wrong}" with "${correct}": "${before}" -> "${result}"`);
            }
        }

        // Special case for FrÃ©dÃ©ric
        if (result.includes('FrÃ©') || result.includes('FrÃ©dÃ©ric')) {
            console.log(`  Special handling for FrÃ©dÃ©ric pattern`);
            result = result.replace(/FrÃ©/g, 'Fré').replace(/dÃ©/g, 'dé');
        }

        // Special case for GuÃ©rin
        if (result.includes('GuÃ©')) {
            console.log(`  Special handling for GuÃ© pattern`);
            result = result.replace(/GuÃ©/g, 'Gué');
        }

        console.log(`fixMojibake result: "${result}"`);
        return result;
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
            "rev", "reverend", "father", "pastor",  // Removed "fr" which was causing issues
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

        console.log(`normalizeToASCII input: "${text}"`);
        
        // Step 1: Fix mojibake first - VERY IMPORTANT
        text = this.fixMojibake(text);
        console.log(`  After fixMojibake: "${text}"`);
        
        // Step 2: Remove titles and professions if requested
        if (removeTitles) {
            text = this.removeTitlesAndProfessions(text);
            console.log(`  After removeTitles: "${text}"`);
        }
        
        // Step 3: Clean punctuation if requested
        if (cleanPunct) {
            text = this.cleanPunctuation(text);
            console.log(`  After cleanPunctuation: "${text}"`);
        }

        // Step 4: Handle accents and special characters
        if (!preserveAccents) {
            console.log(`  Removing accents`);
            
            // Comprehensive accent map
            const accentMap = {
                // French and Western European
                'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
                'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
                'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
                'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ø': 'o',
                'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
                'ý': 'y', 'ÿ': 'y',
                'ç': 'c', 'ñ': 'n', 'ß': 'ss',
                
                // Polish characters
                'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
                'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
                
                // Uppercase equivalents
                'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A', 'Å': 'A',
                'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
                'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
                'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'Õ': 'O', 'Ø': 'O',
                'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
                'Ý': 'Y',
                'Ç': 'C', 'Ñ': 'N',
                'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
                'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
                
                // Special characters
                'Æ': 'AE', 'æ': 'ae',
                'Œ': 'OE', 'œ': 'oe',
                'Ð': 'D', 'ð': 'd',
                'Þ': 'TH', 'þ': 'th',
            };

            // Apply the accent map
            for (const [accented, plain] of Object.entries(accentMap)) {
                const regex = new RegExp(accented, 'g');
                const before = text;
                text = text.replace(regex, plain);
                if (before !== text) {
                    console.log(`    Replaced ${accented} with ${plain}: "${before}" -> "${text}"`);
                }
            }

            // Use Unicode normalization to remove any remaining combining diacritical marks
            const beforeNormalization = text;
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (beforeNormalization !== text) {
                console.log(`  After Unicode normalization: "${text}"`);
            }
        }

        if (removeSpecialChars) {
            console.log(`  Removing special characters`);
            // Keep only alphanumeric, spaces, hyphens, and apostrophes
            text = text.replace(/[^a-zA-Z0-9\s\-']/g, '');
            // Replace multiple spaces with single space
            text = text.replace(/\s+/g, ' ');
            console.log(`  After removeSpecialChars: "${text}"`);
        }

        if (!caseSensitive && !capitalizeFirst) {
            console.log(`  Lowercasing`);
            text = text.toLowerCase();
            console.log(`  After lowercase: "${text}"`);
        }

        // Capitalize first letter if requested
        if (capitalizeFirst) {
            console.log(`  Capitalizing first letter`);
            text = this.capitalizeFirstLetter(text);
            console.log(`  After capitalize: "${text}"`);
        }

        console.log(`  Final: "${text.trim()}"`);
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
        encoding = 'utf8',
        // Options for name cleaning
        cleanFirstName = true,     // Take only first part of first name
        cleanLastName = true       // Take only last part of last name
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
            content = content.slice(1); // Remove BOM
        }

        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true,
            relax_column_count: true
        });

        const processed = records.map((r, index) => {
            // Get original values
            const firstRaw = r.first_name || r.firstName || r.FirstName || r.First_Name || r.first || '';
            const lastRaw = r.last_name || r.lastName || r.LastName || r.Last_Name || r.last || '';
            const companyRaw = r.company_domain || r.company || r.domain || '';

            // Apply normalization
            let first = NameFixer.normalizeToASCII(firstRaw, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst,
                removeTitles,
                cleanPunctuation
            });
            
            let last = NameFixer.normalizeToASCII(lastRaw, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst,
                removeTitles,
                cleanPunctuation
            });

            // Apply first name cleaning (take only first part)
            if (cleanFirstName) {
                first = NameFixer.cleanFirstName(first);
            }

            // Apply last name cleaning (take only last part)
            if (cleanLastName) {
                last = NameFixer.cleanLastName(last);
            }

            // Clean company domain if present
            const company = companyRaw ? String(companyRaw).trim().toLowerCase() : '';

            if (logProgress && index < 5) {
                console.log(`Sample ${index + 1}: "${firstRaw} ${lastRaw}" -> "${first} ${last}"`);
            }

            return {
                ...r,
                first_name: first,
                last_name: last,
                company_domain: company
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

// Test specific cases
function testFrenchNames() {
    console.log("=== Testing French Name Fix ===");
    
    const testCases = [
        { 
            input: "FrÃ©dÃ©ric", 
            description: "French name with é",
            expectedWithAccents: "Frédéric",
            expectedWithoutAccents: "Frederic"
        },
        { 
            input: "GuÃ©rin", 
            description: "French name with é",
            expectedWithAccents: "Guérin",
            expectedWithoutAccents: "Guerin"
        },
        { 
            input: "AndrÃ©", 
            description: "French name with é",
            expectedWithAccents: "André",
            expectedWithoutAccents: "Andre"
        },
        { 
            input: "RenÃ©", 
            description: "French name with é",
            expectedWithAccents: "René",
            expectedWithoutAccents: "Rene"
        },
        { 
            input: "JosÃ©", 
            description: "Spanish name with é",
            expectedWithAccents: "José",
            expectedWithoutAccents: "Jose"
        },
        { 
            input: "FranÃ§ois", 
            description: "French name with ç",
            expectedWithAccents: "François",
            expectedWithoutAccents: "Francois"
        },
    ];
    
    testCases.forEach((test, index) => {
        console.log(`\nTest ${index + 1}: ${test.description}`);
        console.log(`  Input: "${test.input}"`);
        
        // Test fixMojibake first
        const fixed = NameFixer.fixMojibake(test.input);
        console.log(`  After fixMojibake: "${fixed}"`);
        
        // Test with accents preserved
        const withAccents = NameFixer.normalizeToASCII(test.input, {
            preserveAccents: true,
            removeTitles: false,
            cleanPunctuation: false,
            capitalizeFirst: false
        });
        console.log(`  With accents: "${withAccents}"`);
        console.log(`  Expected with accents: "${test.expectedWithAccents}"`);
        console.log(`  Match: ${withAccents === test.expectedWithAccents ? '✓' : '✗'}`);
        
        // Test without accents
        const withoutAccents = NameFixer.normalizeToASCII(test.input, {
            preserveAccents: false,
            removeTitles: false,
            cleanPunctuation: false,
            capitalizeFirst: false
        });
        console.log(`  Without accents: "${withoutAccents}"`);
        console.log(`  Expected without accents: "${test.expectedWithoutAccents}"`);
        console.log(`  Match: ${withoutAccents === test.expectedWithoutAccents ? '✓' : '✗'}`);
    });
}

// Test all cases
function testAllCases() {
    console.log("\n\n=== Testing All Cases ===");
    
    const testCases = [
        { first: "FrÃ©dÃ©ric", last: "GuÃ©rin", expectedFirst: "Frederic", expectedLast: "Guerin" },
        { first: "PaweÅ‚", last: "Kowalski", expectedFirst: "Pawel", expectedLast: "Kowalski" },
        { first: "JarosÅ‚aw", last: "Nowak", expectedFirst: "Jaroslaw", expectedLast: "Nowak" },
        { first: "FAIZAL SHAIKH", last: "PMP SHAH-shah-shash", expectedFirst: "Faizal", expectedLast: "Shash" },
        { first: "prof 'shaif", last: "khan", expectedFirst: "Shaif", expectedLast: "Khan" },
        { first: "cp faizal", last: "PMP SHAH", expectedFirst: "Faizal", expectedLast: "Shah" },
        { first: "OBE FAIZAL", last: "PMP SHAH-shah-shash", expectedFirst: "Faizal", expectedLast: "Shash" },
    ];
    
    testCases.forEach((test, index) => {
        console.log(`\nTest ${index + 1}: "${test.first} ${test.last}"`);
        
        const first = NameFixer.cleanFirstName(NameFixer.normalizeToASCII(test.first, { preserveAccents: false }));
        const last = NameFixer.cleanLastName(NameFixer.normalizeToASCII(test.last, { preserveAccents: false }));
        
        console.log(`  Output: "${first} ${last}"`);
        console.log(`  Expected: "${test.expectedFirst} ${test.expectedLast}"`);
        console.log(`  Match: ${first === test.expectedFirst && last === test.expectedLast ? '✓' : '✗'}`);
    });
}

// Run tests
testFrenchNames();
testAllCases();

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
  --no-clean-firstname   Don't clean first name (keep full name) (default: cleaned)
  --no-clean-lastname    Don't clean last name (keep full name) (default: cleaned)
  --verbose              Show progress messages
  --help                 Show this help message

Important Fixes:
  - French names: "FrÃ©dÃ©ric" -> "Frederic" (or "Frédéric" with --preserve-accents)
  - French names: "GuÃ©rin" -> "Guerin" (or "Guérin" with --preserve-accents)
  - Polish names: "PaweÅ‚" -> "Pawel" (or "Paweł" with --preserve-accents)
  - First name: Takes only first part (FAIZAL SHAIKH -> Faizal)
  - Last name: Takes only last part (PMP SHAH-shah-shash -> Shash)

Examples:
  node fixer.js input.csv output.csv
  node fixer.js input.csv output.csv --preserve-accents
  node fixer.js input.csv output.csv --verbose
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
        // Name cleaning options
        cleanFirstName: !args.includes('--no-clean-firstname'),
        cleanLastName: !args.includes('--no-clean-lastname'),
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
            cleanPunctuation: options.cleanPunctuation,
            cleanFirstName: options.cleanFirstName,
            cleanLastName: options.cleanLastName
        });

        const count = processCSV(inputFile, outputFile, options);
        console.log(`✅ Successfully processed ${count} records`);
        console.log(`📁 Output file: ${outputFile}`);
        
        // Show sample of what was done
        console.log('\nExamples of fixes:');
        console.log('==================');
        console.log('French Names:');
        console.log('  "FrÃ©dÃ©ric" -> "Frederic" (with --preserve-accents: "Frédéric")');
        console.log('  "GuÃ©rin" -> "Guerin" (with --preserve-accents: "Guérin")');
        console.log('Polish Names:');
        console.log('  "PaweÅ‚" -> "Pawel" (with --preserve-accents: "Paweł")');
        console.log('Name Cleaning:');
        console.log('  "FAIZAL SHAIKH" -> "Faizal" (only first part)');
        console.log('  "PMP SHAH-shah-shash" -> "Shash" (only last part)');
        
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
