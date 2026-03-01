# Handover: Tour Companion - Neighborhood Toolkit (Page 4)

## Context
As part of the new iPad Tour Companion app, "Page 4" of the Unit Dossier is the **Neighborhood & Lifestyle Toolkit**. 
The goal of this page is to consolidate external community information so the leasing agent does not have to leave the app (e.g., switching to Safari) during a tour.

We need to integrate three primary data sources into the Nuxt 3 / Vue 3 application:
1. Local Map (Places of Interest)
2. Walk Score
3. Community Social Media (Instagram)

This document outlines the research and recommended integration strategies for the development team (Foreman).

---

## 1. Local Map Integration
**Goal:** Display a map centered on the property with pins for nearby transit, grocery stores, and parks.

### Recommended Approach: `@fawmi/vue-google-maps` (or Standard iFrame)
*   **Simple Route (No API Keys needed immediately):** A standard Google Maps `<iframe>` embed. You can generate an embed URL centered on the property address.
    *   *Pros:* Zero dependencies, easy to implement instantly.
    *   *Cons:* Limited interactivity; cannot easily inject custom styled pins for specific partner businesses.
*   **Advanced Route (Custom Nuxt Integration):** Use a Vue 3 compatible Google Maps package (like `@fawmi/vue-google-maps` or nuxt-google-maps). 
    *   *Implementation:* Pass the property's Latitude/Longitude as props to the component.
    *   *Pros:* Allows custom map styling (e.g., matching the app's dark/light mode) and custom marker icons.

## 2. Walk Score Integration
**Goal:** Display the property's Walk, Transit, and Bike scores.

### Recommended Approach: Walk Score Provided Widget
Walk Score provides a free tier embeddable widget that is very easy to use.
*   **How to implement:** 
    1. Obtain a free Walk Score ID (WSID) from their website.
    2. They provide a `<script>` and `<div>` tag snippet.
    3. **Vue 3 Nuxt Gotcha:** Because Vue handles the DOM, directly pasting `<script>` tags into a component template can cause hydration mismatches or fail to execute. 
*   **Vue Solution:** Create a dedicated `<WalkScoreWidget />` Vue component. Use Nuxt's `useHead()` composable to dynamically inject the Walk Score script into the `<head>` of the document *only* when this component comes into view, and initialize the target `<div>` with the property's address/lat-long data via props.

## 3. Community Social Media (Instagram Feed)
**Goal:** Display recent posts from the property's Instagram account.

### Recommended Approach: Third-Party Aggregator Widget (iFrame)
Directly integrating the Instagram Graph API is notoriously complex for read-only frontends because it requires constant authentication token refreshes and handling CORS issues.

*   **Avoid:** Native Instagram Embeds (copy/pasting the code from a single post). It is buggy in Single Page Applications (SPAs) because the Instagram JS script fights with Vue's virtual DOM.
*   **Recommended Solution:** Use a free/low-cost social aggregator like **EmbedSocial, SociableKIT, or Elfsight**.
    *   *Why:* You authenticate the property's Instagram account *once* on their dashboard. They give you a clean, CORS-friendly `<iframe>` URL or a structured JSON feed.
    *   *Implementation:* Simply drop the provided `<iframe>` snippet into the Vue component. It handles its own responsive sizing and requires zero API maintenance within the Nuxt codebase.

---

## Fallback UI Strategy (The Modal Overlay)
If *any* of the above `iframes` are blocked by the provider (e.g., `X-Frame-Options` restrictions), the fallback UI design is a **"Modal Overlay"**, not a new browser tab.
*   Create a generic `<ExternalWebModal>` component.
*   If the agent taps "View Social", but the iframe fails, the app slides up a full-screen Vue modal containing the external website. When the agent closes the modal, they are still exactly where they left off in the Tour App.  Do not use `target="_blank"` standard anchor tags if it can be avoided.
