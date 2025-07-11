/**
 * Supported languages in the application
 * @type {ReadonlyArray<string>}
 */
const LangFilesAt = Object.freeze(
    {
        dev: "http://127.0.0.1:3000/github v1/static/lang",
        web: "",
    }[["dev", "web"][0]]
);
console.log(LangFilesAt);

/**
 * Supported languages in the application
 * @type {ReadonlyArray<string>}
 */
const Languages = Object.freeze(["[TranslationKeys]", "zh-CN", "En"]);

/**
 * Gets the current language from document head or browser settings
 * @returns {string} Current language code
 */
let currentLang = () => document.head.lang || navigator.language;

/**
 * Object storing all loaded language files
 * @type {Object.<string, {
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
    if (lang === "[TranslationKeys]") return; // Skip the translation keys placeholder

    console.log(`${LangFilesAt}/${lang}.json`);

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

// Initialize with user's preferred language or default
document.addEventListener("DOMContentLoaded", () => {
    const preferredLang = currentLang();
    const supportedLang = Languages.find((lang) => lang === preferredLang || lang.startsWith(preferredLang.split("-")[0]));

    if (supportedLang && supportedLang !== currentLang()) {
        switchLang(supportedLang).catch(console.error);
    }
});
