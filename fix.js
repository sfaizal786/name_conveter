// fixer.js
const fs = require('fs');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

class NameFixer {
    // Function to check if string contains non-Latin characters
    static containsNonLatin(text) {
        if (!text) return false;
        // Match Chinese, Japanese, Korean, Arabic, Cyrillic, etc. but NOT European Latin extended
        return /[\u0400-\u04FF\u4e00-\u9fff\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/.test(text);
    }

    // Function to check if string contains European Latin extended characters
    static containsEuropeanLatinExtended(text) {
        if (!text) return false;
        // European Latin extended characters (including Polish, French, German, etc.)
        return /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿāăąćĉċčďđēĕėęěĝğġģĥħĩīĭįıĵķĸĺļľŀłńņňŉŋōŏőœŕŗřśŝşšţťŧũūŭůűųŵŷźżžșțΐάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώ]/.test(text);
    }

    // Function to clean first_name (take only the first part)
    static cleanFirstName(firstName) {
        if (!firstName) return firstName;
        
        // Convert to string and trim
        const name = String(firstName).trim();
        
        // If it contains non-Latin characters (but not European Latin), return as is
        if (this.containsNonLatin(name) && !this.containsEuropeanLatinExtended(name)) {
            return this.cleanPunctuation(name);
        }
        
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
        
        // If it contains non-Latin characters (but not European Latin), return as is
        if (this.containsNonLatin(name) && !this.containsEuropeanLatinExtended(name)) {
            return this.cleanPunctuation(name);
        }
        
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

        // Common mojibake patterns for European characters
        const mojibakeMap = {
            // Polish characters
            'Å‚': 'ł', 'Å„': 'ń', 'Å›': 'ś', 'Åº': 'ź', 'Å¼': 'ż',
            'Å³': 'ó', 'Ä…': 'ą', 'Ä‡': 'ć', 'Ä™': 'ę', 'Å‚': 'ł', 
            'Å„': 'ń', 'Å›': 'ś', 'Åº': 'ź', 'Å¼': 'ż', 'Å»': 'Ż',
            'Åš': 'Ś', 'Å¹': 'ù', 'Åº': 'ź', 'Å¼': 'ż', 'Å½': 'Ž',
            'Å�': 'Ł', 'Å„': 'ń', 'Å¡': 'š',
            
            // French and Western European
            'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
            'Ã ': 'à', 'Ã¡': 'á', 'Ã¢': 'â', 'Ã£': 'ã', 'Ã¤': 'ä', 'Ã¥': 'å',
            'Ã§': 'ç',
            'Ã‰': 'É', 'Ãˆ': 'È', 'ÃŠ': 'Ê', 'Ã‹': 'Ë',
            'Ã€': 'À', 'Ã': 'Á', 'Ã‚': 'Â', 'Ãƒ': 'Ã', 'Ã„': 'Ä', 'Ã…': 'Å',
            'Ã‡': 'Ç',
            
            // German and Nordic
            'Ã¶': 'ö', 'Ã–': 'Ö', 'Ã¼': 'ü', 'Ãœ': 'Ü', 'ÃŸ': 'ß',
            'Ã¸': 'ø', 'Ã˜': 'Ø', 'Ã¦': 'æ', 'Ã†': 'Æ',
            'Ã¥': 'å', 'Ã…': 'Å',
            
            // Spanish and Portuguese
            'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Ã­': 'í', 'Ã­': 'í',
            'Ã³': 'ó', 'Ãº': 'ú',
            
            // Special quotation marks and dashes
            'â€"': '—', 'â€"': '–', 'â€˜': '「', 'â€™': '」',
            'â€œ': '「', 'â€': '」', 'â€¦': '…',
            
            // Direct fixes for common mis-encodings
            'A‰': 'É', 'E‰': 'É', '‰': 'É',
            'â‚¬': '€', 'â€¡': '‡',
            
            // Common UTF-8 misinterpretations
            'Â': '',  // Remove stray Â that sometimes appears
            'â€': '', // Remove stray â€
        };

        // Apply character replacements
        for (const [wrong, correct] of Object.entries(mojibakeMap)) {
            const regex = new RegExp(wrong, 'g');
            text = text.replace(regex, correct);
        }

        // Try to decode the string using common encodings
        const encodingsToTry = ['utf8', 'latin1', 'windows-1250', 'windows-1252', 'iso-8859-1', 'iso-8859-2', 'iso-8859-15'];
        
        for (const encoding of encodingsToTry) {
            try {
                const buffer = Buffer.from(text, 'binary');
                const decoded = iconv.decode(buffer, encoding);
                
                // Check if decoding produced valid text
                if (decoded !== text && !decoded.includes('�')) {
                    text = decoded;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        return text;
    }

    static removeTitlesAndProfessions(text) {
        if (!text) return '';
        
        // Skip title removal for non-Latin text (but not European Latin)
        if (this.containsNonLatin(text) && !this.containsEuropeanLatinExtended(text)) {
            return text;
        }
        
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

        // For non-Latin text that's not European Latin, don't change case
        if (this.containsNonLatin(text) && !this.containsEuropeanLatinExtended(text)) {
            return text;
        }

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
                
                // Regular word - only capitalize first letter, leave the rest as is
                // This preserves characters like ł, ś, etc.
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
            capitalizeFirst = true,
            removeTitles = true,
            cleanPunctuation: cleanPunct = true
        } = options;

        // Step 1: Fix mojibake first - VERY IMPORTANT
        text = this.fixMojibake(text);
        
        // Check if text contains non-Latin characters (but not European Latin)
        const hasNonLatin = this.containsNonLatin(text);
        const hasEuropeanLatin = this.containsEuropeanLatinExtended(text);
        
        // For non-Latin text that's not European Latin, handle differently
        if (hasNonLatin && !hasEuropeanLatin) {
            // Don't remove titles for non-Latin text
            // Just clean punctuation if requested
            if (cleanPunct) {
                text = this.cleanPunctuation(text);
            }
            
            // Don't apply capitalization or accent removal for non-Latin
            return text.trim();
        }
        
        // Step 2: Remove titles and professions if requested (for Latin text)
        if (removeTitles) {
            text = this.removeTitlesAndProfessions(text);
        }
        
        // Step 3: Clean punctuation if requested
        if (cleanPunct) {
            text = this.cleanPunctuation(text);
        }

        // Step 4: Handle accents and special characters for Latin text
        if (!preserveAccents && (hasEuropeanLatin || !hasNonLatin)) {
            // Comprehensive accent map including Polish characters
            const accentMap = {
                // Polish characters
                'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
                'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
                'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
                'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
                
                // French and Western European
                'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
                'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
                'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
                'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ø': 'o',
                'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
                'ý': 'y', 'ÿ': 'y',
                'ç': 'c', 'ñ': 'n', 'ß': 'ss',
                
                // Uppercase equivalents
                'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A', 'Å': 'A',
                'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
                'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
                'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'Õ': 'O', 'Ø': 'O',
                'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
                'Ý': 'Y',
                'Ç': 'C', 'Ñ': 'N',
                
                // Special characters
                'Æ': 'AE', 'æ': 'ae',
                'Œ': 'OE', 'œ': 'oe',
                'Ð': 'D', 'ð': 'd',
                'Þ': 'TH', 'þ': 'th',
            };

            // Apply the accent map
            for (const [accented, plain] of Object.entries(accentMap)) {
                text = text.replace(new RegExp(accented, 'g'), plain);
            }

            // Use Unicode normalization to remove any remaining combining diacritical marks
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        if (removeSpecialChars && !hasNonLatin) {
            // Keep only alphanumeric, spaces, hyphens, and apostrophes for Latin text
            text = text.replace(/[^a-zA-Z0-9\s\-']/g, '');
            // Replace multiple spaces with single space
            text = text.replace(/\s+/g, ' ');
        }

        if (!caseSensitive && !capitalizeFirst && !hasNonLatin) {
            // Only lowercase if not capitalizing (capitalizeFirst handles case)
            text = text.toLowerCase();
        }

        // Capitalize first letter if requested (for Latin text)
        if (capitalizeFirst && !hasNonLatin) {
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
            // Try to detect encoding
            const buffer = fs.readFileSync(inputFile);
            
            // Try UTF-8 first
            try {
                content = iconv.decode(buffer, 'utf8');
            } catch (e) {
                // Try other encodings
                const encodings = ['windows-1250', 'windows-1252', 'iso-8859-2', 'iso-8859-15', 'latin1', 'gbk'];
                for (const enc of encodings) {
                    try {
                        content = iconv.decode(buffer, enc);
                        if (content.length > 0 && !content.includes('�')) {
                            console.log(`Detected encoding: ${enc}`);
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }
            }
            
            if (!content) {
                content = buffer.toString('utf8');
            }
            
        } catch (readError) {
            throw new Error(`Failed to read file: ${readError.message}`);
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

// Test Polish characters
function testPolishCharacters() {
    console.log("Testing Polish character fixes:");
    console.log("================================\n");

    const testCases = [
        { input: "PaweÅ‚", expectedWithAccents: "Paweł", expectedWithout: "Pawel" },
        { input: "JarosÅ‚aw", expectedWithAccents: "Jarosław", expectedWithout: "Jaroslaw" },
        { input: "MaÅ‚gorzata", expectedWithAccents: "Małgorzata", expectedWithout: "Malgorzata" },
        { input: "Zbigniew", expectedWithAccents: "Zbigniew", expectedWithout: "Zbigniew" },
        { input: "Åukasz", expectedWithAccents: "Łukasz", expectedWithout: "Lukasz" },
        { input: "Åšcibor", expectedWithAccents: "Ścibor", expectedWithout: "Scibor" },
        { input: "Å»aneta", expectedWithAccents: "Żaneta", expectedWithout: "Zaneta" },
        { input: "FrÃ©dÃ©ric", expectedWithAccents: "Frédéric", expectedWithout: "Frederic" },
        { input: "GuÃ©rin", expectedWithAccents: "Guérin", expectedWithout: "Guerin" },
        { input: "å­è–‡", expectedWithAccents: "陈", expectedWithout: "陈" },
        { input: "FAIZAL SHAIKH", expectedWithAccents: "Faizal Shaikh", expectedWithout: "Faizal Shaikh" }
    ];

    testCases.forEach((test, index) => {
        console.log(`${index + 1}. Input: "${test.input}"`);
        
        // Fix mojibake first
        const fixed = NameFixer.fixMojibake(test.input);
        console.log(`   After fixMojibake: "${fixed}"`);
        
        // Test with preserveAccents: true
        const withAccents = NameFixer.normalizeToASCII(test.input, {
            preserveAccents: true,
            removeTitles: false,
            cleanPunctuation: false,
            capitalizeFirst: false
        });
        console.log(`   With accents preserved: "${withAccents}"`);
        
        // Test with preserveAccents: false
        const withoutAccents = NameFixer.normalizeToASCII(test.input, {
            preserveAccents: false,
            removeTitles: false,
            cleanPunctuation: false,
            capitalizeFirst: false
        });
        console.log(`   Without accents: "${withoutAccents}"`);
        
        console.log("---");
    });
}

// Test name cleaning functionality
function testYourSpecificCases() {
    console.log("\n\nTesting All Cases:");
    console.log("==================\n");

    const testCases = [
        { first: "PaweÅ‚", last: "Kowalski", expectedFirst: "Paweł", expectedLast: "Kowalski" },
        { first: "JarosÅ‚aw", last: "Nowak", expectedFirst: "Jarosław", expectedLast: "Nowak" },
        { first: "FAIZAL-ABAS", last: "PMP SHAH-shah-shash", expectedFirst: "Faizal", expectedLast: "Shash" },
        { first: "FrÃ©dÃ©ric", last: "GuÃ©rin", expectedFirst: "Frédéric", expectedLast: "Guérin" },
        { first: "å­è–‡", last: "æ˜Šæƒ", expectedFirst: "陈", expectedLast: "明" },
        { first: "prof 'shaif", last: "khan", expectedFirst: "Shaif", expectedLast: "Khan" },
        { first: "cp faizal", last: "PMP SHAH", expectedFirst: "Faizal", expectedLast: "Shah" },
        { first: "OBE FAIZAL", last: "PMP SHAH-shah-shash", expectedFirst: "Faizal", expectedLast: "Shash" }
    ];

    testCases.forEach((test, index) => {
        const first = NameFixer.cleanFirstName(NameFixer.normalizeToASCII(test.first, { preserveAccents: true }));
        const last = NameFixer.cleanLastName(NameFixer.normalizeToASCII(test.last, { preserveAccents: true }));
        console.log(`${index + 1}. "${test.first} ${test.last}" -> "${first} ${last}"`);
        console.log(`   Expected: "${test.expectedFirst} ${test.expectedLast}"`);
        console.log(`   Match: ${first === test.expectedFirst && last === test.expectedLast ? '✓' : '✗'}`);
        console.log("");
    });
}

// Run tests
testPolishCharacters();
testYourSpecificCases();

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

Important Features:
  - Fixes Polish characters: "PaweÅ‚" -> "Pawel" (or "Paweł" with --preserve-accents)
  - Fixes French characters: "FrÃ©dÃ©ric" -> "Frederic" (or "Frédéric" with --preserve-accents)
  - Preserves Chinese/Non-Latin characters
  - First name: Takes only first part (FAIZAL SHAIKH -> Faizal)
  - Last name: Takes only last part (PMP SHAH-shah-shash -> Shash)

Examples:
  node fixer.js input.csv output.csv
  node fixer.js input.csv output.csv --preserve-accents --no-capitalize
  node fixer.js input.csv output.csv --keep-titles --keep-punctuation --verbose
  node fixer.js input.csv output.csv --no-clean-firstname --no-clean-lastname

Examples of fixes:
  - "PaweÅ‚" -> "Pawel" (with --preserve-accents: "Paweł")
  - "JarosÅ‚aw" -> "Jaroslaw" (with --preserve-accents: "Jarosław")
  - "FrÃ©dÃ©ric" -> "Frederic" (with --preserve-accents: "Frédéric")
  - "FAIZAL SHAIKH" -> "Faizal Shaikh"
  - "PMP SHAH-shah-shash" -> "Shash"
  - Chinese characters are preserved
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
        if (options.logProgress) {
            console.log('\nName Cleaning Examples:');
            console.log('======================');
            console.log('Polish Names:');
            console.log('  "PaweÅ‚" -> "Pawel" (with --preserve-accents: "Paweł")');
            console.log('  "JarosÅ‚aw" -> "Jaroslaw" (with --preserve-accents: "Jarosław")');
            console.log('French Names:');
            console.log('  "FrÃ©dÃ©ric" -> "Frederic" (with --preserve-accents: "Frédéric")');
            console.log('Latin Names:');
            console.log('  "FAIZAL SHAIKH" -> "Faizal" (only first part)');
            console.log('  "PMP SHAH-shah-shash" -> "Shash" (only last part)');
            console.log('Chinese Names:');
            console.log('  "å­è–‡" -> "陈" (preserved as-is)');
        }
        
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
