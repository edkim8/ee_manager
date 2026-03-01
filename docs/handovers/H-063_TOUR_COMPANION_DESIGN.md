# Handover: Tour Companion UX/UI Design & Blueprint (H-063)
**Date:** February 28, 2026
**To:** Foreman (Development Team)

## 1. Executive Summary
We have completed the conceptual design and UX blueprint for the new **iPad Tour Companion App**, designed to be used side-by-side by leasing agents and prospective residents during property tours. The design moves away from an operational "dashboard" and acts as a highly visual, prospect-safe **"Unit Dossier."**

**Key Artifacts Created:**
1.  **Consultation PDF:** `docs/Tour_iPad_Assistant_Brainstorming.pdf` (Shared with staff, contains high-fidelity AI mockups and feature explanations).
2.  **Integration Research:** `docs/handovers/F024_TOUR_NEIGHBORHOOD_TOOLKIT.md` (Details on avoiding API auth for Maps, Walk Score, and Social feeds).

---

## 2. Core Architecture: The "Unit Dossier"
The foundational interaction model utilizes native iPad gestures to minimize UI clutter and maximize presentation impact.

*   **The Shortlist Bar (Top):** Pre-loaded with up to 4 units before the tour. This is the *only* way the agent changes which apartment they are talking about.
*   **Horizontal Swiping (Pagination):** Swiping left/right on the main canvas turns the 4 "pages" *within* the currently selected unit's dossier.
*   **Vertical Scrolling:** Used strictly for overflowing content (e.g., a long list of amenities or scrolling down a vertical stack of gallery photos).

### The 4 Swipeable Pages
1.  **Page 1: The Visual Gallery:** Vertical stack of high-res photos.
2.  **Page 2: Core Specs & Financials:** Asymmetric split. Left side shows amenities; right side shows prominent, prospect-safe financials (estimated move-in costs, rent) and urgency tags (e.g., "Just Listed").
3.  **Page 3: Spatial Layout:** Massive, pinch-to-zoom floorplan with compass orientation.
4.  **Page 4: Neighborhood Toolkit:** An embedded dashboard containing a Local Map, Walk Score widget, and Community Social feed.

---

## 3. The "Presentation Mode" Toggle
To solve the tension between the agent needing setup controls (sidebars, property selectors) and the prospect needing a clean presentation, we designed a toggle state:

1.  **Setup State (Windowed):** Standard app view with the left sidebar active. Used to build the shortlist.
2.  **Tour State (Full Screen):** The agent taps a `[ ]` maximize icon. The left sidebar collapses to `0px`, top navigation hides, and the Unit Dossier takes up 100% of the screen.

---

## 4. The 3-Device Ecosystem Strategy
For architectural context, the Tour Companion sits within a explicit 3-tier device paradigm:
*   **PC (Operations Hub):** Heavy data entry, complex reporting, leasing generation.
*   **Tablet (Presentation Tool):** The shared experience device. Strips away dense ops data in favor of beautiful visuals and simple talking points.
*   **Phone (Tactical Assistant):** On-the-go burst actions. Maintenance photos, quick messages, rapid status checks.

---

## 5. Development Next Steps for Foreman
1.  **UI Layout Scaffold:** Build the Vue/Tailwind shell that supports the "Presentation Mode" sidebar collapsing logic.
2.  **Swiper Integration:** Implement a touch-friendly horizontal swipe container (e.g., `Swiper.js` or native CSS scroll snapping) for the 4 Dossier pages.
3.  **Toolkit Integration:** Review `F024_TOUR_NEIGHBORHOOD_TOOLKIT.md` and implement the `<WalkScoreWidget>` and social IFrames.
4.  **Staff Feedback:** Await final data requirements from the leasing team based on the Brainstorming PDF (e.g., exact stats needed on Page 2).
