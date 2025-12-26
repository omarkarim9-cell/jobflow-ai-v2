# JobFlow AI - Feature Documentation & Checkpoint v2
**Date:** November 20, 2025
**Version:** Beta 1.0
**Status:** Feature Complete (Frontend)

---

## 1. Core Architecture
The application is a **Frontend-Only React Application** (SPA) designed to simulate a full-stack SaaS platform without requiring a backend server. It utilizes browser-native technologies to handle complex tasks like email parsing, file management, and AI integration.

### Technical Workarounds
*   **Virtual File System (Bridge)**:
    *   *Problem*: Browser security blocks direct access to the user's hard drive (C:\) inside iframes/previews.
    *   *Solution*: Implemented a `VirtualDirectoryHandle` in `fileSystemService.ts` that mocks the File System Access API using `localStorage`.
    *   *Feature*: Users can "Connect via Path Name" (e.g., `C:\JobFlow`), and the app auto-creates virtual `jobs.txt` and `resume.txt` files that persist across reloads.
*   **Python Logic Porting**:
    *   *Problem*: AI (LLMs) struggle to count large lists (e.g., 19+ jobs) in raw HTML reliably.
    *   *Solution*: Ported the user's exact Python `BeautifulSoup` logic into TypeScript using `DOMParser`. This ensures 100% accurate extraction of links and text without hallucinations.
*   **Gmail "Frontend" API**:
    *   *Problem*: OAuth redirects are impossible in a sandboxed preview environment.
    *   *Solution*: Implemented a "Manual Token" flow where users paste a Google Access Token. The app then calls the Gmail API directly from the browser to fetch real emails.

---

## 2. Module Breakdown

### A. Onboarding & Profile
*   **Flow**: Multi-step wizard (Personal Info -> Preferences -> Resume).
*   **Resume Handling**: Supports text/file upload. Stores the "Master Resume" string for AI regeneration.
*   **Persistence**: Profile is saved to `localStorage`, enforcing a "Single User" session lock.

### B. Inbox Scanner (The Core Engine)
This is the most advanced module, consolidating fetching, analyzing, and filtering into one automated step.
*   **Auto-Scan**: On mount, it connects to Gmail, fetches the last 50 emails matching `subject:(job OR hiring)`.
*   **Batch Processing**: Iterates through emails in chunks of 5 to prevent API rate limiting.
*   **Extraction Engine**:
    1.  **Decodes** Quoted-Printable text (`=3D`, `=\r\n`) to fix broken links.
    2.  **Isolates** HTML body from Multipart MIME messages.
    3.  **Parses** DOM to find all `<a>` tags.
    4.  **Filters** using a strict "IT/Engineering" keyword list (excluding Sales/Marketing).
    5.  **Extracts** Context (Company/Location) by traversing the DOM tree upwards.
*   **Strict Filtering**: If User Preferences (e.g., "React Developer") are set, it **hides** all non-matching jobs from the final import list.

### C. Job Dashboard & Details
*   **Selected Jobs**: A Kanban-style list of imported jobs with Preference Filtering.
*   **Auto-Apply Simulation**: A visual progress bar simulating a Playwright backend (Navigating -> Filling -> Uploading -> Submitting).
*   **Smart Resume**: The "Save" feature writes the AI-customized resume to the Virtual Project Folder (e.g., `Google_Resume.txt`) for record-keeping.

### D. Settings
*   **Account Management**: Connect/Disconnect Gmail with Step-by-Step Token Guide.
*   **Data Bridge**: Manage the Virtual Workspace files.
*   **Export**: "Sync to Disk" button saves the full job database to `jobs_export.json`.

---

## 3. AI Prompts Used
The following system instructions are embedded in `geminiService.ts`:

**1. Resume Customization:**
> "Rewrite this resume for a {JobTitle} role at {Company}. Description: {JobDesc}. Resume: {MasterResume}"

**2. Cover Letter Generation:**
> "Write a professional cover letter for a {JobTitle} position at {Company}. Resume: {UserResume}. Job Desc: {JobDesc}"

**3. Job URL Extraction (Manual Add):**
> "Analyze this Job URL: '{url}'. If it contains readable job info, extract: title, company, location, description. If opaque, return { title: 'Unknown' }. DO NOT invent data."

---

## 4. Next Steps (Post-Beta)
1.  **Backend**: Replace the `localStorage` persistence with a real PostgreSQL database.
2.  **Automation**: Replace `automationService.ts` simulation with a real Python/Playwright microservice.
3.  **Auth**: Replace the "Manual Token" flow with a standard Server-Side OAuth 2.0 flow.
