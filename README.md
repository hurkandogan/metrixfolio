# Metrixfolio 📈

A rational, data-driven approach to financial goal-tracking and opportunity analysis. Built on the Firebase ecosystem as a senior-level showcase project.

![Project Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tech Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Firebase%20%7C%20Rust-blue)
![Code Style](https://img.shields.io/badge/style-Prettier-ff69b4)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> **Note:** This project is currently in active development.

<p align="center">
  <img src="YOUR_SCREENSHOT_HERE.png" alt="Metrixfolio Dashboard Screenshot" width="800"/>
</p>

## 🎯 About The Project

As a Senior Developer with a rational and analytical mindset, I needed a tool that wasn't just another generic portfolio tracker. `Metrixfolio` is my answer.

This project is built to serve two core purposes:

1.  **A Personal Goal Tracker:** To manage my long-term financial goals by tracking them in disciplined, incremental steps.
2.  **A Technical Showcase:** To serve as a demonstration of a modern, high-performance, and type-safe tech stack from frontend to backend, all cleanly integrated within the Firebase platform.

This tool is designed to move beyond amateur investing by providing a data-driven "value and opportunity hunting" system, helping me make rational decisions by filtering market data against my specific criteria.

## ✨ Core Features

- **📈 Target Goal Tracking:** A dynamic table that calculates and displays the growth path to target based on a growth rate compounding step system.
- **📊 Portfolio Dashboard:** (Planned) Visual comparison of "Target" vs. "Actual" portfolio allocation (Growth, High Risk, Options, Cash).
- **🔎 Stock Hunter:** (Planned) A powerful filtering module to identify "value" and "opportunity" stocks based on custom metrics (P/E, P/B, Dividend Yield, etc.).
- **🔐 Secure Authentication:** User login and registration powered by **Firebase Authentication**.
- **🗃️ Serverless Database:** User goals and settings are securely stored in **Cloud Firestore**, accessed via server-side logic.
- **🔌 IBKR Integration:** Secure, read-only API connection to Interactive Brokers (IBKR) to fetch real-time portfolio performance and positions.

## 💻 Tech Stack & Architecture

This project is a full-stack Next.js application deployed entirely within the **Firebase ecosystem**, ensuring seamless integration and scalability.

### Frontend

- **[Next.js](https://nextjs.org/) (App Router):** For a hybrid (SSR/SSG/ISR) React experience.
- **[TypeScript](https://www.typescriptlang.org/):** For end-to-end type safety.
- **[Tailwind CSS](https://tailwindcss.com/):** For utility-first styling.
- **[DaisyUI](https://daisyui.com/):** As a component library on top of Tailwind for rapid UI development.

### Backend & Infrastructure

- **[Firebase Hosting](https://firebase.google.com/docs/hosting):** Serves the static frontend assets (HTML, CSS, JS) via a global CDN.
- **[Firebase Cloud Functions](https://firebase.google.com/docs/functions):** Hosts the Next.js server-side logic (Server Components, API Routes) for secure data fetching and dynamic rendering.
- **[Cloud Firestore](https://firebase.google.com/docs/firestore):** The primary database. A serverless, NoSQL database with a generous free tier, used to store user data.
- **[Firebase Admin SDK](https://firebase.google.com/docs/admin/setup):** Used in Server Components to securely interact with Firestore and Auth, ensuring no private keys are ever exposed to the client (browser).
- **[Rust](https://www.rust-lang.org/):** (Planned) For highly-performant, isolated microservices (e.g., complex financial calculations) that can be called from the main Next.js/Cloud Functions backend.

### Tooling & Code Quality

- **[ESLint](https://eslint.org/):** For code linting and quality.
- **[Prettier](https://prettier.io/):** For automated code formatting.
- **`prettier-plugin-tailwindcss`:** Automatically sorts Tailwind classes for ultimate readability.
- **[Jest](https://jestjs.io/):** For unit and integration testing.

## 🏃‍♂️ Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm (or pnpm/yarn)
- Firebase CLI: `npm install -g firebase-tools`

### Installation

1.  **Clone the repository:**

    ```sh
    git clone [https://github.com/hurkandogan/metrixfolio.git](https://github.com/hurkandogan/metrixfolio.git)
    cd metrixfolio
    ```

2.  **Install dependencies:**

    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project. Add your client-side Firebase config and your **server-side service account JSON**.
    - Find your client-side config in `Firebase Console > Project Settings > General`.
    - Generate your server-side key in `Firebase Console > Project Settings > Service accounts > Generate new private key`.

    ```sh
    # .env.local

    # --- Client-Side Config (Public) ---


    # --- Server-Side Config (Secret) ---
    # Copy the entire contents of your service account JSON file as a single-line string

    ```

4.  **Run the development server:**
    ```sh
    npm run dev
    ```

---
