import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def generate_all_tables_no_priority():
    fr_sections = [
        {
            "id": "FR-01",
            "title": "FR-01: User Authentication & Account Management",
            "rows": [
                ("FR-01.1", "The system shall provide secure Email-based OTP authentication powered by Supabase Authentication.", "User Authentication"),
                ("FR-01.2", "The system shall verify the 6-digit OTP and establish an authenticated session with JWT tokens.", "User Authentication"),
                ("FR-01.3", "The system shall provide built-in demo/test credentials for instant evaluation across roles without SMS/Email delay.", "Testing Support"),
                ("FR-01.4", "The system shall automatically determine the user's role (SEVAK, ADMIN, SUPER_ADMIN) upon login.", "Role Management"),
                ("FR-01.5", "The system shall dynamically route authenticated users to their authorized role dashboard navigator.", "Role-Based Dashboard"),
                ("FR-01.6", "The system shall register new Sevak users in a PENDING status awaiting administrative verification.", "Account Management"),
                ("FR-01.7", "The system shall display a dedicated Pending Approval screen for unapproved Sevaks with real-time status sync.", "Approval Workflow"),
                ("FR-01.8", "The system shall allow users to securely sign out and clear local cached session credentials.", "Account Management"),
            ]
        },
        {
            "id": "FR-02",
            "title": "FR-02: User Profile Management",
            "rows": [
                ("FR-02.1", "The system shall allow Vihar Sevaks and Admins to manage their comprehensive profile information.", "Profile Management"),
                ("FR-02.2", "The profile shall store Full Name, Email, Phone Number, Age, City, Area, Photo, Emergency Contact Name, Emergency Phone, Blood Group, Gender, and Preferred Language.", "Profile Management"),
                ("FR-02.3", "The system shall provide an in-app Profile Edit modal with instant Supabase database synchronization.", "Profile Management"),
                ("FR-02.4", "The profile screen shall provide a 1-Tap direct phone dialer action to contact the designated emergency person.", "Emergency Contact"),
                ("FR-02.5", "The system shall enforce Row-Level Security so users can only view and edit their authorized profile records.", "Privacy"),
            ]
        },
        {
            "id": "FR-03",
            "title": "FR-03: Language & Application Settings",
            "rows": [
                ("FR-03.1", "The system shall support complete native localization in English, Hindi and Gujarati.", "Language Support"),
                ("FR-03.2", "Users shall be able to change the application language from settings at any time without reinstalling the application.", "Language Settings"),
                ("FR-03.3", "All user interface elements, alert dialogs, prompts, and status badges shall instantly re-render in the selected language.", "Language Support"),
                ("FR-03.4", "Push notifications and text-to-speech audio alerts shall use the user's selected language where supported.", "Application Settings"),
            ]
        },
        {
            "id": "FR-04",
            "title": "FR-04: Vihar Session Management",
            "rows": [
                ("FR-04.1", "The system shall allow an approved Vihar Sevak to create and initiate a new Vihar journey.", "Vihar Management"),
                ("FR-04.2", "The system shall collect Origin Name/Coords, Destination Name/Coords, Estimated Arrival Time, and Notes.", "Vihar Details"),
                ("FR-04.3", "The system shall generate a unique UUID for every Vihar session and track its lifecycle (PLANNED, ACTIVE, COMPLETED, CANCELLED).", "Vihar Management"),
                ("FR-04.4", "The system shall record precise start timestamps and automatically activate background GPS telemetry upon start.", "Safety Monitoring"),
                ("FR-04.5", "The system shall allow the Sevak to complete the Vihar, recording final duration, distance, and completion timestamp.", "Vihar Management"),
                ("FR-04.6", "The system shall preserve completed Vihar sessions as historical records.", "Vihar History"),
            ]
        },
        {
            "id": "FR-05",
            "title": "FR-05: Route Planning",
            "rows": [
                ("FR-05.1", "The system shall allow the user to select or enter the source and destination via Jain Tirth/Upashray presets or custom coordinates.", "Route Planning"),
                ("FR-05.2", "The system shall generate a planned route between the selected source and destination.", "Route Planning"),
                ("FR-05.3", "The system shall calculate total planned distance (km) and estimated travel duration.", "Route Information"),
                ("FR-05.4", "The system shall render the planned route corridor on the interactive map as the baseline for route-deviation monitoring.", "Route Deviation"),
            ]
        },
        {
            "id": "FR-06",
            "title": "FR-06: Real-Time Location Tracking",
            "rows": [
                ("FR-06.1", "The system shall track the Vihar Sevak's location during an active Vihar collecting Latitude, Longitude, Speed, Heading, Accuracy, Timestamp, Battery Level and Network Status.", "Live Tracking"),
                ("FR-06.2", "The system shall support background location tracking subject to device and Android operating-system restrictions.", "Background Tracking"),
                ("FR-06.3", "The system shall use configurable and adaptive location-tracking intervals (default: 5s active, 30s power-save).", "Battery Efficiency"),
                ("FR-06.4", "The system shall transmit authorized location records to the backend vihar_locations table.", "Live Tracking"),
                ("FR-06.5", "The system shall automatically stop active Vihar location tracking when the Vihar session is completed.", "Tracking Control"),
            ]
        },
        {
            "id": "FR-07",
            "title": "FR-07: Live Route & Journey Monitoring",
            "rows": [
                ("FR-07.1", "The system shall display the planned route and actual travelled path on the map.", "Journey Monitoring"),
                ("FR-07.2", "The system shall continuously calculate and display remaining distance, elapsed time, current speed, and estimated arrival time.", "Journey Monitoring"),
                ("FR-07.3", "The system shall display the current Vihar safety status (SAFE, WARNING, EMERGENCY, OFFLINE) on all active screens.", "Safety Status"),
                ("FR-07.4", "The system shall update journey information in real-time as new location data is received.", "Journey Monitoring"),
            ]
        },
        {
            "id": "FR-08",
            "title": "FR-08: Route Deviation Detection",
            "rows": [
                ("FR-08.1", "The system shall continuously compare the current location with the planned route corridor.", "Route Deviation"),
                ("FR-08.2", "The system shall use a configurable deviation threshold (default: 50 meters).", "Route Deviation"),
                ("FR-08.3", "When the deviation threshold is exceeded, the system shall generate a Level 1 warning with visual, vibration and audio feedback.", "Deviation Warning"),
                ("FR-08.4", "The system shall monitor deviation duration and escalate to Level 2 if the deviation continues beyond the configured duration (default: 60s).", "Deviation Escalation"),
                ("FR-08.5", "The system shall notify authorized administrators during Level 2 escalation.", "Deviation Alert"),
                ("FR-08.6", "The system shall detect when the user returns to the planned route and automatically clear the warning.", "Route Monitoring"),
                ("FR-08.7", "The system shall record route-deviation and recovery events in the route_events table.", "Event Records"),
            ]
        },
        {
            "id": "FR-09",
            "title": "FR-09: Emergency & SOS",
            "rows": [
                ("FR-09.1", "The system shall provide a clearly accessible, pulsating SOS button during an active Vihar.", "Emergency / SOS"),
                ("FR-09.2", "The system shall activate Emergency Mode immediately after a valid manual SOS trigger or critical condition.", "Emergency Mode"),
                ("FR-09.3", "Emergency Mode shall display a prominent emergency interface and activate alarm and vibration functionality.", "Emergency Alert"),
                ("FR-09.4", "The system shall create an emergency record in the Supabase emergencies table with precise coordinates and battery level.", "Emergency Records"),
                ("FR-09.5", "The system shall execute a sequential Multi-Admin Escalation Engine (emergency_attempts table) notifying authorized administrators.", "Emergency Notification"),
                ("FR-09.6", "If an administrator does not acknowledge within timeout (default: 45s), the system shall escalate to the next administrator.", "Emergency Escalation"),
                ("FR-09.7", "The system shall provide an emergency resolution mechanism to acknowledge, resolve, or flag false alarms with mandatory resolution notes.", "Emergency Management"),
            ]
        },
        {
            "id": "FR-10",
            "title": "FR-10: Stationary / Inactivity Monitoring",
            "rows": [
                ("FR-10.1", "The system shall monitor movement speed and displacement during an active Vihar.", "Inactivity Monitoring"),
                ("FR-10.2", "The system shall detect configurable periods of unusual inactivity (default: 15 minutes of zero displacement).", "Inactivity Monitoring"),
                ("FR-10.3", "When a stationary condition is detected, the system shall ask the Vihar Sevak to confirm whether she is safe.", "Safety Confirmation"),
                ("FR-10.4", "The system shall allow the user to confirm safety (resets timer) or trigger immediate emergency assistance.", "Safety Confirmation"),
                ("FR-10.5", "If the user does not respond within the configured timeout period (default: 120s), the system shall initiate safety escalation.", "Safety Escalation"),
                ("FR-10.6", "The system shall log all safety check prompts, responses, and timestamps in the safety_checks table.", "Event Records"),
            ]
        },
        {
            "id": "FR-11",
            "title": "FR-11: Battery Monitoring",
            "rows": [
                ("FR-11.1", "The system shall monitor device battery level and charging status during an active Vihar.", "Battery Monitoring"),
                ("FR-11.2", "The system shall generate a low-battery warning at a configured threshold (default: 20%).", "Battery Alert"),
                ("FR-11.3", "The system shall generate a critical battery alert at a configured threshold (default: 10%) and notify administrators.", "Battery Notification"),
                ("FR-11.4", "The system shall dynamically throttle GPS update frequency in low-battery mode to conserve power.", "Battery Efficiency"),
            ]
        },
        {
            "id": "FR-12",
            "title": "FR-12: Network & Offline Synchronization",
            "rows": [
                ("FR-12.1", "The system shall detect network connectivity status (ONLINE / OFFLINE).", "Network Monitoring"),
                ("FR-12.2", "The application shall temporarily store tracking information locally (AsyncStorage/SQLite) when connectivity is unavailable.", "Offline Storage"),
                ("FR-12.3", "The system shall synchronize locally stored information to Supabase when connectivity is restored in chronological order.", "Data Synchronization"),
                ("FR-12.4", "The system shall prevent duplicate records during synchronization using unique identifiers.", "Data Synchronization"),
                ("FR-12.5", "The system shall clearly inform the user when the device is operating offline.", "Offline Status"),
            ]
        },
        {
            "id": "FR-13",
            "title": "FR-13: Sevak Home & Statistics Dashboard",
            "rows": [
                ("FR-13.1", "The system shall provide a personalized home dashboard with spiritual Jain greetings ('Jai Jinendra').", "User Dashboard"),
                ("FR-13.2", "The dashboard shall display live summary statistics cards: Total Completed Vihars and Total Distance Travelled.", "Vihar Statistics"),
                ("FR-13.3", "The dashboard shall provide a prominent '+ START VIHAR' action card with journey setup navigation.", "Vihar Management"),
                ("FR-13.4", "The dashboard shall display current safety status chips and safety guideline shortcuts.", "Safety Status"),
            ]
        },
        {
            "id": "FR-14",
            "title": "FR-14: Administrator Dashboard & Live Monitoring",
            "rows": [
                ("FR-14.1", "The system shall provide a dedicated Administrator Dashboard for regional coordinators.", "Admin Dashboard"),
                ("FR-14.2", "The dashboard shall display summary counts of active, safe, warning and emergency Vihars.", "Admin Dashboard"),
                ("FR-14.3", "The administrator shall be able to monitor authorized active Vihars on an interactive live map with route breadcrumbs.", "Live Monitoring"),
                ("FR-14.4", "The administrator shall be able to select an individual Vihar to inspect user profile, battery, speed, last ping, ETA and route.", "Admin Monitoring"),
                ("FR-14.5", "The dashboard shall provide a 1-Tap direct cellular phone call action to contact active Sevaks or emergency contacts.", "Admin Actions"),
                ("FR-14.6", "The administrator shall be able to manage emergency alerts: acknowledge, resolve, or flag false alarms.", "Emergency Management"),
            ]
        },
        {
            "id": "FR-15",
            "title": "FR-15: Administrator Sevak Request & Verification Console",
            "rows": [
                ("FR-15.1", "The system shall provide a dedicated Sevak Request Management console (AdminRequestsScreen) for reviewing applicants.", "User Management"),
                ("FR-15.2", "The request console shall support multi-tab filter views: PENDING, ACTIVE, REJECTED, and ALL.", "User Management"),
                ("FR-15.3", "The administrator shall be able to inspect complete applicant details: Name, Phone, Email, Age, City, Area, Blood Group.", "Profile Verification"),
                ("FR-15.4", "The administrator shall be able to approve pending Sevak accounts, activating full access immediately.", "Account Approval"),
                ("FR-15.5", "The administrator shall be able to reject Sevak applications with mandatory custom rejection reason logging.", "Account Rejection"),
                ("FR-15.6", "The console shall provide search and filter capabilities across applicant names, phone numbers, and cities.", "Search & Filter"),
            ]
        },
        {
            "id": "FR-16",
            "title": "FR-16: Super Administrator Governance Suite",
            "rows": [
                ("FR-16.1", "The system shall provide a dedicated Super Administrator control suite for global system management.", "Super Admin"),
                ("FR-16.2", "Super Administrators shall be able to manage user and administrator accounts, roles (SEVAK, ADMIN, SUPER_ADMIN), and permissions.", "Role Management"),
                ("FR-16.3", "Super Administrators shall be able to configure system parameters: GPS update frequency, deviation thresholds, stationary timeout, battery thresholds, SOS timeout.", "System Configuration"),
                ("FR-16.4", "The system shall maintain an immutable audit trail in audit_logs tracking all administrative actions with actor IDs and timestamps.", "Audit Logs"),
            ]
        },
        {
            "id": "FR-17",
            "title": "FR-17: Notifications System",
            "rows": [
                ("FR-17.1", "The system shall provide push and in-app notifications for important Vihar lifecycle and safety events.", "Notifications"),
                ("FR-17.2", "Notifications shall support route deviation, emergency, low battery, critical battery, stationary condition, Vihar start and completion.", "Notifications"),
                ("FR-17.3", "Emergency notifications shall use high-priority mechanisms with distinctive sound and vibration where supported.", "Emergency Notifications"),
                ("FR-17.4", "The system shall maintain a searchable alert history log in the Admin Alerts console.", "Alert History"),
            ]
        },
        {
            "id": "FR-18",
            "title": "FR-18: Voice & Emergency Alerts",
            "rows": [
                ("FR-18.1", "The system shall provide text-to-speech voice prompts and chimes for hands-free warnings during walking Vihars.", "Voice Alerts"),
                ("FR-18.2", "Voice alerts shall support Gujarati, Hindi and English where device speech services permit.", "Voice Alerts"),
                ("FR-18.3", "The system shall provide distinct alert sounds and emit a high-decibel emergency siren upon SOS activation.", "Emergency Alerts"),
            ]
        },
        {
            "id": "FR-19",
            "title": "FR-19: Vihar History & Analytics",
            "rows": [
                ("FR-19.1", "The system shall maintain a permanent, searchable historical log of completed Vihar sessions.", "Vihar History"),
                ("FR-19.2", "Vihar Sevaks shall be able to view their own completed Vihar records including date, route, duration, and distance.", "Vihar History"),
                ("FR-19.3", "Authorized administrators shall be able to inspect historical Vihars, telemetry breadcrumbs, route deviation events, and safety logs.", "Vihar History"),
                ("FR-19.4", "The system shall aggregate cumulative telemetry metrics (total km, total sessions, total hours) for reporting.", "Vihar Analytics"),
            ]
        },
        {
            "id": "FR-20",
            "title": "FR-20: Privacy & Access Control",
            "rows": [
                ("FR-20.1", "The system shall restrict location information and live telemetry exclusively to authorized users.", "Privacy & Access Control"),
                ("FR-20.2", "A Vihar Sevak shall be able to view and manage her own private profile and journey information.", "Privacy & Access Control"),
                ("FR-20.3", "Administrators shall only access users and Vihars they are authorized to monitor.", "Privacy & Access Control"),
                ("FR-20.4", "Super Administrators shall have broader administrative permissions according to organizational policy.", "Privacy & Access Control"),
                ("FR-20.5", "The system shall stop active Vihar location sharing immediately after the session ends.", "Location Privacy"),
            ]
        },
        {
            "id": "FR-21",
            "title": "FR-21: Supabase Cloud Backend & Database",
            "rows": [
                ("FR-21.1", "The system shall use Supabase Authentication for Email-based OTP authentication and JWT token management.", "Supabase Backend"),
                ("FR-21.2", "The system shall use PostgreSQL 15+ for relational application data across normalized tables.", "Database"),
                ("FR-21.3", "The system shall use Supabase Realtime WebSocket channels for authorized live Vihar monitoring and alert broadcasts.", "Realtime Backend"),
                ("FR-21.4", "The system shall use Row Level Security (RLS) policies on all tables for database access control.", "Database Security"),
                ("FR-21.5", "All client-server communications shall use secure TLS 1.3 encrypted transport without embedding server secrets in the mobile app.", "Security"),
            ]
        }
    ]

    nfr_rows = [
        ("NFR-01", "Performance", "The application shall provide responsive interaction for normal user operations. The system shall process and display live Vihar updates with low and acceptable latency under normal network conditions. Administrative dashboards shall update active Vihar information without unnecessary manual page refreshes. The system shall efficiently process location updates without causing excessive application resource consumption.", "Performance"),
        ("NFR-02", "Availability & Reliability", "The system shall be designed for reliable operation during active Vihar sessions. Temporary network failures shall not unnecessarily terminate an active Vihar session. The system shall recover gracefully from temporary connectivity interruptions. Locally cached tracking data shall be recoverable and synchronized when connectivity is restored.", "Reliability"),
        ("NFR-03", "Security", "The system shall use secure authentication mechanisms. All sensitive communication between the application and backend shall use secure encrypted transport. Database access shall be protected using Supabase Row Level Security. Users shall only be able to access resources permitted by their role. Administrative operations shall require appropriate authorization. Sensitive credentials and server-side secrets shall never be embedded in the mobile application.", "Security"),
        ("NFR-04", "Privacy", "The system shall collect only information required for its intended functionality. Live location shall only be shared with authorized users. Location tracking shall be associated with an active Vihar session unless otherwise explicitly authorized. The system shall clearly indicate when location tracking is active.", "Privacy"),
        ("NFR-05", "Scalability", "The system architecture shall support an increasing number of Vihar Sevaks and administrators without requiring fundamental architectural changes. The database shall be designed to efficiently handle increasing Vihar sessions and location records. The backend shall support concurrent active Vihar monitoring.", "Scalability"),
        ("NFR-06", "Battery Efficiency", "The application shall minimize unnecessary GPS usage through configurable and adaptive tracking intervals (5s active, 30s power-save). The application shall avoid unnecessary background processing, limiting consumption to less than 5% per hour of walking.", "Battery Efficiency"),
        ("NFR-07", "Usability", "The application shall provide a simple and intuitive interface styled with authentic Jain spiritual color tokens. Critical functions such as SOS shall be accessible with minimal interaction. Important safety states shall be visually distinguishable. The application shall use readable typography and clear navigation.", "Usability"),
        ("NFR-08", "Accessibility", "The application shall use sufficiently readable text and controls (>48dp touch targets). Emergency controls shall have appropriate size and visual prominence. Important alerts shall use multiple communication methods where appropriate, including visual, audio and vibration.", "Accessibility"),
        ("NFR-09", "Compatibility", "The mobile application shall support compatible Android devices running Android 8.0 to Android 15 with required GPS, network and background-service capabilities. The application shall handle different screen sizes and device resolutions.", "Compatibility"),
        ("NFR-10", "Maintainability", "The application shall follow a modular architecture with clearly defined responsibilities between frontend, backend, and database components. Reusable components shall be used where appropriate. Configuration values shall be separated from application logic.", "Maintainability"),
        ("NFR-11", "Data Integrity", "Vihar records shall maintain consistent relationships between users, sessions, locations and safety events. The system shall prevent unauthorized modification of historical records. Location records shall maintain timestamps and association with the correct Vihar. Synchronization mechanisms shall minimize duplicate or inconsistent records.", "Data Integrity"),
        ("NFR-12", "Fault Tolerance", "The application shall handle temporary GPS failures gracefully. The application shall handle temporary network failures gracefully. The system shall indicate when location information becomes stale. The system shall not treat invalid or highly inaccurate GPS data as reliable location information.", "Fault Tolerance"),
        ("NFR-13", "Localization", "The application shall support English, Hindi and Gujarati. Text displayed through notifications and voice alerts shall use the user's selected language where supported.", "Localization"),
        ("NFR-14", "Disaster Recovery", "Supabase automated daily database backups and Point-In-Time Recovery (PITR) shall ensure Recovery Point Objective (RPO) < 1 hour and Recovery Time Objective (RTO) < 2 hours.", "Disaster Recovery"),
        ("NFR-15", "Legal & Compliance", "The application shall adhere to ethical consent standards for location tracking and applicable IT data security guidelines.", "Compliance")
    ]

    # -------------------------------------------------------------
    # 1. GENERATE MARKDOWN (docs/SRS_Functional_Non_Functional_Requirements.md)
    # -------------------------------------------------------------
    md_lines = []
    md_lines.append("# Jinaarya Vihar Setu (જિનાર્ય વિહાર સેતુ / विहार सेतु)")
    md_lines.append("## Functional and Non-Functional Requirements")
    md_lines.append("### Practical Implementation Version 2.0 (Structured Table Format)\n")
    md_lines.append("---\n")
    md_lines.append("### 📋 Academic Project & Metadata\n")
    md_lines.append("| Metadata Field | Project Specification Details |")
    md_lines.append("|:---|:---|")
    md_lines.append("| **Academic Institution** | Uka Tarsadia University — Babu Madhav Institute of Information Technology (BMIIT) |")
    md_lines.append("| **Course & Semester** | Master of Science in Information Technology — M.Sc.(IT) Semester 1 (Group No. 12) |")
    md_lines.append("| **Project Guide** | **Mr. Hardik Vyas** |")
    md_lines.append("| **Submitted By** | **Yugam Kothari** (Enrollment: `202604102510021`) & **Jainish Patel** (Enrollment: `202604102510028`) |")
    md_lines.append("| **Application Title** | **Jinaarya Vihar Setu** (*Sacred Sadhviji Vihar Safety Telemetry & Real-Time Coordination Platform*) |")
    md_lines.append("| **Backend Architecture** | Supabase Cloud (PostgreSQL 15+, Row-Level Security, Realtime WebSockets, Supabase Auth) |")
    md_lines.append("| **Frontend Architecture** | React Native 0.74.1, Android SDK 35, Zustand State Management, React Navigation |\n")
    md_lines.append("---\n")
    md_lines.append("## 📌 Executive Summary & Scope\n")
    md_lines.append(
        "This version contains the requirements that are practical and directly relevant to the current Jinaarya Vihar Setu implementation. "
        "The system equips accompanying Vihar Sevikas with live background GPS telemetry, corridor deviation detection, stationary health checks, and a single-touch SOS emergency trigger, "
        "while providing regional administrators and super administrators with real-time tracking maps, emergency escalation consoles, and user request verification suites.\n"
    )
    md_lines.append("---\n")
    md_lines.append("## 1. Functional Requirements\n")

    for section in fr_sections:
        md_lines.append(f"### {section['title']}\n")
        md_lines.append("| Requirement No. | Description | Comment |")
        md_lines.append("|:---:|:---|:---|")
        for row in section["rows"]:
            md_lines.append(f"| **{row[0]}** | {row[1]} | {row[2]} |")
        md_lines.append("\n---\n")

    md_lines.append("## 2. Non-Functional Requirements\n")
    md_lines.append("| Requirement No. | Description | Comment |")
    md_lines.append("|:---:|:---|:---|")
    for row in nfr_rows:
        md_lines.append(f"| **{row[0]}** | {row[2]} | {row[3]} |")
    md_lines.append("\n---\n")

    md_lines.append("## 3. Removed / Future Requirements\n")
    md_lines.append("| Excluded Feature / Module | Architectural Rationale for Exclusion |")
    md_lines.append("|:---|:---|")
    md_lines.append("| **Autonomous Multi-Agent AI Swarms** | Replaced with deterministic, fail-safe rule engines for route deviation and stationary detection to ensure 100% predictable safety. |")
    md_lines.append("| **Predictive Weather AI Models** | Excluded in favor of standard weather API integration or manual advisory warnings to prevent false predictions. |")
    md_lines.append("| **Wearable / Smartwatch Hardware Integration** | Smartwatch apps (WearOS/watchOS) are deferred to future enterprise releases; current focus is Android smartphones. |")
    md_lines.append("| **Automated Telecom IVR Calling Gateway** | Direct cellular phone dialer linking (1-Tap Call) is used instead of paid cloud PBX / Twilio IVR gateways. |")
    md_lines.append("| **Voice-Command Natural Language AI** | Replaced with simple, reliable one-touch buttons and standard localized audio speech prompts. |")
    md_lines.append("| **Third-Party Volunteer Crowdsourcing** | Access is strictly restricted to verified Jain community Vihar Sevikas and authorized Regional Admins for maximum trust and privacy. |")

    md_file_path = r"s:\Master's\Jinaarya Vihar seva\Jinaarya Vihar seva\docs\SRS_Functional_Non_Functional_Requirements.md"
    os.makedirs(os.path.dirname(md_file_path), exist_ok=True)
    with open(md_file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"Markdown file written: {md_file_path}")

    # -------------------------------------------------------------
    # 2. GENERATE WORD (.DOCX) DOCUMENT
    # -------------------------------------------------------------
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.75)
        s.bottom_margin = Inches(0.75)
        s.left_margin = Inches(0.75)
        s.right_margin = Inches(0.75)

    MAROON_HEX = "641C2D"
    SAFFRON_HEX = "D98A2B"
    CREAM_HEX = "F7F1E5"
    IVORY_HEX = "FFFDF7"
    BORDER_HEX = "CBD5E0"

    MAROON = RGBColor(0x64, 0x1C, 0x2D)
    SAFFRON = RGBColor(0xD9, 0x8A, 0x2B)
    CHARCOAL = RGBColor(0x2D, 0x37, 0x48)

    def set_cell_background(cell, fill_hex):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    def set_cell_margins(cell, top=100, bottom=100, left=130, right=130):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def set_table_borders(table, color_hex="CBD5E0"):
        tblPr = table._tbl.tblPr
        tblBorders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
            f'<w:left w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
            f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
            f'<w:right w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
            f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
            f'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(tblBorders)

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = MAROON
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(11)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(11.5)
        run.font.bold = True
        run.font.color.rgb = SAFFRON
        return p

    def add_body_p(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(9.5)
        run.font.color.rgb = CHARCOAL
        return p

    def build_docx_table(headers, rows, col_widths=[1.2, 4.3, 1.5]):
        table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(table, BORDER_HEX)

        # Header
        hdr_cells = table.rows[0].cells
        for i, title in enumerate(headers):
            hdr_cells[i].text = title
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i == 0 else WD_ALIGN_PARAGRAPH.LEFT
            r = p.runs[0]
            r.font.name = 'Calibri'
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            set_cell_background(hdr_cells[i], MAROON_HEX)
            set_cell_margins(hdr_cells[i], 90, 90, 110, 110)

        # Rows
        for r_idx, row_data in enumerate(rows):
            row_cells = table.rows[r_idx + 1].cells
            bg_color = CREAM_HEX if r_idx % 2 == 1 else IVORY_HEX
            for c_idx, val in enumerate(row_data):
                row_cells[c_idx].text = val
                p = row_cells[c_idx].paragraphs[0]
                if c_idx == 0:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                if len(p.runs) > 0:
                    r = p.runs[0]
                    r.font.name = 'Calibri'
                    r.font.size = Pt(9)
                    if c_idx == 0:
                        r.font.bold = True
                        r.font.color.rgb = MAROON
                    else:
                        r.font.color.rgb = CHARCOAL
                set_cell_background(row_cells[c_idx], bg_color)
                set_cell_margins(row_cells[c_idx], 70, 70, 100, 100)

        # Widths
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)

        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Document Title
    t_p = doc.add_paragraph()
    t_p.paragraph_format.space_before = Pt(0)
    t_p.paragraph_format.space_after = Pt(2)
    t_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t = t_p.add_run("Jinaarya Vihar Setu (જિનાર્ય વિહાર સેતુ / विहार सेतु)")
    r_t.font.name = 'Calibri'
    r_t.font.size = Pt(18)
    r_t.font.bold = True
    r_t.font.color.rgb = MAROON

    s_p = doc.add_paragraph()
    s_p.paragraph_format.space_before = Pt(0)
    s_p.paragraph_format.space_after = Pt(10)
    s_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = s_p.add_run("Functional and Non-Functional Requirements\nPractical Implementation Version 2.0")
    r_s.font.name = 'Calibri'
    r_s.font.size = Pt(11.5)
    r_s.font.bold = True
    r_s.font.color.rgb = SAFFRON

    # Metadata Academic Table
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, BORDER_HEX)
    meta_rows = [
        ("Academic Institution", "Uka Tarsadia University — Babu Madhav Institute of Information Technology (BMIIT)"),
        ("Course & Project Semester", "M.Sc. (IT) / Master's Program — Semester 1 (Group No. 12)"),
        ("Project Guide", "Mr. Hardik Vyas"),
        ("Submitted By (Students)", "Yugam Kothari (Enrollment: 202604102510021) & Jainish Patel (Enrollment: 202604102510028)"),
        ("Target Application", "Sacred Sadhviji Vihar Safety Telemetry, Emergency Escalation & Admin Coordination Platform")
    ]
    for idx, (k, v) in enumerate(meta_rows):
        c0 = meta_table.cell(idx, 0)
        c1 = meta_table.cell(idx, 1)
        c0.text = k
        c1.text = v
        c0.paragraphs[0].runs[0].font.name = 'Calibri'
        c0.paragraphs[0].runs[0].font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(9)
        c0.paragraphs[0].runs[0].font.color.rgb = MAROON
        c1.paragraphs[0].runs[0].font.name = 'Calibri'
        c1.paragraphs[0].runs[0].font.size = Pt(9)
        c1.paragraphs[0].runs[0].font.color.rgb = CHARCOAL
        set_cell_background(c0, CREAM_HEX)
        set_cell_background(c1, IVORY_HEX)
        set_cell_margins(c0, 60, 60, 90, 90)
        set_cell_margins(c1, 60, 60, 90, 90)
        c0.width = Inches(2.0)
        c1.width = Inches(5.0)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Executive Overview
    add_heading_1("Executive Summary & Project Scope")
    add_body_p(
        "This version contains the requirements that are practical and directly relevant to the current Jinaarya Vihar Setu implementation. "
        "The system equips accompanying Vihar Sevikas with live background GPS telemetry, corridor deviation detection, stationary health checks, and a single-touch SOS emergency trigger, "
        "while providing regional administrators and super administrators with real-time tracking maps, emergency escalation consoles, and user request verification suites."
    )

    # FR Tables
    add_heading_1("1. Functional Requirements")
    for section in fr_sections:
        add_heading_2(section["title"])
        build_docx_table(["Requirement No.", "Description", "Comment"], section["rows"], [1.2, 4.3, 1.5])

    # NFR Tables
    add_heading_1("2. Non-Functional Requirements")
    nfr_table_rows = [(r[0], r[2], r[3]) for r in nfr_rows]
    build_docx_table(["Requirement No.", "Description", "Comment"], nfr_table_rows, [1.2, 4.3, 1.5])

    # Exclusions Table
    add_heading_1("3. Removed / Future Requirements")
    add_body_p(
        "The following were intentionally excluded from this practical implementation document: Multi-Agent AI, Predictive Intelligence, "
        "automatic multi-administrator calling/escalation over paid PBX, wearable/smartwatch integration, voice-command natural language control, "
        "community volunteer crowdsourcing, and other advanced infrastructure requirements not necessary for the current implementation."
    )
    excluded_rows = [
        ("Autonomous Multi-Agent AI Swarms", "Deterministic rule engines used for 100% predictable safety."),
        ("Predictive Weather AI Models", "Standard weather APIs and manual advisories used instead of experimental models."),
        ("Wearable / Smartwatch Integration", "Deferred to future enterprise releases; current focus is Android smartphones."),
        ("Automated Telecom IVR Calling Gateway", "Direct cellular phone dialer linking (1-Tap Call) used without paid PBX gateways."),
        ("Voice-Command Natural Language AI", "Replaced with reliable 1-touch emergency buttons and localized audio speech alerts."),
        ("Third-Party Volunteer Crowdsourcing", "Access restricted to verified Jain community Sevikas and Regional Admins for trust and privacy.")
    ]
    build_docx_table(["Excluded Module / Feature", "Architectural Rationale for Exclusion"], excluded_rows, [2.5, 4.5])

    # Save only to Final Word Document
    final_path = r"s:\Master's\Jinaarya Vihar seva\Jinaarya Vihar seva\Jinaarya_Vihar_Setu_Requirements_Final.docx"
    doc.save(final_path)
    print(f"Final Word file saved successfully: {final_path}")

if __name__ == "__main__":
    generate_all_tables_no_priority()
