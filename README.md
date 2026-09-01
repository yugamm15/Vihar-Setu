<div align="center">

# 🪔 Vihar Setu (વિહાર સેતુ / विहार सेतु)

### *Sacred Sadhviji Vihar Safety, Real-Time Telemetry & Emergency Escalation Platform*

[![React Native](https://img.shields.io/badge/React_Native-0.74.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Firebase Auth](https://img.shields.io/badge/Firebase-SMS%20Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Android](https://img.shields.io/badge/Platform-Android%20SDK%2035-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Jinaarya Vihar Seva (જિનાર્ય વિહાર સેવા)</b><br/>
  Dedicated to the security, reverent coordination, and real-time welfare of Jain Sadhviji Bhagwanto during their sacred Vihars across India.
</p>

---

</div>

## 📌 Overview

**Vihar Setu** is a mission-critical mobile and cloud platform engineered for the Jain community and dedicated Sevak networks. It combines high-precision background GPS telemetry, intelligent route deviation detection, multi-tier emergency escalation (SOS), and real-time admin monitoring dashboards—all wrapped in a culturally respectful Jain spiritual aesthetic.

---

## 🌟 Key Modules & Features

```
                              ┌───────────────────────────────────┐
                              │            VIHAR SETU             │
                              └─────────────────┬─────────────────┘
                                                │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
 ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
 │  SEVAK SIDE   │              │  ADMIN CENTER │              │  SUPER ADMIN  │
 ├───────────────┤              ├───────────────┤              ├───────────────┤
 │ • 5-Tab Nav   │              │ • Live Sevaks │              │ • System Params│
 │ • Start Vihar │              │ • Telemetry   │              │ • User Approvals│
 │ • Route Map   │              │ • Battery/Speed│             │ • Audit Logs  │
 │ • Instant SOS │              │ • Call Actions│              │ • Analytics   │
 │ • Stats & Hist│              │ • SOS Monitor │              │ • Governance  │
 └───────────────┘              └───────────────┘              └───────────────┘
```

### 1. 🪔 Authentication & Onboarding
- **Jain Emblem Splash Screen**: Spiritual animation with instant session restoration.
- **Multilingual Onboarding**: One-time spiritual safety slides with instant translation in **ગુજરાતી (Gujarati)**, **हिन्दी (Hindi)**, and **English**.
- **+91 Phone OTP Login**: Seamless authentication with 30s countdown timer and test credentials.

### 2. 🚶 Sevak (User) Dashboard & Bottom Navigation
- **5 Core Bottom Tabs**:
  1. **Home (`HomeTab`)**: Dynamic greeting banner, `+ START VIHAR` button, Supabase-calculated statistics (*Vihars Done*, *Total Distance (km)*), and today's activity card.
  2. **Vihar (`ViharTab`)**: Live Vihar tracking view, destination checkpoints, remaining distance, ETA, speed, battery telemetry, and one-touch **SOS Emergency Trigger**.
  3. **History (`HistoryTab`)**: Searchable log of past vihars with route milestones and completion status.
  4. **Profile (`ProfileTab`)**: Verified Sevak credentials, blood group, emergency contact with 1-tap call dialer, language picker, and profile editing modal.
  5. **More (`MoreTab`)**: Settings, audio alarms, tracking engine configs, help & support, and privacy policies.

### 3. 🛡️ Regional Admin Control Center
- Real-time active Vihar roster with live speed, battery %, and last GPS ping.
- Instant direct call action to Sevaks on the road.
- Emergency escalation alert banner with acknowledge and resolve workflows.

### 4. ⚙️ Super Admin Governance Suite
- Configurable telemetry parameters (GPS polling frequency, deviation thresholds, stationary timeout).
- User approval and role assignment matrix (`SEVAK`, `ADMIN`, `SUPER_ADMIN`).
- Comprehensive audit trails and system logs.

---

## 🎨 Design System & Spiritual Aesthetics

Tailored specifically with a reverent Jain color palette:

| Color Token | Hex Code | Preview | Usage |
|:---|:---|:---:|:---|
| **Deep Maroon** | `#641C2D` | `■` | Primary Headers, Banners & Action Buttons |
| **Saffron (Kesariya)** | `#D98A2B` | `■` | Highlights, CTAs & Active Tab Accents |
| **Spiritual Gold** | `#C9A44C` | `■` | Sacred Emblems, Badges & Dividers |
| **Warm Ivory** | `#FFFDF7` | `■` | Main App Background Canvas |
| **Soft Cream** | `#F7F1E5` | `■` | Secondary Cards & Chip Backgrounds |
| **Status Safe** | `#388E3C` | `■` | Safe Vihar Verification Badges |
| **Emergency Red** | `#BD2C2C` | `■` | SOS Triggers & Critical Alerts |

---

## 🗄️ PostgreSQL Database Schema (Supabase)

The backend is powered by 10 normalized PostgreSQL tables protected by **Row Level Security (RLS)**:

1. **`profiles`**: User details, phone numbers, emergency contacts, blood group, and language preferences.
2. **`roles` & `user_roles`**: RBAC permissions for `SEVAK`, `ADMIN`, and `SUPER_ADMIN`.
3. **`vihars`**: Origin, destination coordinates, planned route polylines, status (`PLANNED`, `ACTIVE`, `PAUSED`, `COMPLETED`), distance, and ETA.
4. **`vihar_locations`**: Breadcrumb GPS trajectory history (`lat`, `lng`, `speed`, `battery_pct`).
5. **`emergencies`**: SOS incident records (`MANUAL_SOS`, `DEVIATION`, `STATIONARY`).
6. **`emergency_attempts`**: Escalation logs tracking admin notifications and response times.
7. **`route_events`**: Milestones (checkpoints reached, rests taken, route deviations).
8. **`system_settings`**: Tunable thresholds (GPS interval, deviation distance, timeout mins).
9. **`audit_logs`**: Immutable security audit trail.

---

## 🛠️ Technology Stack

- **Framework**: [React Native 0.74.1](https://reactnative.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Local Storage**: [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- **Navigation**: [React Navigation (Native Stack + Bottom Tabs)](https://reactnavigation.org/)
- **Database & Realtime**: [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- **Authentication**: Firebase Phone Auth / Supabase Auth
- **Vector Graphics**: [React Native SVG](https://github.com/software-mansion/react-native-svg)
- **Native Toolchain**: Android Gradle Plugin 8.6.1, Gradle 8.7, OpenJDK 17, Android SDK 35

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 18.0.0`
- OpenJDK 17 (`JAVA_HOME`)
- Android SDK Platform 35 (`ANDROID_HOME`)
- Physical Android device connected via USB with **USB Debugging** enabled.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/vihar-setu.git
   cd vihar-setu
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Supabase project keys:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   GOOGLE_MAPS_API_KEY=your-google-maps-key
   ```

4. **Run on Android**:
   ```bash
   npm run android
   ```

5. **Start Metro Bundler**:
   ```bash
   npm run start
   ```

---

## 🧪 Demo Test Credentials

To test different role dashboards instantly without waiting for real SMS gateway delivery:

| Role | Test Phone | Verification OTP | Dashboard Unlocked |
|:---|:---:|:---:|:---|
| **Vihar Sevak** | `9876543210` | `123456` | Sevak 5-Tab Dashboard & Tracker |
| **Regional Admin** | `9876543211` | `123456` | Admin Telemetry & Control Center |
| **Super Admin** | `9876543212` | `123456` | Governance & System Config Suite |

---

## 🗺️ Project Roadmap

- [x] **Phase 1–5**: Core Architecture, Jain Design Tokens & Translations (GU, HI, EN).
- [x] **Phase 6–9**: Firebase Auth, Splash, Onboarding & Dynamic Role Navigator.
- [x] **Phase 10**: PostgreSQL 10-Table Schema with Row Level Security (RLS).
- [x] **Phase 11**: Profile Management System with Live Supabase Sync & Edit Modal.
- [ ] **Phase 12**: Vihar Creation & Route Planning (Google Directions API).
- [ ] **Phase 13**: Live Interactive Google Map with Polyline & Waypoints.
- [ ] **Phase 14**: Battery-Aware Background GPS Telemetry Engine.
- [ ] **Phase 15**: Multi-Tier SOS Emergency Escalation & Automated Fallback Calling.

---

## 📜 License & Dedication

This project is created with reverence for the Jain community under the **MIT License**.

> *“Parasparopagraho Jivanam” (परस्परोपग्रहो जीवानाम्) — Souls render service to one another.*
