# Jinaarya Vihar Setu (જિનાર્ય વિહાર સેતુ / विहार सेतु)
## Functional and Non-Functional Requirements
### Practical Implementation Version 2.0 (Structured Table Format)

---

### 📋 Academic Project & Metadata

| Metadata Field | Project Specification Details |
|:---|:---|
| **Academic Institution** | Uka Tarsadia University — Babu Madhav Institute of Information Technology (BMIIT) |
| **Course & Semester** | Master of Science in Information Technology — M.Sc.(IT) Semester 1 (Group No. 12) |
| **Project Guide** | **Mr. Hardik Vyas** |
| **Submitted By** | **Yugam Kothari** (Enrollment: `202604102510021`) & **Jainish Patel** (Enrollment: `202604102510028`) |
| **Application Title** | **Jinaarya Vihar Setu** (*Sacred Sadhviji Vihar Safety Telemetry & Real-Time Coordination Platform*) |
| **Backend Architecture** | Supabase Cloud (PostgreSQL 15+, Row-Level Security, Realtime WebSockets, Supabase Auth) |
| **Frontend Architecture** | React Native 0.74.1, Android SDK 35, Zustand State Management, React Navigation |

---

## 📌 Executive Summary & Scope

This version contains the requirements that are practical and directly relevant to the current Jinaarya Vihar Setu implementation. The system equips accompanying Vihar Sevikas with live background GPS telemetry, corridor deviation detection, stationary health checks, and a single-touch SOS emergency trigger, while providing regional administrators and super administrators with real-time tracking maps, emergency escalation consoles, and user request verification suites.

---

## 1. Functional Requirements

### FR-01: User Authentication & Account Management

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-01.1** | The system shall provide secure Email-based OTP authentication powered by Supabase Authentication. | User Authentication |
| **FR-01.2** | The system shall verify the 6-digit OTP and establish an authenticated session with JWT tokens. | User Authentication |
| **FR-01.3** | The system shall provide built-in demo/test credentials for instant evaluation across roles without SMS/Email delay. | Testing Support |
| **FR-01.4** | The system shall automatically determine the user's role (SEVAK, ADMIN, SUPER_ADMIN) upon login. | Role Management |
| **FR-01.5** | The system shall dynamically route authenticated users to their authorized role dashboard navigator. | Role-Based Dashboard |
| **FR-01.6** | The system shall register new Sevak users in a PENDING status awaiting administrative verification. | Account Management |
| **FR-01.7** | The system shall display a dedicated Pending Approval screen for unapproved Sevaks with real-time status sync. | Approval Workflow |
| **FR-01.8** | The system shall allow users to securely sign out and clear local cached session credentials. | Account Management |

---

### FR-02: User Profile Management

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-02.1** | The system shall allow Vihar Sevaks and Admins to manage their comprehensive profile information. | Profile Management |
| **FR-02.2** | The profile shall store Full Name, Email, Phone Number, Age, City, Area, Photo, Emergency Contact Name, Emergency Phone, Blood Group, Gender, and Preferred Language. | Profile Management |
| **FR-02.3** | The system shall provide an in-app Profile Edit modal with instant Supabase database synchronization. | Profile Management |
| **FR-02.4** | The profile screen shall provide a 1-Tap direct phone dialer action to contact the designated emergency person. | Emergency Contact |
| **FR-02.5** | The system shall enforce Row-Level Security so users can only view and edit their authorized profile records. | Privacy |

---

### FR-03: Language & Application Settings

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-03.1** | The system shall support complete native localization in English, Hindi and Gujarati. | Language Support |
| **FR-03.2** | Users shall be able to change the application language from settings at any time without reinstalling the application. | Language Settings |
| **FR-03.3** | All user interface elements, alert dialogs, prompts, and status badges shall instantly re-render in the selected language. | Language Support |
| **FR-03.4** | Push notifications and text-to-speech audio alerts shall use the user's selected language where supported. | Application Settings |

---

### FR-04: Vihar Session Management

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-04.1** | The system shall allow an approved Vihar Sevak to create and initiate a new Vihar journey. | Vihar Management |
| **FR-04.2** | The system shall collect Origin Name/Coords, Destination Name/Coords, Estimated Arrival Time, and Notes. | Vihar Details |
| **FR-04.3** | The system shall generate a unique UUID for every Vihar session and track its lifecycle (PLANNED, ACTIVE, COMPLETED, CANCELLED). | Vihar Management |
| **FR-04.4** | The system shall record precise start timestamps and automatically activate background GPS telemetry upon start. | Safety Monitoring |
| **FR-04.5** | The system shall allow the Sevak to complete the Vihar, recording final duration, distance, and completion timestamp. | Vihar Management |
| **FR-04.6** | The system shall preserve completed Vihar sessions as historical records. | Vihar History |

---

### FR-05: Route Planning

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-05.1** | The system shall allow the user to select or enter the source and destination via Jain Tirth/Upashray presets or custom coordinates. | Route Planning |
| **FR-05.2** | The system shall generate a planned route between the selected source and destination. | Route Planning |
| **FR-05.3** | The system shall calculate total planned distance (km) and estimated travel duration. | Route Information |
| **FR-05.4** | The system shall render the planned route corridor on the interactive map as the baseline for route-deviation monitoring. | Route Deviation |

---

### FR-06: Real-Time Location Tracking

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-06.1** | The system shall track the Vihar Sevak's location during an active Vihar collecting Latitude, Longitude, Speed, Heading, Accuracy, Timestamp, Battery Level and Network Status. | Live Tracking |
| **FR-06.2** | The system shall support background location tracking subject to device and Android operating-system restrictions. | Background Tracking |
| **FR-06.3** | The system shall use configurable and adaptive location-tracking intervals (default: 5s active, 30s power-save). | Battery Efficiency |
| **FR-06.4** | The system shall transmit authorized location records to the backend vihar_locations table. | Live Tracking |
| **FR-06.5** | The system shall automatically stop active Vihar location tracking when the Vihar session is completed. | Tracking Control |

---

### FR-07: Live Route & Journey Monitoring

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-07.1** | The system shall display the planned route and actual travelled path on the map. | Journey Monitoring |
| **FR-07.2** | The system shall continuously calculate and display remaining distance, elapsed time, current speed, and estimated arrival time. | Journey Monitoring |
| **FR-07.3** | The system shall display the current Vihar safety status (SAFE, WARNING, EMERGENCY, OFFLINE) on all active screens. | Safety Status |
| **FR-07.4** | The system shall update journey information in real-time as new location data is received. | Journey Monitoring |

---

### FR-08: Route Deviation Detection

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-08.1** | The system shall continuously compare the current location with the planned route corridor. | Route Deviation |
| **FR-08.2** | The system shall use a configurable deviation threshold (default: 50 meters). | Route Deviation |
| **FR-08.3** | When the deviation threshold is exceeded, the system shall generate a Level 1 warning with visual, vibration and audio feedback. | Deviation Warning |
| **FR-08.4** | The system shall monitor deviation duration and escalate to Level 2 if the deviation continues beyond the configured duration (default: 60s). | Deviation Escalation |
| **FR-08.5** | The system shall notify authorized administrators during Level 2 escalation. | Deviation Alert |
| **FR-08.6** | The system shall detect when the user returns to the planned route and automatically clear the warning. | Route Monitoring |
| **FR-08.7** | The system shall record route-deviation and recovery events in the route_events table. | Event Records |

---

### FR-09: Emergency & SOS

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-09.1** | The system shall provide a clearly accessible, pulsating SOS button during an active Vihar. | Emergency / SOS |
| **FR-09.2** | The system shall activate Emergency Mode immediately after a valid manual SOS trigger or critical condition. | Emergency Mode |
| **FR-09.3** | Emergency Mode shall display a prominent emergency interface and activate alarm and vibration functionality. | Emergency Alert |
| **FR-09.4** | The system shall create an emergency record in the Supabase emergencies table with precise coordinates and battery level. | Emergency Records |
| **FR-09.5** | The system shall execute a sequential Multi-Admin Escalation Engine (emergency_attempts table) notifying authorized administrators. | Emergency Notification |
| **FR-09.6** | If an administrator does not acknowledge within timeout (default: 45s), the system shall escalate to the next administrator. | Emergency Escalation |
| **FR-09.7** | The system shall provide an emergency resolution mechanism to acknowledge, resolve, or flag false alarms with mandatory resolution notes. | Emergency Management |

---

### FR-10: Stationary / Inactivity Monitoring

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-10.1** | The system shall monitor movement speed and displacement during an active Vihar. | Inactivity Monitoring |
| **FR-10.2** | The system shall detect configurable periods of unusual inactivity (default: 15 minutes of zero displacement). | Inactivity Monitoring |
| **FR-10.3** | When a stationary condition is detected, the system shall ask the Vihar Sevak to confirm whether she is safe. | Safety Confirmation |
| **FR-10.4** | The system shall allow the user to confirm safety (resets timer) or trigger immediate emergency assistance. | Safety Confirmation |
| **FR-10.5** | If the user does not respond within the configured timeout period (default: 120s), the system shall initiate safety escalation. | Safety Escalation |
| **FR-10.6** | The system shall log all safety check prompts, responses, and timestamps in the safety_checks table. | Event Records |

---

### FR-11: Battery Monitoring

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-11.1** | The system shall monitor device battery level and charging status during an active Vihar. | Battery Monitoring |
| **FR-11.2** | The system shall generate a low-battery warning at a configured threshold (default: 20%). | Battery Alert |
| **FR-11.3** | The system shall generate a critical battery alert at a configured threshold (default: 10%) and notify administrators. | Battery Notification |
| **FR-11.4** | The system shall dynamically throttle GPS update frequency in low-battery mode to conserve power. | Battery Efficiency |

---

### FR-12: Network & Offline Synchronization

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-12.1** | The system shall detect network connectivity status (ONLINE / OFFLINE). | Network Monitoring |
| **FR-12.2** | The application shall temporarily store tracking information locally (AsyncStorage/SQLite) when connectivity is unavailable. | Offline Storage |
| **FR-12.3** | The system shall synchronize locally stored information to Supabase when connectivity is restored in chronological order. | Data Synchronization |
| **FR-12.4** | The system shall prevent duplicate records during synchronization using unique identifiers. | Data Synchronization |
| **FR-12.5** | The system shall clearly inform the user when the device is operating offline. | Offline Status |

---

### FR-13: Sevak Home & Statistics Dashboard

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-13.1** | The system shall provide a personalized home dashboard with spiritual Jain greetings ('Jai Jinendra'). | User Dashboard |
| **FR-13.2** | The dashboard shall display live summary statistics cards: Total Completed Vihars and Total Distance Travelled. | Vihar Statistics |
| **FR-13.3** | The dashboard shall provide a prominent '+ START VIHAR' action card with journey setup navigation. | Vihar Management |
| **FR-13.4** | The dashboard shall display current safety status chips and safety guideline shortcuts. | Safety Status |

---

### FR-14: Administrator Dashboard & Live Monitoring

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-14.1** | The system shall provide a dedicated Administrator Dashboard for regional coordinators. | Admin Dashboard |
| **FR-14.2** | The dashboard shall display summary counts of active, safe, warning and emergency Vihars. | Admin Dashboard |
| **FR-14.3** | The administrator shall be able to monitor authorized active Vihars on an interactive live map with route breadcrumbs. | Live Monitoring |
| **FR-14.4** | The administrator shall be able to select an individual Vihar to inspect user profile, battery, speed, last ping, ETA and route. | Admin Monitoring |
| **FR-14.5** | The dashboard shall provide a 1-Tap direct cellular phone call action to contact active Sevaks or emergency contacts. | Admin Actions |
| **FR-14.6** | The administrator shall be able to manage emergency alerts: acknowledge, resolve, or flag false alarms. | Emergency Management |

---

### FR-15: Administrator Sevak Request & Verification Console

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-15.1** | The system shall provide a dedicated Sevak Request Management console (AdminRequestsScreen) for reviewing applicants. | User Management |
| **FR-15.2** | The request console shall support multi-tab filter views: PENDING, ACTIVE, REJECTED, and ALL. | User Management |
| **FR-15.3** | The administrator shall be able to inspect complete applicant details: Name, Phone, Email, Age, City, Area, Blood Group. | Profile Verification |
| **FR-15.4** | The administrator shall be able to approve pending Sevak accounts, activating full access immediately. | Account Approval |
| **FR-15.5** | The administrator shall be able to reject Sevak applications with mandatory custom rejection reason logging. | Account Rejection |
| **FR-15.6** | The console shall provide search and filter capabilities across applicant names, phone numbers, and cities. | Search & Filter |

---

### FR-16: Super Administrator Governance Suite

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-16.1** | The system shall provide a dedicated Super Administrator control suite for global system management. | Super Admin |
| **FR-16.2** | Super Administrators shall be able to manage user and administrator accounts, roles (SEVAK, ADMIN, SUPER_ADMIN), and permissions. | Role Management |
| **FR-16.3** | Super Administrators shall be able to configure system parameters: GPS update frequency, deviation thresholds, stationary timeout, battery thresholds, SOS timeout. | System Configuration |
| **FR-16.4** | The system shall maintain an immutable audit trail in audit_logs tracking all administrative actions with actor IDs and timestamps. | Audit Logs |

---

### FR-17: Notifications System

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-17.1** | The system shall provide push and in-app notifications for important Vihar lifecycle and safety events. | Notifications |
| **FR-17.2** | Notifications shall support route deviation, emergency, low battery, critical battery, stationary condition, Vihar start and completion. | Notifications |
| **FR-17.3** | Emergency notifications shall use high-priority mechanisms with distinctive sound and vibration where supported. | Emergency Notifications |
| **FR-17.4** | The system shall maintain a searchable alert history log in the Admin Alerts console. | Alert History |

---

### FR-18: Voice & Emergency Alerts

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-18.1** | The system shall provide text-to-speech voice prompts and chimes for hands-free warnings during walking Vihars. | Voice Alerts |
| **FR-18.2** | Voice alerts shall support Gujarati, Hindi and English where device speech services permit. | Voice Alerts |
| **FR-18.3** | The system shall provide distinct alert sounds and emit a high-decibel emergency siren upon SOS activation. | Emergency Alerts |

---

### FR-19: Vihar History & Analytics

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-19.1** | The system shall maintain a permanent, searchable historical log of completed Vihar sessions. | Vihar History |
| **FR-19.2** | Vihar Sevaks shall be able to view their own completed Vihar records including date, route, duration, and distance. | Vihar History |
| **FR-19.3** | Authorized administrators shall be able to inspect historical Vihars, telemetry breadcrumbs, route deviation events, and safety logs. | Vihar History |
| **FR-19.4** | The system shall aggregate cumulative telemetry metrics (total km, total sessions, total hours) for reporting. | Vihar Analytics |

---

### FR-20: Privacy & Access Control

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-20.1** | The system shall restrict location information and live telemetry exclusively to authorized users. | Privacy & Access Control |
| **FR-20.2** | A Vihar Sevak shall be able to view and manage her own private profile and journey information. | Privacy & Access Control |
| **FR-20.3** | Administrators shall only access users and Vihars they are authorized to monitor. | Privacy & Access Control |
| **FR-20.4** | Super Administrators shall have broader administrative permissions according to organizational policy. | Privacy & Access Control |
| **FR-20.5** | The system shall stop active Vihar location sharing immediately after the session ends. | Location Privacy |

---

### FR-21: Supabase Cloud Backend & Database

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **FR-21.1** | The system shall use Supabase Authentication for Email-based OTP authentication and JWT token management. | Supabase Backend |
| **FR-21.2** | The system shall use PostgreSQL 15+ for relational application data across normalized tables. | Database |
| **FR-21.3** | The system shall use Supabase Realtime WebSocket channels for authorized live Vihar monitoring and alert broadcasts. | Realtime Backend |
| **FR-21.4** | The system shall use Row Level Security (RLS) policies on all tables for database access control. | Database Security |
| **FR-21.5** | All client-server communications shall use secure TLS 1.3 encrypted transport without embedding server secrets in the mobile app. | Security |

---

## 2. Non-Functional Requirements

| Requirement No. | Description | Comment |
|:---:|:---|:---|
| **NFR-01** | The application shall provide responsive interaction for normal user operations. The system shall process and display live Vihar updates with low and acceptable latency under normal network conditions. Administrative dashboards shall update active Vihar information without unnecessary manual page refreshes. The system shall efficiently process location updates without causing excessive application resource consumption. | Performance |
| **NFR-02** | The system shall be designed for reliable operation during active Vihar sessions. Temporary network failures shall not unnecessarily terminate an active Vihar session. The system shall recover gracefully from temporary connectivity interruptions. Locally cached tracking data shall be recoverable and synchronized when connectivity is restored. | Reliability |
| **NFR-03** | The system shall use secure authentication mechanisms. All sensitive communication between the application and backend shall use secure encrypted transport. Database access shall be protected using Supabase Row Level Security. Users shall only be able to access resources permitted by their role. Administrative operations shall require appropriate authorization. Sensitive credentials and server-side secrets shall never be embedded in the mobile application. | Security |
| **NFR-04** | The system shall collect only information required for its intended functionality. Live location shall only be shared with authorized users. Location tracking shall be associated with an active Vihar session unless otherwise explicitly authorized. The system shall clearly indicate when location tracking is active. | Privacy |
| **NFR-05** | The system architecture shall support an increasing number of Vihar Sevaks and administrators without requiring fundamental architectural changes. The database shall be designed to efficiently handle increasing Vihar sessions and location records. The backend shall support concurrent active Vihar monitoring. | Scalability |
| **NFR-06** | The application shall minimize unnecessary GPS usage through configurable and adaptive tracking intervals (5s active, 30s power-save). The application shall avoid unnecessary background processing, limiting consumption to less than 5% per hour of walking. | Battery Efficiency |
| **NFR-07** | The application shall provide a simple and intuitive interface styled with authentic Jain spiritual color tokens. Critical functions such as SOS shall be accessible with minimal interaction. Important safety states shall be visually distinguishable. The application shall use readable typography and clear navigation. | Usability |
| **NFR-08** | The application shall use sufficiently readable text and controls (>48dp touch targets). Emergency controls shall have appropriate size and visual prominence. Important alerts shall use multiple communication methods where appropriate, including visual, audio and vibration. | Accessibility |
| **NFR-09** | The mobile application shall support compatible Android devices running Android 8.0 to Android 15 with required GPS, network and background-service capabilities. The application shall handle different screen sizes and device resolutions. | Compatibility |
| **NFR-10** | The application shall follow a modular architecture with clearly defined responsibilities between frontend, backend, and database components. Reusable components shall be used where appropriate. Configuration values shall be separated from application logic. | Maintainability |
| **NFR-11** | Vihar records shall maintain consistent relationships between users, sessions, locations and safety events. The system shall prevent unauthorized modification of historical records. Location records shall maintain timestamps and association with the correct Vihar. Synchronization mechanisms shall minimize duplicate or inconsistent records. | Data Integrity |
| **NFR-12** | The application shall handle temporary GPS failures gracefully. The application shall handle temporary network failures gracefully. The system shall indicate when location information becomes stale. The system shall not treat invalid or highly inaccurate GPS data as reliable location information. | Fault Tolerance |
| **NFR-13** | The application shall support English, Hindi and Gujarati. Text displayed through notifications and voice alerts shall use the user's selected language where supported. | Localization |
| **NFR-14** | Supabase automated daily database backups and Point-In-Time Recovery (PITR) shall ensure Recovery Point Objective (RPO) < 1 hour and Recovery Time Objective (RTO) < 2 hours. | Disaster Recovery |
| **NFR-15** | The application shall adhere to ethical consent standards for location tracking and applicable IT data security guidelines. | Compliance |

---

## 3. Removed / Future Requirements

| Excluded Feature / Module | Architectural Rationale for Exclusion |
|:---|:---|
| **Autonomous Multi-Agent AI Swarms** | Replaced with deterministic, fail-safe rule engines for route deviation and stationary detection to ensure 100% predictable safety. |
| **Predictive Weather AI Models** | Excluded in favor of standard weather API integration or manual advisory warnings to prevent false predictions. |
| **Wearable / Smartwatch Hardware Integration** | Smartwatch apps (WearOS/watchOS) are deferred to future enterprise releases; current focus is Android smartphones. |
| **Automated Telecom IVR Calling Gateway** | Direct cellular phone dialer linking (1-Tap Call) is used instead of paid cloud PBX / Twilio IVR gateways. |
| **Voice-Command Natural Language AI** | Replaced with simple, reliable one-touch buttons and standard localized audio speech prompts. |
| **Third-Party Volunteer Crowdsourcing** | Access is strictly restricted to verified Jain community Vihar Sevikas and authorized Regional Admins for maximum trust and privacy. |