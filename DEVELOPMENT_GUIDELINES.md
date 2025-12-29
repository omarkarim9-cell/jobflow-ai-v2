# JobFlow AI - Development Guidelines & Protocol

This document serves as the primary instruction set for all AI assistants and developers working on the JobFlow AI project.

## 1. The Consult-First Protocol (STRICT)
To maintain code integrity and prevent unapproved changes, the following 4-step workflow must be followed for **every** request:

1.  **Request**: The user describes a requirement or problem.
2.  **Specification**: The developer/AI provides a detailed technical plan, listing exact file changes and UI behaviors for review.
3.  **Approval**: The developer/AI must wait for explicit user approval (e.g., "Green light" or "Proceed").
4.  **Execution**: Code changes are performed **only** after approval is received.

## 2. Data Privacy & Repository Integrity
*   **No User Data in Git**: Under no circumstances should user-specific data (Master Resumes, Job Leads, User Profiles) be committed to the GitHub repository.
*   **Cloud Isolation**: All user data must be stored exclusively in the authenticated **Neon Cloud Database** (managed via `dbService.ts`) or `localStorage`.
*   **Code Only**: The repository is for application source code, configuration, and documentation only.

## 3. Tech Stack Requirements
*   **Authentication**: Clerk.
*   **Database**: Neon (PostgreSQL).
*   **AI**: Google Gemini (via `/api` proxy).
*   **Styling**: Tailwind CSS.
*   **Icons**: Lucide React.

## 4. Maintenance of this Document
Any changes to these core protocols must be discussed and approved by the project owner before being updated in this file.
