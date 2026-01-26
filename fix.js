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
            return firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
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
            return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
        }
        return name;
    }

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
            
            // French and other European accents - UPDATED
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
            
            // Special handling for FrÃ©dÃ©ric pattern
            'Ã©': 'é',  // Small e with acute accent
            'Ã¨': 'è',  // Small e with grave accent
            'Ãª': 'ê',  // Small e with circumflex
            'Ã«': 'ë',  // Small e with diaeresis
            
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
            
            // Special handling for FrÃ©dÃ©ric
            'Ã©': 'é',  // Small e with acute
            'Ã¨': 'è',  // Small e with grave
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
            // First, handle specific accented characters properly
            const accentMap = {
                // Lowercase vowels with accents
                'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
                'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
                'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
                'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ø': 'o',
                'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
                'ý': 'y', 'ÿ': 'y',
                'ç': 'c',
                'ñ': 'n',
                'ß': 'ss',
                
                // Uppercase vowels with accents
                'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A', 'Å': 'A',
                'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
                'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
                'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'Õ': 'O', 'Ø': 'O',
                'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
                'Ý': 'Y',
                'Ç': 'C',
                'Ñ': 'N',
                
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

            // Then use Unicode normalization to remove any remaining combining diacritical marks
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            
            // Clean up any double letters that might have been created
            text = text.replace(/ae/g, 'a').replace(/AE/g, 'A');
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

    // NEW: Special function to handle French names specifically
    static fixFrenchNames(text, options = {}) {
        if (!text) return '';
        
        const {
            preserveAccents = false,
            capitalizeFirst = true
        } = options;
        
        // First fix the mojibake
        text = this.fixMojibake(text);
        
        // Handle specific French patterns
        const frenchPatterns = [
            // Fix common French mojibake issues
            { pattern: /FrÃ©dÃ©ric/gi, replacement: 'Frédéric' },
            { pattern: /GuÃ©rin/gi, replacement: 'Guérin' },
            { pattern: /Ã©/g, replacement: 'é' },
            { pattern: /Ã¨/g, replacement: 'è' },
            { pattern: /Ãª/g, replacement: 'ê' },
            { pattern: /Ã«/g, replacement: 'ë' },
            { pattern: /Ã¢/g, replacement: 'â' },
            { pattern: /Ã®/g, replacement: 'î' },
            { pattern: /Ã´/g, replacement: 'ô' },
            { pattern: /Ã»/g, replacement: 'û' },
            { pattern: /Ã§/g, replacement: 'ç' },
            { pattern: /Ã¡/g, replacement: 'á' },
            { pattern: /Ã­/g, replacement: 'í' },
            { pattern: /Ã³/g, replacement: 'ó' },
            { pattern: /Ãº/g, replacement: 'ú' },
            { pattern: /Ã±/g, replacement: 'ñ' },
        ];
        
        for (const { pattern, replacement } of frenchPatterns) {
            text = text.replace(pattern, replacement);
        }
        
        // If not preserving accents, convert to ASCII
        if (!preserveAccents) {
            text = this.convertToPlainASCII(text);
        }
        
        // Capitalize if requested
        if (capitalizeFirst) {
            text = this.capitalizeFirstLetter(text);
        }
        
        return text;
    }
    
    // NEW: Helper function to convert accented characters to plain ASCII
    static convertToPlainASCII(text) {
        if (!text) return '';
        
        const accentMap = {
            'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
            'Ç': 'C',
            'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
            'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
            'Ð': 'D',
            'Ñ': 'N',
            'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O',
            'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
            'Ý': 'Y',
            'Þ': 'TH',
            'ß': 'ss',
            'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
            'ç': 'c',
            'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
            'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
            'ð': 'd',
            'ñ': 'n',
            'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
            'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
            'ý': 'y',
            'þ': 'th',
            'ÿ': 'y'
        };
        
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            result += accentMap[char] || char;
        }
        
        return result;
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
            // Get original values
            const firstRaw = r.first_name || r.firstName || r.FirstName || r.First_Name || r.first || '';
            const lastRaw = r.last_name || r.lastName || r.LastName || r.Last_Name || r.last || '';
            const companyRaw = r.company_domain || r.company || r.domain || '';

            // First, apply French name fix specifically for problematic cases
            let first = NameFixer.fixFrenchNames(firstRaw, {
                preserveAccents,
                capitalizeFirst
            });
            
            let last = NameFixer.fixFrenchNames(lastRaw, {
                preserveAccents,
                capitalizeFirst
            });

            // Then apply general normalization
            first = NameFixer.normalizeToASCII(first, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst: false, // Already capitalized by fixFrenchNames
                removeTitles,
                cleanPunctuation
            });
            
            last = NameFixer.normalizeToASCII(last, {
                preserveAccents,
                removeSpecialChars,
                caseSensitive,
                capitalizeFirst: false, // Already capitalized by fixFrenchNames
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

// Test specific French character issue
function testFrenchCharacters() {
    console.log("Testing French character fixes:");
    console.log("===============================\n");

    const testCases = [
        { input: "FrÃ©dÃ©ric", expected: "Frederic" },
        { input: "GuÃ©rin", expected: "Guerin" },
        { input: "A‰douard Mandon", expected: "Edouard Mandon" },
        { input: "Ã‰douard Mandon", expected: "Edouard Mandon" },
        { input: "Édouard Mandon", expected: "Edouard Mandon" },
        { input: "AndrÃ© Gide", expected: "Andre Gide" },
        { input: "FranÃ§ois Hollande", expected: "Francois Hollande" },
        { input: "RenÃ© Descartes", expected: "Rene Descartes" },
        { input: "JosÃ© Mourinho", expected: "Jose Mourinho" },
        { input: "NiÃ±o de la Torre", expected: "Nino de la Torre" },
        { input: "BjÃ¶rn Borg", expected: "Bjorn Borg" },
        { input: "HÃ¥kan Nilsson", expected: "Hakan Nilsson" }
    ];

    testCases.forEach((test, index) => {
        console.log(`${index + 1}. Input: "${test.input}"`);
        
        // Test with preserveAccents: false
        const result = NameFixer.normalizeToASCII(test.input, {
            preserveAccents: false,
            removeTitles: false,
            cleanPunctuation: false
        });
        
        console.log(`   Result: "${result}"`);
        console.log(`   Expected: "${test.expected}"`);
        console.log(`   Match: ${result === test.expected ? '✓' : '✗'}`);
        console.log("---");
    });
}

// Test name cleaning functionality with your specific cases
function testYourSpecificCases() {
    console.log("\n\nTesting Your Specific Cases:");
    console.log("============================\n");

    // Test cases from your input
    const testCases = [
        { input: "FAIZAL-ABAS", expected: "Faizal" },
        { input: "FAIZAL ABAS", expected: "Faizal" },
        { input: "FAIZAL ABAS jghjghhg", expected: "Faizal" },
        { input: "faizal", expected: "Faizal" },
        { input: "prof 'shaif", expected: "Shaif" },
        { input: "shouf.", expected: "Shouf" },
        { input: "shah jr", expected: "Shah" },
        { input: "cp faizal", expected: "Faizal" },
        { input: "faizal PMP", expected: "Faizal" },
        { input: "OBE FAIZAL", expected: "Faizal" }
    ];

    console.log("First Name Tests:");
    testCases.forEach((test, index) => {
        const cleaned = NameFixer.cleanFirstName(test.input);
        const status = cleaned === test.expected ? "✓" : "✗";
        console.log(`${index + 1}. ${status} "${test.input}" -> "${cleaned}" (Expected: "${test.expected}")`);
    });

    console.log("\nLast Name Tests:");
    const lastNameTests = [
        { input: "PMP SHAH", expected: "Shah" },
        { input: "PMP SHAH shah shash", expected: "Shash" },
        { input: "PMP SHAH-shah-shash", expected: "Shash" },
        { input: "shaikh", expected: "Shaikh" },
        { input: "khan", expected: "Khan" },
        { input: "SHAH-shah-shash", expected: "Shash" },
        { input: "SHUFA ABBAS SHAIKH", expected: "Shaikh" },
        { input: "FAIZAK ABBAS KHAN", expected: "Khan" }
    ];

    lastNameTests.forEach((test, index) => {
        const cleaned = NameFixer.cleanLastName(test.input);
        const status = cleaned === test.expected ? "✓" : "✗";
        console.log(`${index + 1}. ${status} "${test.input}" -> "${cleaned}" (Expected: "${test.expected}")`);
    });

    console.log("\nFrench Name Tests:");
    const frenchTests = [
        { input: "FrÃ©dÃ©ric", expected: "Frederic" },
        { input: "GuÃ©rin", expected: "Guerin" },
        { input: "Frédéric", expected: "Frederic" },
        { input: "Guérin", expected: "Guerin" },
        { input: "Jérôme", expected: "Jerome" },
        { input: "Renée", expected: "Renee" },
        { input: "François", expected: "Francois" },
        { input: "Zoë", expected: "Zoe" },
        { input: "Niña", expected: "Nina" },
        { input: "São", expected: "Sao" }
    ];

    frenchTests.forEach((test, index) => {
        const result = NameFixer.normalizeToASCII(test.input, {
            preserveAccents: false,
            removeTitles: false,
            cleanPunctuation: false
        });
        const status = result === test.expected ? "✓" : "✗";
        console.log(`${index + 1}. ${status} "${test.input}" -> "${result}" (Expected: "${test.expected}")`);
    });
}

// Run tests
testFrenchCharacters();
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

Examples:
  node fixer.js input.csv output.csv
  node fixer.js input.csv output.csv --preserve-accents --no-capitalize
  node fixer.js input.csv output.csv --keep-titles --keep-punctuation --verbose
  node fixer.js input.csv output.csv --no-clean-firstname --no-clean-lastname

Name Cleaning Behavior:
  - First name: Takes only first part (FAIZAL SHAIKH -> Faizal, FAIZAL-SHAIKH -> Faizal)
  - Last name: Takes only last part after splitting by space OR hyphen (PMP SHAH-shah-shash -> Shash)
  - French names: "FrÃ©dÃ©ric" -> "Frederic", "GuÃ©rin" -> "Guerin"

Note: Now properly handles French characters like É, é, etc.
      "FrÃ©dÃ©ric" will become "Frederic" (or "Frédéric" with --preserve-accents)
      "GuÃ©rin" will become "Guerin" (or "Guérin" with --preserve-accents)
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
            console.log('First Name: "FAIZAL SHAIKH" -> "Faizal" (only first part)');
            console.log('First Name: "FAIZAL-SHAIKH" -> "Faizal" (only first part)');
            console.log('First Name: "SHAHID SHAIKH SHAIKH SHAIKH" -> "Shahid" (only first part)');
            console.log('Last Name: "SHUFA ABBAS SHAIKH" -> "Shaikh" (only last part after space)');
            console.log('Last Name: "FAIZAK ABBAS KHAN" -> "Khan" (only last part after space)');
            console.log('Last Name: "PMP SHAH-shah-shash" -> "Shash" (only last part after space OR hyphen)');
            console.log('French Names: "FrÃ©dÃ©ric" -> "Frederic" (with --preserve-accents: "Frédéric")');
            console.log('French Names: "GuÃ©rin" -> "Guerin" (with --preserve-accents: "Guérin")');
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
