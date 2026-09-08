(() => {
  "use strict";

  const script = document.currentScript;
  const registry = (() => {
    try { return JSON.parse(script?.dataset?.registry || "{}"); } catch (_) { return {}; }
  })();
  const validIntents = new Set(["online", "gold_coast_group", "gold_coast_private", "group", "private", "speaking_club", "unspecified"]);
  const validOffers = new Set(Object.keys(registry.offers || {}));

  function readContext() {
    const value = window.location.hash.replace(/^#/, "");
    const match = value.match(/^enquiry-([a-z_]+)(?:-([a-z0-9_]+))?$/i);
    if (!match || !validIntents.has(match[1])) return null;
    if (match[2] && !validOffers.has(match[2])) return null;
    return {intent: match[1], offerId: match[2] || ""};
  }

  function language() {
    return (document.documentElement.lang || "en").toLowerCase();
  }

  function instruction(intent) {
    return registry.instructions?.[intent] || registry.instructions?.unspecified || "Please mention your selected lesson package and availability.";
  }

  function offerLabel(offerId) {
    return offerId ? registry.offers?.[offerId] || "" : "";
  }

  function encodedMessage(context) {
    const selected = offerLabel(context.offerId);
    const parts = [registry.greeting || "Hi Barbara,", instruction(context.intent)];
    if (selected) parts.push((registry.selectedPrefix || "I am interested in:") + " " + selected + ".");
    return parts.join(" ");
  }

  function applyContext() {
    const context = readContext();
    const summary = document.querySelector("[data-enquiry-context-summary]");
    if (summary) {
      if (context) {
        const selected = offerLabel(context.offerId);
        summary.textContent = selected
          ? `${registry.selectedPrefix || "Selected lesson"} ${selected}. ${instruction(context.intent)}`
          : instruction(context.intent);
        summary.hidden = false;
      } else {
        summary.hidden = true;
        summary.textContent = "";
      }
    }

    document.querySelectorAll("[data-contact-action]").forEach((anchor) => {
      if (!anchor.dataset.baseHref) anchor.dataset.baseHref = anchor.getAttribute("href") || "";
      const base = anchor.dataset.baseHref;
      if (!context || !base) {
        anchor.setAttribute("href", base);
        return;
      }
      const message = encodedMessage(context);
      const channel = anchor.dataset.contactAction;
      if (channel === "whatsapp") {
        const url = new URL(base, window.location.origin);
        url.searchParams.set("text", message);
        anchor.setAttribute("href", url.toString());
      } else if (channel === "email") {
        const url = new URL(base, window.location.origin);
        const subject = registry.emailSubject || "Portuguese lesson enquiry";
        url.searchParams.set("subject", subject);
        url.searchParams.set("body", message);
        anchor.setAttribute("href", url.toString());
      }
    });
  }

  function initialize() {
    applyContext();
    window.addEventListener("hashchange", applyContext);
    window.addEventListener("popstate", applyContext);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {once: true});
  else initialize();
})();
