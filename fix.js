// fixer.js
const fs = require('fs');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

class NameFixer {
    static cleanFirstName(firstName) {
        if (!firstName) return firstName;
        const name = String(firstName).trim();
        const parts = name.split(/[\s\-]+/);
        if (parts.length > 0) {
            const firstPart = parts[0];
            return this.capitalizeFirstLetter(firstPart);
        }
        return name;
    }

    static cleanLastName(lastName) {
        if (!lastName) return lastName;
        const name = String(lastName).trim();
        const parts = name.split(/[\s\-]+/);
        if (parts.length > 0) {
            const lastPart = parts[parts.length - 1];
            return this.capitalizeFirstLetter(lastPart);
        }
        return name;
    }

    static fixMojibake(text) {
        if (!text) return '';
        text = text.toString().trim();

        const mojibakeMap = {
            // French and Western European
            'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
            'Ã ': 'à', 'Ã¡': 'á', 'Ã¢': 'â', 'Ã£': 'ã', 'Ã¤': 'ä', 'Ã¥': 'å',
            'Ã§': 'ç', 'Ã´': 'ô', 'Ã®': 'î', 'Ã¯': 'ï',
            'Ã»': 'û', 'Ã¹': 'ù', 'Ã¼': 'ü', 'Ãÿ': 'ÿ',
            // Uppercase
            'Ã‰': 'É', 'Ãˆ': 'È', 'ÃŠ': 'Ê', 'Ã‹': 'Ë',
            'Ã€': 'À', 'Ã': 'Á', 'Ã‚': 'Â', 'Ãƒ': 'Ã', 'Ã„': 'Ä', 'Ã…': 'Å',
            'Ã‡': 'Ç', 'Ã"': 'Ô', 'ÃŽ': 'Î', 'Ã�': 'Ï',
            'Ã›': 'Û', 'Ã™': 'Ù', 'Ãœ': 'Ü',
            // German and Nordic
            'Ã¶': 'ö', 'Ã–': 'Ö', 'ÃŸ': 'ß', 'Ã¸': 'ø', 'Ã˜': 'Ø', 'Ã¦': 'æ', 'Ã†': 'Æ',
            // Spanish and Portuguese
            'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
            // Polish characters
            'Å‚': 'ł', 'Å„': 'ń', 'Å›': 'ś', 'Åº': 'ź', 'Å¼': 'ż',
            'Ä…': 'ą', 'Ä‡': 'ć', 'Ä™': 'ę', 'Å³': 'ó',
            'Å': 'Ł', 'Åš': 'Ś', 'Å»': 'Ż'
        };

        let result = text;
        for (const [wrong, correct] of Object.entries(mojibakeMap)) {
            const escapedWrong = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedWrong, 'g');
            result = result.replace(regex, correct);
        }
        return result;
    }

    static removeTitlesAndProfessions(text) {
        if (!text) return '';
        
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
            "rev", "reverend", "father", "pastor",
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
        for (const title of titles) {
            const titleRegex = new RegExp(
                `\\b${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?\\b`,
                'gi'
            );
            cleaned = cleaned.replace(titleRegex, '');
        }
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }

    static cleanPunctuation(text, options = {}) {
        if (!text) return '';
        
        const { removeApostrophes = true, keepHyphens = true } = options;
        text = text.replace(/\s+/g, ' ');
        const words = text.split(' ');
        
        const cleanedWords = words.map(word => {
            if (!word) return '';
            let cleaned = word;
            if (removeApostrophes) {
                cleaned = cleaned.replace(/['`´ʼʹʺʻʽʿˈˊˋ]/g, '');
            }
            cleaned = cleaned.replace(/^[.,;:!?~"()\[\]{}]+/, '');
            cleaned = cleaned.replace(/[.,;:!?~"()\[\]{}]+$/, '');
            if (!keepHyphens) {
                cleaned = cleaned.replace(/-/g, '');
            } else {
                cleaned = cleaned.replace(/^-+|-+$/g, '');
            }
            return cleaned;
        }).filter(word => word.length > 0);
        
        return cleanedWords.join(' ');
    }

    static capitalizeFirstLetter(text) {
        if (!text) return '';
        text = text.toString().trim();
        return text.split(/\s+/)
            .map(word => {
                if (word.length === 0) return word;
                if (word.includes("'")) {
                    return word.split("'")
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                        .join("'");
                }
                if (word.includes("-")) {
                    return word.split("-")
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                        .join("-");
                }
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
            cleanPunctuation: cleanPunct = true,
            removeApostrophes = true,
            keepHyphens = true
        } = options;

        // Step 1: Fix mojibake
        text = this.fixMojibake(text);
        
        // Step 2: Clean punctuation (apostrophes, hyphens, etc.)
        if (cleanPunct) {
            text = this.cleanPunctuation(text, { removeApostrophes, keepHyphens });
        }

        // Step 3: Handle accents and convert to ASCII (if not preserving accents)
        if (!preserveAccents) {
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
            for (const [accented, plain] of Object.entries(accentMap)) {
                text = text.replace(new RegExp(accented, 'g'), plain);
            }
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        // Step 4: Remove titles and professions (after accents are ASCII)
        if (removeTitles) {
            text = this.removeTitlesAndProfessions(text);
        }

        // Step 5: Remove any remaining special characters
        if (removeSpecialChars) {
            text = text.replace(/[^a-zA-Z0-9\s\-']/g, '');
            text = text.replace(/\s+/g, ' ');
        }

        // Step 6: Handle case
        if (!caseSensitive && !capitalizeFirst) {
            text = text.toLowerCase();
        }
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
        encoding = 'utf8',
        cleanFirstName = true,
        cleanLastName = true,
        removeApostrophes = true,
        keepHyphens = true
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
            const firstRaw = r.first_name || r.firstName || r.FirstName || r.First_Name || r.first || '';
            const lastRaw = r.last_name || r.lastName || r.LastName || r.Last_Name || r.last || '';
            const companyRaw = r.company_domain || r.company || r.domain || '';

            let first = NameFixer.normalizeToASCII(firstRaw, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst,
                removeTitles,
                cleanPunctuation,
                removeApostrophes,
                keepHyphens
            });
            
            let last = NameFixer.normalizeToASCII(lastRaw, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst,
                removeTitles,
                cleanPunctuation,
                removeApostrophes,
                keepHyphens
            });

            if (cleanFirstName) {
                first = NameFixer.cleanFirstName(first);
            }
            if (cleanLastName) {
                last = NameFixer.cleanLastName(last);
            }

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

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(processed);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, outputFile);

        if (logProgress) {
            console.log(`Processed ${processed.length} records`);
            console.log(`Output saved to: ${outputFile} (XLSX format)`);
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
        { input: "JÃ©rÃ´me", expectedWithAccents: "Jérôme", expectedWithoutAccents: "Jerome" },
        { input: "CabanÃ¨s", expectedWithAccents: "Cabanès", expectedWithoutAccents: "Cabanes" },
        { input: "FrÃ©dÃ©ric", expectedWithAccents: "Frédéric", expectedWithoutAccents: "Frederic" },
        { input: "GuÃ©rin", expectedWithAccents: "Guérin", expectedWithoutAccents: "Guerin" },
        { input: "RenÃ©", expectedWithAccents: "René", expectedWithoutAccents: "Rene" },
        { input: "FranÃ§ois", expectedWithAccents: "François", expectedWithoutAccents: "Francois" },
        { input: "HÃ©lÃ¨ne", expectedWithAccents: "Hélène", expectedWithoutAccents: "Helene" },
    ];
    
    testCases.forEach((test, index) => {
        console.log(`\nTest ${index + 1}: "${test.input}"`);
        const fixed = NameFixer.fixMojibake(test.input);
        console.log(`  After fixMojibake: "${fixed}"`);
        
        const withAccents = NameFixer.normalizeToASCII(test.input, {
            preserveAccents: true,
            removeTitles: false,
            cleanPunctuation: false,
            capitalizeFirst: false,
            removeApostrophes: false
        });
        console.log(`  With accents: "${withAccents}"`);
        console.log(`  Expected with accents: "${test.expectedWithAccents}"`);
        console.log(`  Match: ${withAccents === test.expectedWithAccents ? '✓' : '✗'}`);
        
        const withoutAccents = NameFixer.normalizeToASCII(test.input, {
            preserveAccents: false,
            removeTitles: false,
            cleanPunctuation: false,
            capitalizeFirst: false,
            removeApostrophes: false
        });
        console.log(`  Without accents: "${withoutAccents}"`);
        console.log(`  Expected without accents: "${test.expectedWithoutAccents}"`);
        console.log(`  Match: ${withoutAccents === test.expectedWithoutAccents ? '✓' : '✗'}`);
    });
}

function testAllCases() {
    console.log("\n\n=== Testing All Cases ===");
    
    const testCases = [
        { first: "JÃ©rÃ´me", last: "CabanÃ¨s", expectedFirst: "Jerome", expectedLast: "Cabanes" },
        { first: "FrÃ©dÃ©ric", last: "GuÃ©rin", expectedFirst: "Frederic", expectedLast: "Guerin" },
        { first: "PaweÅ‚", last: "Kowalski", expectedFirst: "Pawel", expectedLast: "Kowalski" },
        { first: "JarosÅ‚aw", last: "Nowak", expectedFirst: "Jaroslaw", expectedLast: "Nowak" },
        { first: "FAIZAL SHAIKH", last: "PMP SHAH-shah-shash", expectedFirst: "Faizal", expectedLast: "Shash" },
        { first: "FAIZAL-ABAS", last: "SHUFA ABBAS SHAIKH", expectedFirst: "Faizal", expectedLast: "Shaikh" },
        { first: "faizalo's", last: "test", expectedFirst: "Faizalos", expectedLast: "Test" },
        { first: "O'Connor", last: "McDonald's", expectedFirst: "Oconnor", expectedLast: "Mcdonalds" },
        { first: "Jean-Claude", last: "Van-Damme", expectedFirst: "Jean-Claude", expectedLast: "Van-Damme" },
        { first: "Jean-Claude", last: "Van-Damme", expectedFirstNoHyphen: "Jeanclaude", expectedLastNoHyphen: "Vandamme" },
        { first: "BjÃ¶rn", last: "Johansson", expectedFirst: "Bjorn", expectedLast: "Johansson" }
    ];
    
    testCases.forEach((test, index) => {
        console.log(`\nTest ${index + 1}: "${test.first} ${test.last}"`);
        
        const first = NameFixer.cleanFirstName(NameFixer.normalizeToASCII(test.first, { preserveAccents: false }));
        const last = NameFixer.cleanLastName(NameFixer.normalizeToASCII(test.last, { preserveAccents: false }));
        
        console.log(`  Default output: "${first} ${last}"`);
        
        if (test.expectedFirstNoHyphen) {
            const firstNoHyphen = NameFixer.cleanFirstName(NameFixer.normalizeToASCII(test.first, { 
                preserveAccents: false,
                keepHyphens: false 
            }));
            const lastNoHyphen = NameFixer.cleanLastName(NameFixer.normalizeToASCII(test.last, { 
                preserveAccents: false,
                keepHyphens: false 
            }));
            console.log(`  Without hyphens: "${firstNoHyphen} ${lastNoHyphen}"`);
        }
        
        if (test.expectedFirst && test.expectedLast) {
            console.log(`  Expected: "${test.expectedFirst} ${test.expectedLast}"`);
            console.log(`  Match: ${first === test.expectedFirst && last === test.expectedLast ? '✓' : '✗'}`);
        }
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

Usage: node fixer.js <input.csv> <output.xlsx> [options]

Options:
  --preserve-accents     Keep accented characters (default: false)
  --keep-special-chars   Keep special characters (default: false)
  --case-sensitive       Preserve original case (default: false)
  --no-capitalize        Disable first letter capitalization (default: capitalized)
  --keep-titles          Keep titles and professions (default: removed)
  --keep-punctuation     Keep punctuation (default: removed)
  --no-clean-firstname   Don't clean first name (keep full name) (default: cleaned)
  --no-clean-lastname    Don't clean last name (keep full name) (default: cleaned)
  --keep-apostrophes     Keep apostrophes (default: removed)
  --remove-hyphens       Remove hyphens (default: keep hyphens)
  --verbose              Show progress messages
  --help                 Show this help message

Important Fixes:
  - Removes apostrophes: "faizalo's" -> "faizalos"
  - French names: "JÃ©rÃ´me" -> "Jerome" (or "Jérôme" with --preserve-accents)
  - Polish names: "PaweÅ‚" -> "Pawel" (or "Paweł" with --preserve-accents)
  - First name: Takes only first part (FAIZAL SHAIKH -> Faizal)
  - Last name: Takes only last part (PMP SHAH-shah-shash -> Shash)

Examples:
  node fixer.js input.csv output.xlsx
  node fixer.js input.csv output.xlsx --preserve-accents
  node fixer.js input.csv output.xlsx --keep-apostrophes
  node fixer.js input.csv output.xlsx --remove-hyphens
  node fixer.js input.csv output.xlsx --verbose
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
        cleanFirstName: !args.includes('--no-clean-firstname'),
        cleanLastName: !args.includes('--no-clean-lastname'),
        removeApostrophes: !args.includes('--keep-apostrophes'),
        keepHyphens: !args.includes('--remove-hyphens'),
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
            cleanLastName: options.cleanLastName,
            removeApostrophes: options.removeApostrophes,
            keepHyphens: options.keepHyphens
        });

        const count = processCSV(inputFile, outputFile, options);
        console.log(`✅ Successfully processed ${count} records`);
        console.log(`📁 Output file: ${outputFile} (Excel XLSX format)`);
        
        console.log('\nExamples of fixes:');
        console.log('==================');
        console.log('Apostrophe Removal:');
        console.log('  "faizalo\'s" -> "Faizalos"');
        console.log('  "O\'Connor" -> "Oconnor"');
        console.log('  (use --keep-apostrophes to preserve apostrophes)');
        console.log('\nFrench Names:');
        console.log('  "JÃ©rÃ´me" -> "Jerome" (with --preserve-accents: "Jérôme")');
        console.log('  "CabanÃ¨s" -> "Cabanes" (with --preserve-accents: "Cabanès")');
        console.log('  "FrÃ©dÃ©ric" -> "Frederic" (with --preserve-accents: "Frédéric")');
        console.log('\nPolish Names:');
        console.log('  "PaweÅ‚" -> "Pawel" (with --preserve-accents: "Paweł")');
        console.log('\nName Cleaning:');
        console.log('  "FAIZAL SHAIKH" -> "Faizal" (only first part)');
        console.log('  "PMP SHAH-shah-shash" -> "Shash" (only last part)');
        console.log('\nHyphen Handling:');
        console.log('  "Jean-Claude" -> "Jean-Claude" (use --remove-hyphens: "Jeanclaude")');
        
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
