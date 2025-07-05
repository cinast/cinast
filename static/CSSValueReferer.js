/**
 * CSS Refr Module - Provides dynamic CSS property referencing
 */
class CSSRefr {
    constructor() {
        this.dynamicSheets = [];
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.init();
    }
    /**
     * Initialize the module
     */
    init() {
        this.processRefrReplacements();
        this.setupDynamicObservers();
    }
    /**
     * Process static refr() replacements
     */
    processRefrReplacements() {
        for (let sheet of Array.from(document.styleSheets)) {
            try {
                const rules = sheet.cssRules ? Array.from(sheet.cssRules) : [];
                for (let rule of rules) {
                    if (rule.type === CSSRule.STYLE_RULE) {
                        if (rule.cssText.includes("refr") && rule.cssText.includes("$self")) {
                            this.processRule(rule);
                        }
                    }
                }
            } catch (e) {
                console.warn("无法访问样式表:", e);
            }
        }
    }
    /**
     * Set up observers for dynamic elements
     */
    setupDynamicObservers() {
        $('style, link[rel="stylesheet"]').each((_, el) => {
            try {
                const sheet = el.sheet;
                if (sheet && sheet.cssRules) {
                    const rules = sheet.cssRules ? Array.from(sheet.cssRules) : [];
                    for (let rule of rules) {
                        if (rule.type === CSSRule.STYLE_RULE && rule.cssText.includes("--referer-dynamic: 1")) {
                            this.dynamicSheets.push(sheet);
                            break;
                        }
                    }
                }
            } catch (e) {}
        });
        this.dynamicSheets.forEach((sheet) => {
            try {
                const rules = sheet.cssRules ? Array.from(sheet.cssRules) : [];
                for (let rule of rules) {
                    const styleRule = rule;
                    if (rule.type === CSSRule.STYLE_RULE && styleRule.cssText.includes("refr(")) {
                        $(styleRule.selectorText).each((_, element) => {
                            this.observer.observe(element, {
                                attributes: true,
                                attributeFilter: ["style", "class"],
                            });
                        });
                    }
                }
            } catch (e) {}
        });
    }
    /**
     * Handle DOM mutations
     */
    handleMutations(mutations) {
        mutations.forEach((mutation) => {
            if (mutation.type === "attributes") {
                this.dynamicSheets.forEach((sheet) => {
                    try {
                        const rules = sheet.cssRules ? Array.from(sheet.cssRules) : [];
                        for (let rule of rules) {
                            const styleRule = rule;
                            if (
                                rule.type === CSSRule.STYLE_RULE &&
                                styleRule.cssText.includes("refr(") &&
                                styleRule.selectorText &&
                                $(mutation.target).is(styleRule.selectorText)
                            ) {
                                this.processRule(styleRule);
                            }
                        }
                    } catch (e) {}
                });
            }
        });
    }
    /**
     * Process a single CSS rule
     */
    processRule(rule) {
        $(rule.selectorText).each((_, element) => {
            // Process each property in the rule
            for (let i = 0; i < rule.style.length; i++) {
                const prop = rule.style[i];
                const value = rule.style.getPropertyValue(prop);
                if (value.includes("refr($self@")) {
                    // Handle dynamic values
                    const match = value.match(/refr\(\$self@([^)]+)\)/);
                    if (match) {
                        try {
                            const attrName = match[1].trim();
                            let dynamicValue;
                            if (attrName === "textContent") {
                                dynamicValue = element.textContent;
                            } else if (attrName === "value" && "value" in element) {
                                dynamicValue = element.value;
                            } else if (attrName.startsWith("style.")) {
                                const styleProp = attrName.substring(6);
                                dynamicValue = window.getComputedStyle(element).getPropertyValue(styleProp);
                            } else {
                                dynamicValue = element.getAttribute(attrName);
                                console.log(`Getting attribute ${attrName} from element`, element, "value:", dynamicValue);
                                // 特殊处理size属性，确保带单位
                                if (attrName === "size" && dynamicValue && !isNaN(parseInt(dynamicValue))) {
                                    dynamicValue = dynamicValue + "px";
                                }
                            }
                            if (dynamicValue) {
                                console.log(`Setting ${prop} to ${dynamicValue} on element`, element);
                                try {
                                    // 直接设置style属性确保生效
                                    element.style[prop] = dynamicValue;
                                    console.log(`Successfully set ${prop} to ${dynamicValue}`);

                                    // 验证样式是否应用
                                    const computedValue = getComputedStyle(element)[prop];
                                    console.log(`Computed ${prop}: ${computedValue}`);

                                    // 添加CSS变量回退
                                    if (prop === "width" || prop === "height") {
                                        element.style.setProperty("--avatar-size", dynamicValue);
                                    }
                                } catch (e) {
                                    console.error(`Failed to set ${prop}:`, e);
                                }
                            }
                        } catch (e) {
                            console.warn(`处理refr($self@${match[1]})失败:`, e);
                        }
                    }
                } else {
                    // Copy static values
                    element.style.setProperty(prop, value);
                }
            }
        });
    }
    /**
     * Replace refr functions in CSS text
     */
    replaceRefrFunctions(cssText) {
        return cssText.replace(/refr\(\"([^)]+)\"\)/g, (match, expr) => {
            if (cssText.includes("--dynamic:")) return match;
            const parts = expr.split("@");
            if (parts.length < 2) return `/* 无效表达式: ${expr} */`;
            const selector = parts[0].trim();
            const attr = parts[1].trim();
            try {
                const element = document.querySelector(selector);
                if (!element) return `/* 元素未找到: ${selector} */`;
                let value;
                if (attr === "textContent") {
                    value = element.textContent;
                } else if (attr === "value" && "value" in element) {
                    value = element.value;
                } else if (attr.startsWith("style.")) {
                    const styleProp = attr.substring(6);
                    value = window.getComputedStyle(element).getPropertyValue(styleProp);
                } else {
                    value = element.getAttribute(attr);
                }
                return value ? `"${value.replace(/"/g, '\\"')}"` : '""';
            } catch (e) {
                console.warn(`处理refr("${expr}")失败:`, e);
                return match;
            }
        });
    }
}
// Initialize automatically when jQuery is ready
$(function () {
    console.log("Initializing CSSRefr...");
    const refr = new CSSRefr();
    window.refr = refr; // 暴露到全局方便调试
    console.log("CSSRefr initialized", refr);
});

window.CSSRefr = CSSRefr;
