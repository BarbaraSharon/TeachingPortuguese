(() => {
  "use strict";

  const script = document.currentScript;
  const registry = (() => {
    try {
      return JSON.parse(script?.dataset?.registry || "{}");
    } catch (_) {
      return {};
    }
  })();

  const validIntents = new Set([
    "online",
    "online_group",
    "gold_coast_group",
    "gold_coast_private",
    "group",
    "private",
    "speaking_club",
    "unspecified",
  ]);
  const validOffers = new Set(Object.keys(registry.offers || {}));
  const whatsappHosts = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com"]);
  const originalAnchors = new WeakMap();
  let initialized = false;

  function readContext() {
    const value = window.location.hash.replace(/^#/, "");
    const match = value.match(/^enquiry-([a-z_]+)(?:-([a-z0-9_]+))?$/i);
    if (!match) return null;

    const intent = match[1].toLowerCase();
    const offerId = (match[2] || "").toLowerCase();
    if (!validIntents.has(intent)) return null;
    if (offerId && !validOffers.has(offerId)) return null;
    return {intent, offerId};
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

  function channelFor(anchor) {
    const href = anchor.getAttribute("href") || "";
    const protocol = href.slice(0, href.indexOf(":") + 1).toLowerCase();
    if (protocol === "mailto:") return "email";
    if (protocol === "tel:") return "phone";

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (_) {
      return "";
    }
    if (url.protocol !== "https:" || !whatsappHosts.has(url.hostname.toLowerCase())) return "";
    return "whatsapp";
  }

  function rememberAnchor(anchor) {
    if (!originalAnchors.has(anchor)) {
      originalAnchors.set(anchor, {
        href: anchor.getAttribute("href") || "",
        lessonFormat: anchor.getAttribute("data-lesson-format") || "unspecified",
        enquiryIntent: anchor.getAttribute("data-enquiry-intent"),
        enquiryOffer: anchor.getAttribute("data-enquiry-offer"),
      });
    }
    return originalAnchors.get(anchor);
  }

  function restoreAnchor(anchor, original) {
    anchor.setAttribute("href", original.href);
    anchor.setAttribute("data-lesson-format", original.lessonFormat);
    if (original.enquiryIntent === null) anchor.removeAttribute("data-enquiry-intent");
    else anchor.setAttribute("data-enquiry-intent", original.enquiryIntent);
    if (original.enquiryOffer === null) anchor.removeAttribute("data-enquiry-offer");
    else anchor.setAttribute("data-enquiry-offer", original.enquiryOffer);
  }

  function applyToAnchor(anchor, context) {
    const channel = channelFor(anchor);
    if (!channel) return;

    const original = rememberAnchor(anchor);
    if (!context) {
      restoreAnchor(anchor, original);
      return;
    }

    anchor.setAttribute("data-lesson-format", context.intent);
    anchor.setAttribute("data-enquiry-intent", context.intent);
    if (context.offerId) anchor.setAttribute("data-enquiry-offer", context.offerId);
    else anchor.removeAttribute("data-enquiry-offer");
    if (channel === "phone") return;

    let url;
    try {
      url = new URL(original.href, window.location.href);
    } catch (_) {
      restoreAnchor(anchor, original);
      return;
    }

    const message = encodedMessage(context);
    if (channel === "whatsapp") {
      url.searchParams.set("text", message);
    } else if (channel === "email") {
      // Mailto uses URI encoding: a literal '+' is not a space, including in
      // existing fields such as a cc address. Preserve it before form parsing.
      url.search = url.search.replace(/\+/g, "%2B");
      url.searchParams.set("subject", registry.emailSubject || "Portuguese lesson enquiry");
      url.searchParams.set("body", message);
      url.search = url.searchParams.toString().replace(/\+/g, "%20");
    }
    anchor.setAttribute("href", url.toString());
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

    document.querySelectorAll("a[href]").forEach((anchor) => applyToAnchor(anchor, context));
  }

  function applyAfterRender() {
    applyContext();
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(applyContext);
    else window.setTimeout(applyContext, 0);
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    applyAfterRender();
    window.addEventListener("hashchange", applyContext);
    window.addEventListener("popstate", applyContext);
    window.addEventListener("pageshow", applyContext);
  }

  if (document.readyState === "complete") initialize();
  else document.addEventListener("DOMContentLoaded", initialize, {once: true});
})();
