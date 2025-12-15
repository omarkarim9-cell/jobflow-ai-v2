# JobFlow AI - Comprehensive Project Handover

**Date:** November 20, 2025
**Version:** 2.6 (Beta)
**Tech Stack:** React, TypeScript, TailwindCSS, Supabase (Optional), LocalStorage.

---

## 1. Project Mission
JobFlow AI is a browser-based automation platform designed to streamline the job search process. It scans emails for job opportunities, tracks application statuses, and generates tailored resumes and cover letters.

**Core Philosophy:** The app operates on a **"Local-First, Free-First"** principle. While it was originally built on Google's Gemini API, it has been re-engineered to perform 90% of its heavy lifting (parsing, writing, tracking) using local algorithms to ensure it remains free for the user.

---

## 2. Project History & User Journey (Chat Log Reconstruction)

This section documents the major pivots and feature requests that shaped the current codebase.

### Phase 1: The AI Foundation
*   **Initial State:** The app used `GoogleGenAI` for everything: extracting jobs from HTML emails and writing cover letters.
*   **The Problem:** The user encountered API limits, timeouts, and potential costs associated with the Gemini API.
*   **User Request:** "Replace the limited Google model with a free tool."
*   **The Solution:** We built `services/localAiService.ts`. This replaced the LLM extraction with a sophisticated DOMParser + Regex engine, and replaced LLM writing with dynamic string templates.

### Phase 2: The Parsing Quality Fix
*   **The Problem:** The local parser was flagging "Privacy Policies" as jobs and marking companies as "Unknown".
*   **User Request:** "Job filter broken (65 jobs found), Job extractor showing 'Unknown Company'."
*   **The Solution:** 
    1.  **Strict Whitelisting:** Added keywords (Engineer, Developer, Analyst) to the parser.
    2.  **Blacklisting:** Explicitly ignored "Unsubscribe", "View in Browser".
    3.  **Proximity Analysis:** implemented logic to look at text *surrounding* the link (e.g., "Senior Dev **at Google**") to correctly identify company names.

### Phase 3: The Tracker Pivot
*   **The Problem:** The user found the "Selected Jobs" view confusing because it mixed new scans (Inbox) with jobs they wanted to keep (Saved).
*   **User Request:** "I need to see what I have applied to versus what is just scanned. Clear scanned jobs on login."
*   **The Solution:**
    1.  Created `components/ApplicationTracker.tsx`.
    2.  Split logic: `JobStatus.DETECTED` (Inbox) vs `JobStatus.SAVED` (Tracker).
    3.  Updated `App.tsx` to wipe `DETECTED` jobs on login/refresh, keeping the inbox fresh, while persisting `SAVED` jobs.

### Phase 4: Data Persistence & Auth
*   **The Problem:** Users lost data upon refreshing.
*   **The Solution:**
    1.  Implemented `services/supabaseClient.ts` for real database storage.
    2.  Added a robust "Demo Mode" fallback using `localStorage` if no database is connected.
    3.  Created a "Virtual File System" (`services/fileSystemService.ts`) to simulate saving files to the hard drive (`C:\JobFlow`) within the browser sandbox.

---

## 3. System Architecture

### A. The "Free AI" Engine (`services/localAiService.ts`)
This is the heart of the "Free" requirement.
*   **Extraction:** Instead of sending HTML to an LLM, we iterate through every `<a>` tag, check it against a Regex of known job titles, and sanitize the result.
*   **Generation:** Instead of prompting an LLM to write a cover letter, we use a template: `Dear [Hiring Manager], I am applying for [Role] at [Company]...`. This is instant and free.
*   **Hybrid Wrapper:** `services/geminiService.ts` still exists but acts as a wrapper. It attempts to use Gemini if an API key is present, but **defaults immediately** to `localAiService` if it fails or if the key is missing.

### B. The File System Bridge
Browsers cannot write directly to `C:\` for security reasons.
*   **Implementation:** We created a `VirtualDirectoryHandle` interface.
*   **Behavior:** When the user "Connects" a folder, we mock the file system in `localStorage`.
*   **Result:** The app "thinks" it is saving `Google_Resume.txt` to the disk, allowing the "Auto-Apply" simulation to function without errors.

### C. The Application Tracker
*   **Logic:** Separates the "Inflow" (Scanner) from the "Pipeline" (Tracker).
*   **States:** 
    *   `DETECTED`: Transient. Disappears on reload.
    *   `SAVED`: Persistent. Appears in "My Applications".
    *   `APPLIED`: Visual badge changes.

---

## 4. Key Files Overview

| File | Purpose |
|Data|Description|
|---|---|
| `components/InboxScanner.tsx` | Connects to Gmail (client-side), fetches emails, runs the Regex parser. |
| `components/ApplicationTracker.tsx` | The Kanban/List view for managing saved jobs. Handles archiving and status updates. |
| `services/localAiService.ts` | **CRITICAL.** Contains the regex logic and templates that make the app "Free". |
| `services/geminiService.ts` | The legacy wrapper. Kept for backward compatibility if a user *wants* to use a paid key. |
| `services/fileSystemService.ts` | Handles the Virtual vs Real file system switching logic. |
| `types.ts` | Defines the `Job`, `JobStatus`, and `UserProfile` schemas. |

---

## 5. Next Steps for Developer

1.  **Automation Bridge:** currently `automationService.ts` is a simulation. To make this a real product, you need to build a Python/Selenium backend that accepts the `Job` object and actually drives a headless browser.
2.  **OAuth Server:** The Gmail connection currently uses a "Client-Side Token" paste method. A real backend is needed to handle OAuth2 redirects properly.
3.  **PDF Parsing:** currently the app handles `.txt` resumes. Adding `pdf-parse` would allow users to upload PDF resumes.

---

*This document supersedes all previous project summaries.*