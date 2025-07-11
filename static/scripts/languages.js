function pseudoUUID() {
    return "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".replace(/[x]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function download(blob, fileName = "") {
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
/**
 * Supported languages in the application
 * @type {ReadonlyArray<string>}
 */
const LangFilesAt = Object.freeze(
    {
        dev: "http://127.0.0.1:3000/github v1/static/lang",
        web: "https://github.com/cinast/cinast/blob/fc868c03f4872758c5e697baa41a7d11cbb4418c/static/lang",
    }[["dev", "web"][document.location.origin == "https://cinast.github.io" ? 1 : 0]]
);

/**
 * Supported languages in the application
 * @type {ReadonlyArray<string>}
 */
const Languages = Object.freeze(["[TranslationTemplate]", "zh-CN", "En"]);

/**
 * Gets the current language from document head or browser settings
 * @returns {string} Current language code
 */
let currentLang = () => document.head.lang || navigator.language;

/**
 * Object storing all loaded language files
 * @type {Object.<string, {
 *   lang: string[],
 *   author: string,
 *   date: string,
 *   version: string,
 *   identifier: string,
 *   description: string,
 *   translationBook: Object.<string, string>
 * }>}
 */
let LanguageFiles = {};

/**
 * Gets the language file for the current language
 * @returns {Object|undefined} Current language file or undefined if not loaded
 */
let currentLangFile = () => LanguageFiles[currentLang()];

// Load all language files
Languages.forEach((lang) => {
    if (lang === "[TranslationTemplate]") return; // Skip the translation keys placeholder

    let request = fetch(`${LangFilesAt}/${lang}.json`);
    request.catch((reason) => {
        console.error(`Language loading failed for ${lang}:`, reason);
    });
    request.then(async (response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        LanguageFiles[lang] = await response.json();
        // Update UI if this is the current language
        if (lang === currentLang()) {
            updateUITranslations();
        }
    });
});

/**
 * Updates all elements with translation keys to the current language
 */
function updateUITranslations() {
    const langFile = currentLangFile();
    if (!langFile) return;

    document.querySelectorAll("[data-translation-key]").forEach((element) => {
        const key = element.getAttribute("data-translation-key");
        if (!key) return;

        const translation = langFile.translationBook[key];
        if (translation) {
            element.textContent = translation;
        } else {
            console.warn(`Missing translation for key: ${key}`);
        }
    });
}

/**
 * Switches the application language
 * @param {string} lang - The language to switch to (must be one of the Languages)
 * @returns {Promise<void>}
 */
async function switchLang(lang) {
    if (lang === currentLang()) return;
    if (!Languages.includes(lang)) {
        console.error(`Language ${lang} is not supported`);
        return;
    }

    // Wait for the language file to load if it hasn't already
    if (!LanguageFiles[lang]) {
        try {
            const response = await fetch(`${LangFilesAt}/${lang}.json`);
            LanguageFiles[lang] = await response.json();
        } catch (error) {
            console.error(`Failed to load language ${lang}:`, error);
            return;
        }
    }

    document.head.lang = lang;
    updateUITranslations();

    // Optional: Dispatch event for other parts of the app to react to language changes
    document.dispatchEvent(new CustomEvent("languageChanged", { detail: lang }));
}

/**
 * Generating **signal** translation template as a `LanguageFile` Object
 * @param {string[]} languages - Array of language codes to include in the template
 * @returns {Object.<string, Object>} Translation JSON template
 */
function generateTranslationTemplate(languages = ["[TranslationTemplate]"]) {
    const elements = document.querySelectorAll("[data-translation-key]");
    const translationKeys = new Set();

    elements.forEach((element) => {
        const key = element.getAttribute("data-translation-key");
        if (key) {
            translationKeys.add(key);
        }
    });

    //initialize the template
    const template = {
        lang: languages,
        author: `generated from ${document.location.href}`,
        date: new Date().toISOString().split("T")[0],
        version: `generated - ${new Date().toISOString().split("T")[0]}`,
        identifier: pseudoUUID(),
        description: "",
        translationBook: {},
    };

    // Add all keys with empty values
    translationKeys.forEach((key) => {
        template.translationBook[key] = "";
    });

    return template;
}

/**
 * Downloads the generated translation template as a JSON file
 * @param {string} fileName - Name of the file to download
 * @param {Object} data - JSON data to download
 */
function downloadTranslationTemplate(fileName, data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    download(blob, fileName);
}

/**
 * Download the *Translation Template* was loaded and that you want
 * @param {string[]} lang
 */
function get_TranslationTemplate_From_Loaded(lang = ["[TranslationTemplate]"]) {
    const template = generateTranslationTemplate(lang);
    downloadTranslationTemplate(`${lang}_translations.json`, template);
}

// Initialize with user's preferred language or default
document.addEventListener("DOMContentLoaded", () => {
    const preferredLang = currentLang();
    const supportedLang = Languages.find((lang) => lang === preferredLang || lang.startsWith(preferredLang.split("-")[0]));

    if (supportedLang && supportedLang !== currentLang()) {
        switchLang(supportedLang).catch(console.error);
    }
});
