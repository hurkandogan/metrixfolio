# Metrixfolio 📈

A personal, data-driven financial portfolio management ecosystem built for real-world use. This project demonstrates **production-grade engineering practices** across multiple languages and platforms.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Telegram](https://img.shields.io/badge/Telegram_Bot-2CA5E0?style=flat&logo=telegram&logoColor=white)

> **Status:** Actively developed · Personal production use

---

## 🎯 Project Overview

As a **Senior Fullstack Developer** with a deep passion for finance and markets, I built this ecosystem to solve a real problem: tracking my investments with custom metrics, gamification, and automated data pipelines—something off-the-shelf tools couldn't provide.

It's a **production system I use daily** to:

- Track stocks, crypto, and metals across custom categories
- Gamify my investment progress with a 10% step-based milestone system
- Automate market data collection and portfolio synchronization
- Receive real-time market updates via Telegram

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           METRIXFOLIO ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   Frontend   │◄───│  Rust API    │◄───│     External APIs        │   │
│  │   (Next.js)  │    │  (Backend)   │    │  • Twelve Data (stocks)  │   │
│  │   • DaisyUI  │    │              │    │  • Yahoo Finance (backup)│   │
│  │   • Tailwind │    │  • Category  │    │  • Kraken (crypto sync)  │   │
│  └──────┬───────┘    │    calcs     │    └──────────────────────────┘   │
│         │            │  • Price     │                                   │
│         │            │    engine    │    ┌──────────────────────────┐   │
│         ▼            └──────┬───────┘    │   Broadcaster (Node.js)  │   │
│  ┌──────────────┐           │            │   • Telegram bot         │   │
│  │   Firebase   │◄──────────┘            │   • Market open alerts   │   │
│  │  • Firestore │                        │   • News feed (planned)  │   │
│  │  • Auth      │◄───────────────────────│   • Twitter (planned)    │   │
│  │  • Hosting   │                        └──────────────────────────┘   │
│  └──────┬───────┘                                                       │
│         │            ┌──────────────────────────────────────────────┐   │
│         │            │        Algo Trading Bot (Python)             │   │
│         └───────────►│   • Runs on home Linux server                │   │
│                      │   • IBKR integration (Market Data Subsc.)    │   │
│                      │   • Auto-syncs portfolio → Firebase          │   │
│                      │   (Separate repository)                      │   │
│                      └──────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Components

### 1. Metrixfolio Frontend (Next.js + TypeScript)

The main dashboard for visualizing and managing portfolio data.

| Feature                 | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| **Step Tracker**        | Gamified 10% milestone system to visualize investment progress  |
| **Category Management** | Organize assets (stocks, crypto, metals) into custom categories |
| **Real-time Dashboard** | Live portfolio valuations and performance metrics               |

**Tech:** Next.js (App Router), TypeScript, Tailwind CSS, DaisyUI, Firebase Auth

---

### 2. Rust Backend API

High-performance calculation engine for portfolio metrics.

| Responsibility         | Implementation                                                   |
| ---------------------- | ---------------------------------------------------------------- |
| **Category Valuation** | Aggregates and calculates category-level metrics                 |
| **Price Engine**       | Fetches live prices from Twelve Data (Yahoo Finance as fallback) |
| **Kraken Sync**        | Periodic synchronization of crypto holdings                      |
| **Data Pipeline**      | Reads from Firebase, enriches with live data, serves to frontend |

**Tech:** Rust, Axum, Firebase Admin SDK, REST APIs

---

### 3. Broadcaster Service (Node.js)

Automated notification system for market events.

| Feature                 | Status             |
| ----------------------- | ------------------ |
| **Market Open Alerts**  | ✅ Live (Telegram) |
| **News Feed**           | 🚧 In Development  |
| **Twitter Integration** | 📋 Planned         |

**Tech:** Node.js, TypeScript, Telegram Bot API

---

### 4. Algo Trading Bot (Python) — _Separate Repository_

Automated trading system running on a dedicated home server.

- Connects to Interactive Brokers (IBKR)
- Syncs portfolio positions to Firebase
- Enables the Rust API to access up-to-date brokerage data

**Tech:** Python, IBKR API, Firebase Admin SDK, Linux

---

## 💡 Key Engineering Decisions

| Challenge                             | Solution                             | Why                                                     |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| **Performance-critical calculations** | Rust backend                         | Type safety + zero-cost abstractions for financial math |
| **API reliability**                   | Twelve Data + Yahoo Finance fallback | Redundancy for market data availability                 |
| **Real-time crypto sync**             | Kraken API integration               | Automated, accurate crypto portfolio tracking           |
| **Cross-platform notifications**      | Telegram bot first                   | Instant mobile access without app development overhead  |
| **Portfolio data source**             | Python bot on home server            | Secure IBKR integration without exposing credentials    |

---

## 🛠️ Tech Stack Summary

```
Frontend:       TypeScript · Next.js 16 · React · Tailwind CSS · DaisyUI
Backend:        Rust · Axum
Automation:     Python · Node.js · TypeScript
Infrastructure: Firebase (Firestore, Auth, Hosting)
APIs:           Twelve Data · Yahoo Finance · Kraken · IBKR · Telegram
DevOps:         Docker · Linux (home server) · Firebase CLI
```

---

## 📈 Roadmap

- [x] Core dashboard with step-based gamification
- [x] Rust backend for category calculations
- [x] Telegram broadcaster for market alerts
- [x] Kraken crypto sync
- [x] IBKR portfolio sync (via Python bot)
- [ ] Industry & sector auto-categorization
- [ ] News aggregation in broadcaster
- [ ] Twitter/X integration for alerts
- [ ] Enhanced analytics dashboard

---

## 🚀 Development Philosophy

This is a **solo project built in limited spare time**, balancing feature development with production reliability.

- **Pragmatic engineering:** Ship working features, iterate based on real usage
- **Multi-language proficiency:** Right tool for the job (Rust for performance, Python for integrations, TypeScript for UI)
- **Security-first:** Sensitive operations isolated to server-side components
- **Continuous improvement:** Active development despite time constraints

---

## 👨‍💻 About the Developer

I'm a **Senior Fullstack Developer** who is genuinely passionate about finance and capital markets. This isn't just a side project—it's where my professional expertise meets personal interest.

**What drives this project:**

- 📊 **Finance Enthusiasm:** I actively follow markets, analyze investment opportunities, and continuously learn about financial instruments
- 🔧 **Engineering Excellence:** Hands-on experience from React/Next.js frontends to Rust and Python backends
- 🔗 **Real-world Integrations:** Production experience with financial APIs (IBKR, Kraken, market data providers)
- 🎯 **Problem Solving:** Building tools that solve actual problems I face as an investor

---


<p align="center">
  <i>Built with ☕ and a data-driven mindset</i>
</p>
