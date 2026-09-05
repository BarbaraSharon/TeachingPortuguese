(() => {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const config = {
    gaId: script.dataset.gaId || "",
    clarityId: script.dataset.clarityId || "",
    privacyUrl: script.dataset.privacyUrl || "/privacy/",
    labels: {
      choices: script.dataset.labelChoices || "Analytics settings",
      heading: script.dataset.labelHeading || "Manage website analytics",
      explanation: script.dataset.labelExplanation || "Google Analytics and Microsoft Clarity are enabled by default. You can disable or enable them for this browser.",
      privacy: script.dataset.labelPrivacy || "Privacy Policy",
      accept: script.dataset.labelAccept || "Enable analytics",
      reject: script.dataset.labelReject || "Disable analytics",
      manage: script.dataset.labelManage || "Analytics preferences"
    }
  };
  const storageKey = "barbara-analytics-consent-v2";
  let currentChoice = getStoredChoice();

  function getStoredChoice() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!stored || !["accepted", "rejected"].includes(stored.value)) return null;
      return stored.value;
    } catch (_) {
      return null;
    }
  }

  function saveChoice(choice) {
    currentChoice = choice;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ value: choice, updatedAt: Date.now() }));
    } catch (_) {
      // Storage may be unavailable in private or restricted browser contexts.
    }
  }

  function loadAnalytics() {
    if (config.gaId && !window.__barbaraGaLoaded) {
      window.__barbaraGaLoaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("consent", "default", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
      window.gtag("js", new Date());
      window.gtag("config", config.gaId, {
        anonymize_ip: true,
        cookie_flags: "SameSite=None;Secure"
      });

      const gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(config.gaId);
      gaScript.referrerPolicy = "strict-origin-when-cross-origin";
      document.head.appendChild(gaScript);
    }

    if (config.clarityId && !window.__barbaraClarityLoaded) {
      window.__barbaraClarityLoaded = true;
      window.clarity = window.clarity || function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };
      window.clarity("consentv2", {
        ad_Storage: "denied",
        analytics_Storage: "granted"
      });
      const clarityScript = document.createElement("script");
      clarityScript.async = true;
      clarityScript.src = "https://www.clarity.ms/tag/" + encodeURIComponent(config.clarityId);
      clarityScript.referrerPolicy = "strict-origin-when-cross-origin";
      document.head.appendChild(clarityScript);
    }
  }

  function removeAnalyticsCookies() {
    if (config.gaId) {
      window["ga-disable-" + config.gaId] = true;
      window.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }
    window.clarity?.("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: "denied"
    });

    const knownNames = ["_ga", "_gid", "_gat", "_gcl_au", "_clck", "_clsk"];
    const visibleNames = document.cookie
      .split(";")
      .map((cookie) => cookie.split("=")[0].trim())
      .filter((name) => name.startsWith("_ga") || name.startsWith("_cl"));
    const names = [...new Set([...knownNames, ...visibleNames])];
    const domains = [""];
    const parts = window.location.hostname.split(".");
    for (let index = 0; index < parts.length - 1; index += 1) {
      domains.push("; domain=." + parts.slice(index).join("."));
    }

    names.forEach((name) => {
      domains.forEach((domain) => {
        document.cookie = name + "=; Max-Age=0; path=/" + domain + "; SameSite=Lax";
      });
    });
  }

  function removeElement(id) {
    document.getElementById(id)?.remove();
  }

  function renderPreferencesButton() {
    if (document.getElementById("analytics-consent-preferences")) return;

    const button = document.createElement("button");
    button.id = "analytics-consent-preferences";
    button.type = "button";
    button.className = "fixed bottom-4 left-4 z-50 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-lg dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
    button.textContent = config.labels.manage;
    button.addEventListener("click", showConsentBanner);
    document.body.appendChild(button);
  }

  function showConsentBanner() {
    if (document.getElementById("analytics-consent")) return;
    removeElement("analytics-consent-preferences");

    const banner = document.createElement("section");
    banner.id = "analytics-consent";
    banner.className = "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-800 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-labelledby", "analytics-consent-heading");

    const heading = document.createElement("h2");
    heading.id = "analytics-consent-heading";
    heading.className = "mb-2 text-base font-semibold";
    heading.textContent = config.labels.heading;

    const message = document.createElement("p");
    message.className = "mb-3";
    const privacyLink = document.createElement("a");
    privacyLink.className = "underline";
    privacyLink.href = config.privacyUrl;
    privacyLink.textContent = config.labels.privacy;
    message.append(config.labels.explanation + " ", privacyLink, ".");

    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-3";
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "rounded-lg border border-gray-300 px-4 py-2 font-medium dark:border-gray-600";
    reject.textContent = config.labels.reject;
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white";
    accept.textContent = config.labels.accept;
    actions.append(reject, accept);
    banner.append(heading, message, actions);
    document.body.appendChild(banner);

    function choose(choice) {
      const analyticsWereLoaded = window.__barbaraGaLoaded || window.__barbaraClarityLoaded;
      saveChoice(choice);
      banner.remove();
      if (choice === "accepted") {
        loadAnalytics();
      } else {
        removeAnalyticsCookies();
        if (analyticsWereLoaded) {
          window.location.reload();
          return;
        }
      }
      renderPreferencesButton();
    }

    reject.addEventListener("click", () => choose("rejected"));
    accept.addEventListener("click", () => choose("accepted"));
    requestAnimationFrame(() => reject.focus());
  }

  function initialize() {
    if (currentChoice !== "rejected") loadAnalytics();
    renderPreferencesButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
