// Old Prompt 

You are a Senior Full-Stack Mobile Application Developer, React Native Expert, JavaScript Architect, Supabase/PostgreSQL Expert, GIS/Maps Engineer, Real-Time Systems Engineer, Security Engineer, AI Architect, UI/UX Designer and Software Documentation Expert.

Your task is to design and build a complete production-ready Android mobile application named:

JINAARYA VIHAR SETU

The application is developed for the Jinaarya Vihar Seva group and is intended to improve the safety, monitoring and assistance of women accompanying Jain Sadhvijis during Vihar.

IMPORTANT:

Do not create a simple demo application.

Build the system as a real-world scalable application with proper architecture, database design, security, real-time communication, background location tracking, emergency handling, administrator monitoring, reporting and future AI integration.

The application must be developed STEP BY STEP from the beginning until final APK generation.

Do not skip architectural, database, security, testing or deployment steps.

==================================================
1. TECHNOLOGY STACK
==================================================

Frontend:

React Native
JavaScript
Modern React Native architecture
Functional Components
React Hooks

Backend:

Supabase

Database:

Supabase PostgreSQL

Authentication:

Supabase Phone Number OTP Authentication

Realtime:

Supabase Realtime

Storage:

Supabase Storage

Server-side:

Supabase Edge Functions

Maps:

Google Maps SDK
Google Directions API
Google Places API

Location:

React Native compatible GPS/location library
Background location tracking
Foreground/background location permissions
Battery-aware location tracking

Notifications:

Push notification architecture compatible with Supabase Edge Functions and Android notification services.

State Management:

Use a scalable state-management solution such as Zustand or Redux Toolkit.

Architecture:

Clean Architecture
MVVM-inspired separation
Repository Pattern
Service Layer
Feature-based modular structure

Navigation:

React Navigation

Forms:

React Hook Form where appropriate

Validation:

Schema-based validation where appropriate

Charts:

Use a reliable React Native chart library for analytics.

Language:

English
Hindi
Gujarati

==================================================
2. APPLICATION NAME
==================================================

Official application name:

Jinaarya Vihar Setu

Parent/group:

Jinaarya Vihar Seva

The application should visually communicate:

Safety
Trust
Spirituality
Human assistance
Technology
Reliability
Peace

Avoid making the UI look like a generic GPS tracker.

==================================================
3. PREMIUM DESIGN SYSTEM
==================================================

Create a premium Jain-inspired visual design.

Do NOT use excessive bright colors.

The interface should feel:

Premium
Calm
Spiritual
Modern
Trustworthy
Minimal
Professional

Primary colors:

Deep Maroon:
#641C2D

Saffron:
#D98A2B

Premium Gold:
#C9A44C

Warm Ivory:
#FFFDF7

Soft Cream:
#F7F1E5

Deep Text:
#2B2020

Secondary Green for SAFE:
#2E7D5B

Warning Amber:
#D99A24

Emergency Red:
#B83232

Dark Mode:

Background:
#151112

Surface:
#21191B

Primary:
#D98A2B

Gold:
#C9A44C

Text:
#FFF8ED

Use gold primarily for:

Important icons
Borders
Highlights
Statistics
Premium accents

Use saffron for:

Primary buttons
Active navigation
Important actions

Use maroon for:

Headers
Navigation
Strong branding

Use green/yellow/red only for safety status.

Do not use gradients everywhere.

Use subtle rounded cards, clean spacing, premium typography and clear hierarchy.

==================================================
4. APPLICATION ROLES
==================================================

Implement:

1. Vihar Sevak
2. Administrator
3. Super Administrator

Role must be stored securely in the backend.

Never trust a role supplied by the mobile client.

Roles must be verified using Supabase database policies and backend logic.

==================================================
5. AUTHENTICATION
==================================================

Implement:

Phone number entry
OTP request
OTP verification
Session creation
Session persistence
Logout
Session expiration handling
Unauthorized access handling

After authentication:

Determine user role from secure database information.

If Vihar Sevak:

Open Vihar Sevak Dashboard.

If Administrator:

Open Administrator Dashboard.

If Super Administrator:

Open Super Administrator Dashboard.

Do not hardcode administrator phone numbers into the application.

Create proper database-based role management.

==================================================
6. USER PROFILE
==================================================

Create profile management.

Fields:

Full Name
Phone Number
City
Profile Photo
Emergency Contact
Blood Group
Gender
Preferred Language
Account Status
Created Date
Updated Date

Allow:

View Profile
Edit Profile
Upload Photo
Change Language
Update Emergency Contact
Update personal information

Profile image must be stored in Supabase Storage.

==================================================
7. VIHAR CREATION
==================================================

Vihar Sevak Dashboard must contain:

Start Vihar
Active Vihar
History
SOS
Profile
Settings

When Start Vihar is selected:

Show:

Source
Destination
Expected Arrival Time
Optional Notes

Allow source and destination selection through map/search.

Display:

Route preview
Distance
Estimated duration

Before starting:

Ask for confirmation.

After confirmation:

Create a unique Vihar session.

==================================================
8. VIHAR SESSION DATABASE
==================================================

Create proper database entities for:

users
roles
vihars
vihar_locations
routes
route_events
emergencies
emergency_attempts
notifications
device_status
audit_logs
system_settings
admin_permissions

Use:

Primary keys
Foreign keys
Indexes
Constraints
Timestamps
Soft-delete/status fields where required

Design the schema professionally.

==================================================
9. LIVE LOCATION TRACKING
==================================================

When Vihar starts:

Start location tracking.

Capture:

Latitude
Longitude
Speed
Heading
GPS Accuracy
Altitude where available
Battery Percentage
Network Status
Timestamp

Location frequency must be configurable.

Default:

5 seconds while active, subject to battery/device limitations.

Do NOT blindly write every GPS point to the database if this causes excessive load.

Implement an efficient location batching/synchronization strategy where appropriate.

==================================================
10. BACKGROUND LOCATION
==================================================

Location tracking should continue when:

Application is minimized
Screen is locked
Application runs in background

Subject to:

Android permissions
Battery optimization
Device restrictions
OS limitations

Implement:

Foreground service where required
Background location permissions
Permission explanation screens
Tracking status indicator

Show:

GPS Active
GPS Disabled
Permission Required
Poor Accuracy

==================================================
11. OFFLINE MODE
==================================================

The application must continue safely during temporary internet loss.

When offline:

Store important location records locally.

Maintain:

Pending synchronization queue
Timestamp
Sync status

When internet returns:

Automatically synchronize pending records.

Avoid:

Duplicate records
Lost records
Incorrect timestamps

Show synchronization status to the user where useful.

==================================================
12. MAP AND ROUTE
==================================================

Implement Google Maps.

Display:

Current location
Source
Destination
Planned route
Actual travelled route

Show:

Distance remaining
Estimated arrival time
Current speed

Use Directions API for route generation.

Use Places API for relevant place searching.

Keep API keys secure.

Never expose unrestricted server credentials.

==================================================
13. ROUTE DEVIATION ENGINE
==================================================

Implement route monitoring.

Compare:

Current GPS location

against:

Planned route.

Create configurable:

Deviation distance threshold
Deviation duration

Example:

Threshold = 50 meters

When exceeded:

LEVEL 1

Show:

Voice alert
Vibration
Alarm
Visual warning

Message:

"You are moving away from your Vihar route. Please return to the planned route."

Continue monitoring.

If the user returns:

Cancel warning.

If deviation continues:

LEVEL 2

Notify all authorized administrators.

Update user status:

WARNING

Record:

Deviation start
Deviation end
Distance
Duration
Location
Timestamp

==================================================
14. SAFETY STATUS
==================================================

Every active Vihar should have a status:

SAFE
WARNING
EMERGENCY
OFFLINE
COMPLETED

Dashboard indicators:

Green = SAFE
Yellow/Amber = WARNING
Red = EMERGENCY
Grey = OFFLINE

Status must be updated in real time.

==================================================
15. SOS SYSTEM
==================================================

Provide a large, highly visible SOS button.

Avoid accidental activation.

Use confirmation where appropriate but do not make emergency activation unnecessarily difficult.

When SOS activates:

Create emergency record.

Set status:

EMERGENCY

Activate:

Emergency screen
Alarm
Vibration
Voice alert
Live location sharing

Notify authorized administrators.

Message:

"Emergency Alert. A Vihar Sevika may require immediate assistance."

==================================================
16. EMERGENCY SCREEN
==================================================

Emergency screen should display:

Emergency Active
Current location
Current time
Battery
GPS accuracy
Nearest useful location where available
Emergency contact information

Buttons:

Call Emergency Contact
Call Administrator
Cancel Emergency

Cancellation should require appropriate confirmation.

==================================================
17. ADMIN EMERGENCY RESPONSE
==================================================

Administrator receives:

High-priority notification
Sound
Vibration
Emergency information

Notification should contain:

User name
Emergency type
Vihar
Time
Current status

Administrator can open:

Emergency details
Live map
User profile
Route
Location
Battery
GPS accuracy

==================================================
18. MULTI-ADMIN ESCALATION
==================================================

Support multiple administrators.

Create an escalation mechanism.

Example:

Administrator 1
↓
timeout
↓
Administrator 2
↓
timeout
↓
Administrator 3

Every attempt must be logged.

Store:

Emergency ID
Admin ID
Attempt number
Start time
End time
Response status
Call status

If automatic calling is restricted by Android:

Provide a prominent manual call button.

Never assume that background automatic phone calls are universally permitted.

==================================================
19. STATIONARY MONITORING
==================================================

Monitor movement during active Vihar.

If stationary for configurable duration:

Ask:

"Are you safe?"

Buttons:

YES, I AM SAFE
I NEED HELP

If YES:

Return to normal monitoring.

If HELP:

Activate Emergency Mode.

If no response within configured duration:

Start safety escalation.

The system must avoid unnecessary false alarms for:

Rest
Temple visit
Waiting
Water break
Normal temporary stops

==================================================
20. BATTERY MONITORING
==================================================

Monitor battery.

Example:

Below 20%:

Notify administrators.

Below critical threshold:

Critical warning.

Show battery status to administrators.

When battery becomes low:

Optionally reduce tracking frequency according to system configuration.

==================================================
21. NETWORK MONITORING
==================================================

Detect:

Online
Offline
Poor connectivity

Display connection state.

Continue local tracking while offline.

Synchronize automatically after reconnection.

==================================================
22. ADMIN DASHBOARD
==================================================

Create premium Administrator Dashboard.

Dashboard should show:

Active Vihars
Safe Users
Warning Users
Emergency Users
Offline Users

Live map.

User cards containing:

Photo
Name
Battery
Speed
GPS accuracy
Source
Destination
Distance remaining
ETA
Status
Last updated

Use real-time updates.

==================================================
23. ADMIN LIVE MONITORING
==================================================

Administrator can select a user.

Open:

Live monitoring screen.

Display:

Profile
Current location
Planned route
Actual route
Battery
Speed
GPS accuracy
Last update
Distance
ETA
Warnings
Emergency history

Provide:

Call User
Call Emergency Contact
Open Emergency
View History

==================================================
24. SUPER ADMIN DASHBOARD
==================================================

Create separate Super Admin dashboard.

Features:

Manage Users
Manage Administrators
Approve Users
Disable Users
Reactivate Users
Manage Roles
Manage Permissions
Configure System
View Audit Logs
Reports
Analytics

==================================================
25. SYSTEM CONFIGURATION
==================================================

Super Admin should be able to configure:

GPS frequency
Route deviation distance
Route deviation duration
Stationary duration
Safety response timeout
Emergency alarm duration
Emergency escalation timeout
Low battery threshold
Critical battery threshold

Do not hardcode these values throughout the application.

Store them in system configuration tables.

==================================================
26. REPORTING
==================================================

Generate:

Daily
Weekly
Monthly

Reports.

Metrics:

Total Vihars
Total Distance
Total Duration
Average Speed
Route Deviations
Emergency Events
Average Vihar Duration
Active Users

Allow:

CSV
Excel
PDF

exports where implemented.

==================================================
27. ANALYTICS
==================================================

Create charts for:

Vihar activity
Distance
Duration
Average speed
Emergency frequency
Route deviation frequency
Battery alerts

Use premium dashboard cards and charts.

==================================================
28. NOTIFICATION SYSTEM
==================================================

Implement notification architecture for:

Emergency
Route deviation
Low battery
Safety check
System notifications

Emergency notifications must receive highest practical priority supported by Android.

Handle:

Foreground
Background
Killed application

subject to Android notification restrictions.

==================================================
29. VOICE ALERT SYSTEM
==================================================

Implement localized voice alerts.

Languages:

English
Hindi
Gujarati

Examples:

Route deviation
Emergency activated
Safety check
Battery warning

Provide configurable voice/alarm settings.

==================================================
30. SECURITY
==================================================

Security is critical.

Implement:

Supabase Authentication
Row Level Security
Role-based authorization
Secure Edge Functions
Input validation
Secure storage
Audit logging

Never expose:

Supabase service-role key
Private backend secrets
Private API credentials

in the mobile application.

Use environment variables.

==================================================
31. SUPABASE DATABASE
==================================================

Design a complete normalized PostgreSQL database.

Recommended major tables:

profiles
roles
user_roles
vihars
vihar_locations
vihar_routes
route_events
emergencies
emergency_attempts
safety_checks
notifications
device_status
system_settings
admin_permissions
audit_logs

Add:

Indexes
Foreign keys
Unique constraints
Check constraints
Created timestamps
Updated timestamps

Design the database specifically for real-time location monitoring.

==================================================
32. SUPABASE RLS
==================================================

Implement Row Level Security.

Examples:

Vihar Sevak:

Can access own profile.

Can access own Vihars.

Can access own location history.

Can create own Vihar.

Can create SOS.

Administrators:

Can view authorized active Vihars.

Can view required user information.

Can view emergencies.

Super Administrators:

Can manage system configuration and authorized administrative data.

Do not allow users to access another user's private information simply because they know a database ID.

==================================================
33. SUPABASE REALTIME
==================================================

Use Supabase Realtime for:

Active Vihar status
Location updates
Emergency status
Warnings
Notifications
Admin dashboard updates

Optimize subscriptions.

Do not create unnecessary subscriptions for every historical record.

==================================================
34. SUPABASE STORAGE
==================================================

Create appropriate storage buckets.

Example:

profile-images
documents
other-authorized-assets

Apply appropriate storage policies.

==================================================
35. EDGE FUNCTIONS
==================================================

Use Edge Functions for operations that require trusted server-side execution.

Examples:

Emergency notification processing
Admin escalation
Secure external API calls
AI orchestration
Report generation where appropriate
Privileged operations

Do not move ordinary UI logic into Edge Functions unnecessarily.

==================================================
36. APPLICATION ARCHITECTURE
==================================================

Use feature-based architecture.

Example:

src/

core/
config/
constants/
theme/
utils/
network/
storage/
permissions/

features/

auth/
profile/
vihar/
location/
navigation/
emergency/
notifications/
admin/
superAdmin/
reports/
settings/
ai/

Each feature should contain appropriate:

models
views/screens
viewmodels
repositories
services
components
hooks

Use clean separation between:

UI
Business logic
Data access
External services

==================================================
37. ERROR HANDLING
==================================================

Handle:

No internet
GPS disabled
GPS permission denied
Background permission denied
Location unavailable
Supabase unavailable
OTP failure
Session expiration
Google Maps failure
Directions failure
Notification failure
Storage failure

Provide user-friendly messages.

Do not expose technical stack traces to users.

==================================================
38. PERMISSION SYSTEM
==================================================

Create proper permission onboarding.

Request only required permissions.

Explain why each permission is required.

Potential permissions:

Location
Background location
Notifications
Phone/call functionality where applicable
Vibration
Other required Android capabilities

Never request permissions without explaining their purpose.

==================================================
39. USER EXPERIENCE
==================================================

Design screens for:

Splash
Onboarding
Login
OTP
Profile Setup
Home
Start Vihar
Route Preview
Active Vihar
Safety Warning
SOS
Emergency
Vihar History
Vihar Details
Profile
Settings

Admin:

Admin Login
Dashboard
Live Map
User Monitoring
Emergency Details
Emergency History
Reports

Super Admin:

Dashboard
Users
Admins
Permissions
System Configuration
Audit Logs
Reports
Analytics

==================================================
40. AI MULTI-AGENT SYSTEM
==================================================

Design the application so that AI is an additional intelligence layer.

Do not make AI responsible for core emergency detection.

Core SOS and deterministic safety rules must work independently.

Create future agents:

Navigation Agent
Safety Agent
Weather Agent
Volunteer Agent
Health/Safety Agent
Communication Agent

Create:

AI Orchestrator

The orchestrator coordinates agent results.

==================================================
41. NAVIGATION AGENT
==================================================

Analyze:

Route progress
Distance
Speed
ETA
Expected arrival

Answer:

Will the user likely reach before the expected time?

Is the current speed sufficient?

Is the route progressing normally?

==================================================
42. SAFETY AGENT
==================================================

Analyze:

Route deviation
Unexpected stopping
Speed anomalies
Time
Battery
Network
Location quality

Generate:

Advisory safety assessment.

==================================================
43. WEATHER AGENT
==================================================

Analyze:

Current weather
Rain probability
Temperature
Wind
Weather warnings

Predict:

Potential weather risks during remaining Vihar.

==================================================
44. VOLUNTEER AGENT
==================================================

Future feature.

Identify:

Nearby volunteers
Nearest available helper
Distance
Estimated arrival

Recommend appropriate volunteer assistance.

==================================================
45. HEALTH/SAFETY AGENT
==================================================

Provide contextual safety recommendations.

Do NOT provide medical diagnosis.

Use available:

Weather
Distance
Duration
Battery
Location
Environmental context

==================================================
46. COMMUNICATION AGENT
==================================================

Generate:

Safety messages
Admin alerts
Localized notifications
User instructions

Support:

English
Hindi
Gujarati

==================================================
47. AI PREDICTIVE SYSTEM
==================================================

The system should eventually analyze the next:

30–60 minutes.

Possible predictions:

ETA
Weather risk
Battery sufficiency
Route risk
Potential stopping
Nearby temple
Nearby rest location
Nearby assistance
Alternative route

Every prediction should provide:

Prediction
Reason
Confidence where possible

Clearly distinguish:

FACT
PREDICTION
RECOMMENDATION

==================================================
48. AI SAFETY RULE
==================================================

AI must never override:

SOS
Emergency Mode
Deterministic route-deviation rules
Critical battery handling
Administrator escalation

AI is advisory.

Safety-critical deterministic logic always has priority.

==================================================
49. FUTURE FEATURES
==================================================

Architect the system for:

Smartwatch SOS
Wearable integration
Voice commands
QR-based Vihar registration
Community volunteers
Geofencing
Checkpoint monitoring
Offline maps
Predictive safety analytics

These should be modular so they can be added later without rewriting the entire application.

==================================================
50. UI COMPONENT SYSTEM
==================================================

Create reusable components:

PrimaryButton
SecondaryButton
EmergencyButton
StatusBadge
UserCard
ViharCard
StatCard
MapContainer
LocationStatus
BatteryIndicator
NetworkIndicator
SafetyIndicator
AlertCard
ProfileAvatar
BottomNavigation
AppHeader
LoadingState
EmptyState
ErrorState
ConfirmationDialog

Maintain consistent design.

==================================================
51. ACCESSIBILITY
==================================================

Important controls must have:

Large touch targets
Readable typography
High contrast
Clear icons
Voice feedback where appropriate

SOS must always be easy to access during an active Vihar.

==================================================
52. DATABASE PERFORMANCE
==================================================

Optimize:

Location inserts
Realtime subscriptions
Historical queries
Reports
Analytics

Use:

Indexes
Pagination
Data retention strategies
Efficient queries
Batching

Do not load thousands of historical GPS records into mobile memory unnecessarily.

==================================================
53. DATA RETENTION
==================================================

Design a configurable data-retention approach.

Differentiate:

Active location data
Historical Vihar data
Emergency records
Audit logs

Do not automatically delete important emergency records without an explicit retention policy.

==================================================
54. AUDIT LOGGING
==================================================

Log important actions:

Admin login
Super Admin login
Account approval
Account disabling
Permission changes
System configuration changes
Emergency activation
Emergency resolution
Admin escalation
Important security events

==================================================
55. TESTING
==================================================

Create testing strategy for:

Unit tests
Repository tests
Business logic tests
UI tests
Authentication tests
Database tests
RLS tests
Realtime tests
GPS tests
Offline synchronization
SOS
Route deviation
Stationary detection
Battery alerts
Notification handling

Test failure conditions, not only successful cases.

==================================================
56. REAL DEVICE TESTING
==================================================

Test on real Android devices.

Test:

App foreground
App background
Screen locked
Poor GPS
GPS disabled
Internet disconnected
Internet restored
Low battery
Phone restart
Notification permission denied
Background permission denied

Document device limitations.

==================================================
57. SECURITY TESTING
==================================================

Verify:

Users cannot access another user's data.

Vihar Sevaks cannot access Admin-only data.

Administrators cannot change Super Admin permissions unless authorized.

Service-role credentials are never included in the APK.

RLS works correctly.

==================================================
58. PRODUCTION BUILD
==================================================

Prepare:

Android application ID
App icon
Splash screen
Release configuration
Environment variables
Google Maps configuration
Supabase configuration

Create:

Debug build
Release build

Generate APK/AAB.

==================================================
59. DOCUMENTATION
==================================================

Create complete project documentation.

Include:

Project overview
Problem statement
Objectives
Scope
Functional requirements
Non-functional requirements
System architecture
Database architecture
ER diagram
Use case diagram
DFD
Sequence diagrams
Class/component architecture
API documentation
Supabase configuration
Google Maps configuration
Authentication flow
GPS flow
Emergency flow
AI architecture
Testing documentation
Deployment guide
User manual
Administrator manual
Super Administrator manual
Future scope

==================================================
60. DEVELOPMENT PROCESS
==================================================

IMPORTANT:

Build the project sequentially.

Do NOT generate everything randomly.

Follow this order:

PHASE 1
Requirement confirmation

PHASE 2
System architecture

PHASE 3
Technology setup

PHASE 4
React Native project creation

PHASE 5
Folder architecture

PHASE 6
Design system and theme

PHASE 7
Supabase project setup

PHASE 8
Database schema

PHASE 9
RLS policies

PHASE 10
Authentication

PHASE 11
Profile system

PHASE 12
Vihar creation

PHASE 13
Google Maps

PHASE 14
GPS tracking

PHASE 15
Background tracking

PHASE 16
Offline synchronization

PHASE 17
Route deviation engine

PHASE 18
Safety monitoring

PHASE 19
SOS system

PHASE 20
Emergency escalation

PHASE 21
Notifications

PHASE 22
Administrator dashboard

PHASE 23
Super Administrator dashboard

PHASE 24
Reports

PHASE 25
Analytics

PHASE 26
Voice alerts

PHASE 27
Security hardening

PHASE 28
AI architecture

PHASE 29
AI agents

PHASE 30
Predictive intelligence

PHASE 31
Future feature architecture

PHASE 32
Testing

PHASE 33
Performance optimization

PHASE 34
Production configuration

PHASE 35
APK/AAB generation

PHASE 36
Complete documentation

==================================================
61. FILE GENERATION RULE
==================================================

When implementing:

First explain the phase.

Then show:

1. What we are building
2. Why we are building it
3. Folder/file structure
4. Required installation commands
5. Configuration
6. Complete code
7. Where each file belongs
8. How to run it
9. How to test it
10. Expected result
11. Common errors and solutions

Do not provide pseudo-code.

Do not provide incomplete code.

Do not use:

TODO
FIXME
"implement later"
"add your code here"

If something genuinely cannot be automated because it requires a user's account/dashboard action, clearly explain the exact manual step.

==================================================
62. CODE QUALITY
==================================================

All code must be:

Readable
Modular
Reusable
Secure
Maintainable
Production-oriented

Use meaningful names.

Avoid unnecessary duplication.

Explain complex business logic.

==================================================
63. IMPORTANT PLATFORM LIMITATIONS
==================================================

Never claim that Android allows unrestricted:

background phone calls
background flashlight activation
background alarm behavior
notification delivery
GPS tracking

without OS restrictions.

Implement the best possible architecture while clearly handling platform limitations.

Emergency functionality must always provide manual fallback controls.

==================================================
64. FINAL QUALITY REQUIREMENT
==================================================

The final application should feel like a professional safety platform rather than a student CRUD project.

It must combine:

Real-time location
Vihar management
Route intelligence
Emergency response
Administrator monitoring
Offline support
Security
Analytics
Multilingual support
Premium UI
Future AI capabilities

The application must be scalable and maintainable.

==================================================
65. STARTING INSTRUCTION
==================================================

Do NOT immediately generate hundreds of files.

Start with:

PHASE 1 — SYSTEM ARCHITECTURE AND DEVELOPMENT PLAN.

Provide:

1. Final technology architecture
2. Complete module list
3. Application navigation architecture
4. Database entity overview
5. Backend architecture
6. Folder structure
7. Security architecture
8. Real-time architecture
9. GPS architecture
10. Emergency architecture
11. AI architecture
12. Development phases
13. Dependencies required
14. External services required
15. Development environment setup

Then wait for confirmation.

After confirmation, proceed to PHASE 2.

Always build one logical phase at a time.

Never skip a phase.

The ultimate goal is a complete, tested, production-ready Jinaarya Vihar Setu Android application.

// New Prompt

You are a Senior Full-Stack Mobile Application Developer, React Native Expert, JavaScript Architect, Supabase/PostgreSQL Expert, GIS/Maps Engineer, Real-Time Systems Engineer, Security Engineer, AI Architect, UI/UX Designer and Software Documentation Expert.

Your task is to design and build a complete production-ready Android mobile application named:

JINAARYA VIHAR SETU

The application is developed for the Jinaarya Vihar Seva group and is intended to improve the safety, monitoring, coordination and assistance of women accompanying Jain Sadhvijis during Vihar.

IMPORTANT:

Do not create a simple demo application.

Build the system as a real-world scalable application with proper architecture, database design, security, real-time communication, background location tracking, emergency handling, administrator monitoring, Vihar transfer management, reporting and future AI integration.

The application must be developed STEP BY STEP from the beginning until final APK/AAB generation.

Do not skip architectural, database, security, testing or deployment steps.

The system is initially intended for Surat-level operation. The architecture must allow expansion to other locations in the future.

==================================================
1. TECHNOLOGY STACK
==================================================

Frontend:

React Native
JavaScript
Modern React Native architecture
Functional Components
React Hooks

Backend:

Supabase

Database:

Supabase PostgreSQL

Authentication:

Supabase Phone Number OTP Authentication

Realtime:

Supabase Realtime

Storage:

Supabase Storage

Server-side:

Supabase Edge Functions

Maps:

Google Maps SDK
Google Directions API
Google Places API

Location:

React Native compatible GPS/location library
Background location tracking
Foreground/background location permissions
Battery-aware location tracking

Notifications:

Push notification architecture compatible with Supabase Edge Functions and Android notification services.

State Management:

Use a scalable state-management solution such as Zustand or Redux Toolkit.

Architecture:

Clean Architecture
MVVM-inspired separation
Repository Pattern
Service Layer
Feature-based modular structure

Navigation:

React Navigation

Forms:

React Hook Form where appropriate

Validation:

Schema-based validation where appropriate

Charts:

Use a reliable React Native chart library for analytics.

Languages:

English
Hindi
Gujarati

==================================================
2. APPLICATION NAME
==================================================

Official application name:

Jinaarya Vihar Setu

Parent/group:

Jinaarya Vihar Seva

The application should visually communicate:

Safety
Trust
Spirituality
Human assistance
Technology
Reliability
Peace

Avoid making the UI look like a generic GPS tracker.

==================================================
3. PROJECT OPERATIONAL SCOPE
==================================================

The initial operational scope of Jinaarya Vihar Setu is Surat-level Vihar management.

The system must initially support:

Vihar Sevaks operating within Surat
Administrators responsible for Surat-level Vihar monitoring
Super Administrators managing the complete system

The database and architecture must NOT permanently restrict the system to Surat.

Create a proper area/location structure so that future cities or operational areas can be added without redesigning the complete database.

For example:

areas
cities
regions

An Administrator must be associated with an operational area.

For the current implementation:

Area = Surat

The Administrator area can be assigned and managed by:

Super Administrator
Administrator, where permitted by system rules

The Super Administrator has full authority over administrator area management.

The system should be designed so that an Administrator can work only within the area assigned to that Administrator, unless explicitly granted broader permissions.

==================================================
4. PREMIUM DESIGN SYSTEM
==================================================

Create a premium Jain-inspired visual design.

Do NOT use excessive bright colors.

The interface should feel:

Premium
Calm
Spiritual
Modern
Trustworthy
Minimal
Professional

Primary colors:

Deep Maroon:
#641C2D

Saffron:
#D98A2B

Premium Gold:
#C9A44C

Warm Ivory:
#FFFDF7

Soft Cream:
#F7F1E5

Deep Text:
#2B2020

Secondary Green for SAFE:
#2E7D5B

Warning Amber:
#D99A24

Emergency Red:
#B83232

Dark Mode:

Background:
#151112

Surface:
#21191B

Primary:
#D98A2B

Gold:
#C9A44C

Text:
#FFF8ED

Use gold primarily for:

Important icons
Borders
Highlights
Statistics
Premium accents

Use saffron for:

Primary buttons
Active navigation
Important actions

Use maroon for:

Headers
Navigation
Strong branding

Use green/yellow/red only for safety status.

Do not use gradients everywhere.

Use subtle rounded cards, clean spacing, premium typography and clear hierarchy.

==================================================
5. APPLICATION ROLES
==================================================

Implement:

1. Vihar Sevak
2. Administrator
3. Super Administrator

Role must be stored securely in the backend.

Never trust a role supplied by the mobile client.

Roles must be verified using Supabase database policies and backend logic.

The UI and navigation must be role-specific.

Vihar Sevak should see only Vihar Sevak functionality.

Administrator should see only Administrator functionality.

Super Administrator should see Super Administrator functionality.

==================================================
6. AUTHENTICATION AND REGISTRATION
==================================================

Implement:

Phone number entry
OTP request
OTP verification
Session creation
Session persistence
Logout
Session expiration handling
Unauthorized access handling

After authentication:

Determine user role from secure database information.

If Vihar Sevak:

Open Vihar Sevak Dashboard.

If Administrator:

Open Administrator Dashboard.

If Super Administrator:

Open Super Administrator Dashboard.

Do not hardcode administrator phone numbers into the application.

Create proper database-based role management.

==================================================
7. NEW VIHAR SEVAK REGISTRATION
==================================================

Create a proper registration/profile form for a new Vihar Sevak.

Registration fields must include:

Full Name
Phone Number
City
Profile Photo
Emergency Contact
Blood Group
Gender
Preferred Language
Other required personal details

IMPORTANT:

The registration form must contain an explicit checkbox/field:

"Are you interested in becoming an Administrator?"

Store this value in the database.

Example database field:

interested_in_administrator BOOLEAN DEFAULT FALSE

The field must be editable later according to the appropriate permissions.

After submitting the registration form, the Vihar Sevak must NOT be permanently locked out of editing the registration information.

The Sevak must be able to reopen and re-edit her submitted registration/profile form.

Store:

created_at
updated_at

Every important profile update should update the updated_at timestamp.

If Administrator or Super Administrator approval is required, preserve the submitted data and account status appropriately.

The registration system must distinguish between:

Pending
Active
Disabled
Rejected where applicable

Do not create unnecessary soft-delete behavior for Vihar Sevak deletion.

==================================================
8. VIHAR SEVAK PROFILE
==================================================

Create profile management.

Fields:

Full Name
Phone Number
City
Profile Photo
Emergency Contact
Blood Group
Gender
Preferred Language
Interested in Administrator
Account Status
Created Date
Updated Date

Allow:

View Profile
Edit Profile
Upload Photo
Change Language
Update Emergency Contact
Update personal information
Edit registration information

Profile image must be stored in Supabase Storage.

==================================================
9. VIHAR SEVAK DELETION RULE
==================================================

IMPORTANT BUSINESS RULE:

When a Vihar Sevak needs to be removed from the system, do NOT implement ordinary soft deletion for the Sevak account.

The required deletion operation is a HARD DELETE.

A hard delete must permanently remove the Vihar Sevak's account/profile according to the defined data-retention and legal/security rules.

Before performing the hard delete:

Require appropriate authorization.

Show a strong confirmation dialog.

Require Super Administrator authorization.

Prevent accidental deletion.

Handle dependent records correctly using appropriate:

Foreign keys
Cascading rules
Controlled deletion functions
Server-side deletion logic

Do not allow a normal Vihar Sevak to delete herself from the database.

Do not expose database deletion operations directly to the client.

Use secure server-side logic/Edge Functions for privileged deletion where required.

IMPORTANT:

Emergency records, audit requirements and legally required records must be considered before permanent deletion.

If business rules require retaining certain records for compliance, design the deletion process so personally identifying information is removed while legally required records are preserved only where necessary.

Do not silently implement soft delete for the Sevak profile because the required business behavior is hard deletion.

==================================================
10. VIHAR CREATION
==================================================

Vihar Sevak Dashboard must contain:

Start Vihar
Active Vihar
History
SOS
Profile
Settings

When Start Vihar is selected:

Show:

Source
Destination
Expected Arrival Time
Optional Notes

Allow source and destination selection through map/search.

Display:

Route preview
Distance
Estimated duration

Before starting:

Ask for confirmation.

After confirmation:

Create a unique Vihar session.

==================================================
11. SUB-VIHAR / VIHAR HANDOVER SYSTEM
==================================================

IMPORTANT NEW CORE FEATURE:

One complete Vihar may be divided into multiple Sub-Vihars.

Example:

One long Vihar:

Vihar A
Source → Destination

Sub-Vihar 1:

Sevika A + Sevika B accompany the monks.

Later:

Sub-Vihar 2:

Sevika C + Sevika D continue the Vihar.

The complete Vihar remains one overall Vihar journey.

However, individual Sevaks responsible for different portions of the journey must be recorded separately.

The system must support:

Main Vihar
Sub-Vihar
Vihar handover
Current Sevak
Previous Sevak
Next Sevak
Multiple Sevaks in one Sub-Vihar
Sub-Vihar start time
Sub-Vihar end time
Sub-Vihar source
Sub-Vihar destination
Sub-Vihar route
Sub-Vihar status

A Sub-Vihar may contain one or more Vihar Sevaks.

Example:

Main Vihar:

Vihar ID: VH001

Sub-Vihar 1:

Sevaks:
Sevika A
Sevika B

Sub-Vihar 2:

Sevaks:
Sevika C
Sevika D

When the first group completes its portion, the Vihar can be transferred to the next Sevak/group.

The handover must not create a completely new unrelated Vihar.

Instead:

Main Vihar remains the parent journey.

Sub-Vihars represent portions of that journey.

The system must maintain a complete history of who handled each part of the journey.

==================================================
12. VIHAR HANDOVER
==================================================

Implement a Vihar Transfer/Handover mechanism.

During an active Vihar, the current Sevak/group can initiate a handover.

Example:

Current Sevaks:

Sevika A
Sevika B

Transfer to:

Sevika C
Sevika D

The system should allow authorized users to:

Select next Sevak(s)
Confirm handover
Record handover time
Record handover location
Record previous Sevak(s)
Record next Sevak(s)
Record notes
Update current Vihar responsibility

The new Sevak must accept/confirm the handover where applicable.

Do not mark the complete Main Vihar as completed during a Sub-Vihar handover.

Only the current Sub-Vihar should become completed.

The next Sub-Vihar becomes active.

The main Vihar remains active.

==================================================
13. VIHAR HOLD / STOP DETAILS
==================================================

During an active Vihar, the system must support recording a temporary Hold/Stop.

A Hold means that the Vihar has temporarily stopped but has not ended.

Examples:

Rest
Temple visit
Water break
Waiting
Meeting another Sevak
Medical/safety reason
Meal
Other legitimate reason

Allow the Sevak to record:

Hold start time
Hold end time
Hold location
Hold reason
Optional notes

The system should display active Hold status.

Administrators should be able to see:

Current Hold
Hold reason
Hold duration
Hold location
Hold start time
Hold end time after completion

A Hold must NOT automatically be treated as an emergency.

The stationary monitoring system must consider valid recorded Holds to reduce false alarms.

==================================================
14. SEVAK DETAILS FOR HELPING
==================================================

During an active Vihar, authorized administrators must be able to access relevant Sevak information needed for assistance.

This may include:

Sevak name
Profile photo
Phone number
Emergency contact
Blood group
Current Vihar responsibility
Current Sub-Vihar
Current location
Current status
Battery
Network status
GPS accuracy

Display only information necessary for the intended assistance.

Sensitive information must be protected using role-based access and RLS.

==================================================
15. VIHAR SESSION DATABASE
==================================================

Create proper database entities for:

users
roles
user_roles
profiles
areas
vihars
vihar_subsessions
vihar_participants
vihar_handover
vihar_holds
vihar_locations
routes
route_events
emergencies
emergency_attempts
notifications
device_status
safety_checks
system_settings
admin_permissions
audit_logs

Use:

Primary keys
Foreign keys
Indexes
Constraints
Timestamps
Status fields
Area relationships

Do not create duplicate unrelated Vihar records when a handover occurs.

Use a parent-child relationship:

Main Vihar
↓
Sub-Vihars
↓
Participants / Sevaks

Design the schema professionally.

==================================================
16. LIVE LOCATION TRACKING
==================================================

When Vihar starts:

Start location tracking.

Capture:

Latitude
Longitude
Speed
Heading
GPS Accuracy
Altitude where available
Battery Percentage
Network Status
Timestamp

Location frequency must be configurable.

Default:

5 seconds while active, subject to battery/device limitations.

Do NOT blindly write every GPS point to the database if this causes excessive load.

Implement an efficient location batching/synchronization strategy where appropriate.

Location tracking must correctly associate each location with:

Main Vihar ID
Current Sub-Vihar ID
Sevak ID

When a handover occurs, subsequent locations must belong to the new active Sub-Vihar/Sevak responsibility.

==================================================
17. BACKGROUND LOCATION
==================================================

Location tracking should continue when:

Application is minimized
Screen is locked
Application runs in background

Subject to:

Android permissions
Battery optimization
Device restrictions
OS limitations

Implement:

Foreground service where required
Background location permissions
Permission explanation screens
Tracking status indicator

Show:

GPS Active
GPS Disabled
Permission Required
Poor Accuracy

==================================================
18. OFFLINE MODE
==================================================

The application must continue safely during temporary internet loss.

When offline:

Store important location records locally.

Maintain:

Pending synchronization queue
Timestamp
Sync status

When internet returns:

Automatically synchronize pending records.

Avoid:

Duplicate records
Lost records
Incorrect timestamps

Show synchronization status to the user where useful.

==================================================
19. MAP AND ROUTE
==================================================

Implement Google Maps.

Display:

Current location
Source
Destination
Planned route
Actual travelled route

Show:

Distance remaining
Estimated arrival time
Current speed

Use Directions API for route generation.

Use Places API for relevant place searching.

Keep API keys secure.

Never expose unrestricted server credentials.

==================================================
20. ROUTE DEVIATION ENGINE
==================================================

Implement route monitoring.

Compare:

Current GPS location

against:

Planned route.

Create configurable:

Deviation distance threshold
Deviation duration

Example:

Threshold = 50 meters

When exceeded:

LEVEL 1

Show:

Voice alert
Vibration
Alarm
Visual warning

Message:

"You are moving away from your Vihar route. Please return to the planned route."

Continue monitoring.

If the user returns:

Cancel warning.

If deviation continues:

LEVEL 2

Notify all authorized administrators.

Update user status:

WARNING

Record:

Deviation start
Deviation end
Distance
Duration
Location
Timestamp
Main Vihar
Sub-Vihar
Sevak

==================================================
21. SAFETY STATUS
==================================================

Every active Vihar/Sub-Vihar should have a status:

SAFE
WARNING
EMERGENCY
OFFLINE
ON HOLD
COMPLETED

Dashboard indicators:

Green = SAFE
Yellow/Amber = WARNING
Red = EMERGENCY
Grey = OFFLINE
Appropriate neutral indicator = ON HOLD

Status must be updated in real time.

==================================================
22. SOS SYSTEM
==================================================

Provide a large, highly visible SOS button for the Vihar Sevak.

Avoid accidental activation.

Use confirmation where appropriate but do not make emergency activation unnecessarily difficult.

When SOS activates:

Create emergency record.

Set status:

EMERGENCY

Activate:

Emergency screen
Alarm
Vibration
Voice alert
Live location sharing

Notify authorized administrators.

Message:

"Emergency Alert. A Vihar Sevika may require immediate assistance."

==================================================
23. POLICE CALLING FROM VIHAR SEVAK
==================================================

IMPORTANT NEW REQUIREMENT:

During an active Vihar, the Vihar Sevak must have the ability to call the police directly.

Provide a clearly visible:

CALL POLICE

action in the emergency interface.

The button should be accessible during:

Active Vihar
SOS screen
Emergency Mode

Do not falsely claim that the application can automatically contact police without Android/device permissions.

Use the appropriate Android phone/call mechanism where legally and technically supported.

Provide manual fallback behavior.

The system should log that the Sevak initiated the police call action where appropriate.

Do NOT expose unnecessary private information to the police through the application.

==================================================
24. EMERGENCY SCREEN
==================================================

Emergency screen should display:

Emergency Active
Current location
Current time
Battery
GPS accuracy
Nearest useful location where available
Emergency contact information
Current Vihar
Current Sub-Vihar
Current Sevak/group responsibility

Buttons:

CALL POLICE
Call Emergency Contact
Call Administrator
Cancel Emergency

Cancellation should require appropriate confirmation.

CALL POLICE must remain easily accessible during Emergency Mode.

==================================================
25. ADMIN EMERGENCY RESPONSE
==================================================

Administrator receives:

High-priority notification
Sound
Vibration
Emergency information

Notification should contain:

User name
Emergency type
Vihar
Sub-Vihar
Time
Current status

Administrator can open:

Emergency details
Live map
User profile
Route
Location
Battery
GPS accuracy

==================================================
26. ADMIN POLICE CALLING
==================================================

IMPORTANT NEW REQUIREMENT:

During an active Vihar or an emergency situation, an Administrator must also be able to call the police.

Provide:

CALL POLICE

inside the Administrator emergency response interface.

Administrator should be able to:

View emergency
Open live location
View relevant Sevak details
Call police
Call Sevak
Call emergency contact
Call another Administrator
View escalation history
Resolve/close emergency where authorized

The police call action must have appropriate confirmation.

Use supported Android phone/call mechanisms.

Provide manual fallback if automatic calling is restricted.

Log the police-call initiation event where appropriate.

==================================================
27. MULTI-ADMIN ESCALATION
==================================================

Support multiple administrators.

Create an escalation mechanism.

Example:

Administrator 1
↓
timeout
↓
Administrator 2
↓
timeout
↓
Administrator 3

Every attempt must be logged.

Store:

Emergency ID
Admin ID
Attempt number
Start time
End time
Response status
Call status

If automatic calling is restricted by Android:

Provide a prominent manual call button.

Never assume that background automatic phone calls are universally permitted.

==================================================
28. STATIONARY MONITORING
==================================================

Monitor movement during active Vihar.

If stationary for configurable duration:

Ask:

"Are you safe?"

Buttons:

YES, I AM SAFE
I NEED HELP
ON HOLD

If YES:

Return to normal monitoring.

If HELP:

Activate Emergency Mode.

If ON HOLD:

Allow the Sevak to enter Hold Details.

If no response within configured duration:

Start safety escalation.

The system must avoid unnecessary false alarms for:

Rest
Temple visit
Waiting
Water break
Normal temporary stops
Recorded Holds
Vihar handover

==================================================
29. BATTERY MONITORING
==================================================

Monitor battery.

Example:

Below 20%:

Notify administrators.

Below critical threshold:

Critical warning.

Show battery status to administrators.

When battery becomes low:

Optionally reduce tracking frequency according to system configuration.

==================================================
30. NETWORK MONITORING
==================================================

Detect:

Online
Offline
Poor connectivity

Display connection state.

Continue local tracking while offline.

Synchronize automatically after reconnection.

==================================================
31. VIHAR SEVAK UI
==================================================

The Vihar Sevak application must have a simple and safety-focused navigation system.

Primary navigation:

Vihar
History
SOS
Profile
More

Vihar screen:

Start Vihar
Active Vihar
Current Sub-Vihar
Current Sevak responsibility
Current location
Route
ETA
Distance
Safety status
Hold status
Handover option

During active Vihar:

Show:

Map
Current position
Planned route
Actual route
ETA
Distance
Speed
Battery
Network
GPS accuracy
Current Sub-Vihar
Other participating Sevaks
Handover
Hold
SOS

Registration/Profile:

View submitted registration
Edit registration
Profile photo
Emergency contact
Language
Administrator-interest field

==================================================
32. ADMINISTRATOR DASHBOARD
==================================================

Create premium Administrator Dashboard.

Primary navigation:

Dashboard
Live
Alerts
Reports
More

Dashboard should show:

Active Vihars
Safe Users
Warning Users
Emergency Users
Offline Users
On Hold Users

Live map.

User cards containing:

Photo
Name
Battery
Speed
GPS accuracy
Source
Destination
Current Sub-Vihar
Current Sevak group
Distance remaining
ETA
Status
Last updated

Use real-time updates.

Administrators must only see Vihars and Sevaks within their authorized area unless broader access has been explicitly granted.

==================================================
33. ADMIN LIVE MONITORING
==================================================

Administrator can select a Vihar/Sevak.

Open:

Live monitoring screen.

Display:

Profile
Current location
Planned route
Actual route
Battery
Speed
GPS accuracy
Last update
Distance
ETA
Warnings
Current Hold
Hold history
Sub-Vihar history
Handover history
Emergency history

Provide:

Call User
Call Emergency Contact
CALL POLICE
Open Emergency
View History
View Sevak Helping Details

==================================================
34. ADMIN AREA MANAGEMENT
==================================================

Each Administrator must have an assigned operational area.

Example:

Administrator:

Name: Example Admin
Area: Surat

When a new Administrator is created:

The Area field must be available.

IMPORTANT:

Both Super Administrator and authorized Administrator users must be able to fill/update the Administrator's area according to permission rules.

Super Administrator:

Can create Administrator
Can assign area
Can edit area
Can change area
Can manage all areas

Administrator:

Can fill/update the area information where the permission is granted.

Do not allow an Administrator to modify another Administrator's area unless explicitly authorized.

Use database authorization and RLS.

==================================================
35. SUPER ADMINISTRATOR DASHBOARD
==================================================

Create separate Super Administrator dashboard.

Primary navigation:

Dashboard
Users
Monitoring
Reports
More

Features:

Manage Users
Manage Administrators
Approve Users
Disable Users
Reactivate Users
Manage Roles
Manage Permissions
Manage Areas
Assign Administrator Areas
Configure System
View Audit Logs
Reports
Analytics

User management must clearly distinguish:

Vihar Sevaks
Administrators
Super Administrators

==================================================
36. SUPER ADMIN ADMINISTRATOR MANAGEMENT
==================================================

Super Administrator can:

Create Administrator
Edit Administrator
Assign area
Change area
Set permissions
Disable Administrator
Reactivate Administrator
Review Administrator activity
View Administrator audit history

When creating an Administrator, include:

Full Name
Phone Number
Profile Photo where required
Area
Permissions
Account Status
Created Date

The area must not be hardcoded.

==================================================
37. SYSTEM CONFIGURATION
==================================================

Super Admin should be able to configure:

GPS frequency
Route deviation distance
Route deviation duration
Stationary duration
Safety response timeout
Emergency alarm duration
Emergency escalation timeout
Low battery threshold
Critical battery threshold
Hold-related safety thresholds
Area configuration

Do not hardcode these values throughout the application.

Store them in system configuration tables.

==================================================
38. REPORTING
==================================================

Generate:

Daily
Weekly
Monthly
Custom

Reports.

Metrics:

Total Vihars
Total Sub-Vihars
Total Distance
Total Duration
Average Speed
Route Deviations
Emergency Events
Average Vihar Duration
Active Users
Vihar Holds
Vihar Handovers
Emergency response time
Administrator response statistics

Allow:

CSV
Excel
PDF

exports where implemented.

==================================================
39. ANALYTICS
==================================================

Create charts for:

Vihar activity
Sub-Vihar activity
Distance
Duration
Average speed
Emergency frequency
Route deviation frequency
Battery alerts
Handover frequency
Hold frequency
Administrator response time

Use premium dashboard cards and charts.

==================================================
40. NOTIFICATION SYSTEM
==================================================

Implement notification architecture for:

Emergency
Route deviation
Low battery
Safety check
Handover
Hold
System notifications
Administrator assignment where applicable

Emergency notifications must receive highest practical priority supported by Android.

Handle:

Foreground
Background
Killed application

subject to Android notification restrictions.

==================================================
41. VOICE ALERT SYSTEM
==================================================

Implement localized voice alerts.

Languages:

English
Hindi
Gujarati

Examples:

Route deviation
Emergency activated
Safety check
Battery warning
Handover
Hold confirmation

Provide configurable voice/alarm settings.

==================================================
42. SECURITY
==================================================

Security is critical.

Implement:

Supabase Authentication
Row Level Security
Role-based authorization
Area-based authorization
Secure Edge Functions
Input validation
Secure storage
Audit logging

Never expose:

Supabase service-role key
Private backend secrets
Private API credentials

in the mobile application.

Use environment variables.

==================================================
43. SUPABASE DATABASE
==================================================

Design a complete normalized PostgreSQL database.

Recommended major tables:

profiles
roles
user_roles
areas
administrators
vihars
vihar_subsessions
vihar_participants
vihar_handover
vihar_holds
vihar_locations
vihar_routes
route_events
emergencies
emergency_attempts
safety_checks
notifications
device_status
system_settings
admin_permissions
audit_logs

Important profile fields:

interested_in_administrator BOOLEAN

Administrator fields must include:

area_id

Vihar fields must support:

main Vihar
current sub-vihar
current participants
current responsible Sevaks

Add:

Indexes
Foreign keys
Unique constraints
Check constraints
Created timestamps
Updated timestamps

Design the database specifically for real-time location monitoring and Vihar handovers.

==================================================
44. SUPABASE RLS
==================================================

Implement Row Level Security.

Vihar Sevak:

Can access own profile.
Can edit own allowed registration fields.
Can access own Vihars.
Can access own location history.
Can create own Vihar.
Can create SOS.
Can perform authorized handover operations.
Can create/update own Hold information.

Administrators:

Can view authorized active Vihars.
Can view required user information.
Can view emergencies.
Can view relevant Sevak helping details.
Can initiate police-call action.
Can participate in emergency escalation.
Can manage allowed area information.

Super Administrators:

Can manage system configuration.
Can manage authorized administrative data.
Can manage users and administrators.
Can perform authorized hard deletion of Vihar Sevak accounts.
Can manage areas and permissions.

Do not allow users to access another user's private information simply because they know a database ID.

==================================================
45. SUPABASE REALTIME
==================================================

Use Supabase Realtime for:

Active Vihar status
Sub-Vihar status
Location updates
Emergency status
Warnings
Handover updates
Hold status
Notifications
Admin dashboard updates

Optimize subscriptions.

Do not create unnecessary subscriptions for every historical record.

==================================================
46. SUPABASE STORAGE
==================================================

Create appropriate storage buckets.

Example:

profile-images
documents
other-authorized-assets

Apply appropriate storage policies.

==================================================
47. EDGE FUNCTIONS
==================================================

Use Edge Functions for operations that require trusted server-side execution.

Examples:

Emergency notification processing
Admin escalation
Secure external API calls
AI orchestration
Report generation where appropriate
Privileged user deletion
Administrator management operations where appropriate
Vihar handover validation where required

Do not move ordinary UI logic into Edge Functions unnecessarily.

==================================================
48. APPLICATION ARCHITECTURE
==================================================

Use feature-based architecture.

Example:

src/

core/
config/
constants/
theme/
utils/
network/
storage/
permissions/

features/

auth/
registration/
profile/
vihar/
subVihar/
handover/
hold/
location/
navigation/
emergency/
notifications/
admin/
superAdmin/
reports/
settings/
ai/

Each feature should contain appropriate:

models
views/screens
viewmodels
repositories
services
components
hooks

Use clean separation between:

UI
Business logic
Data access
External services

==================================================
49. ERROR HANDLING
==================================================

Handle:

No internet
GPS disabled
GPS permission denied
Background permission denied
Location unavailable
Supabase unavailable
OTP failure
Session expiration
Google Maps failure
Directions failure
Notification failure
Storage failure
Handover failure
Hold synchronization failure
Emergency escalation failure

Provide user-friendly messages.

Do not expose technical stack traces to users.

==================================================
50. PERMISSION SYSTEM
==================================================

Create proper permission onboarding.

Request only required permissions.

Explain why each permission is required.

Potential permissions:

Location
Background location
Notifications
Phone/call functionality where applicable
Vibration
Other required Android capabilities

Never request permissions without explaining their purpose.

==================================================
51. USER EXPERIENCE
==================================================

Design screens for:

Splash
Onboarding
Login
OTP
Registration
Registration Edit
Profile Setup
Home
Start Vihar
Route Preview
Active Vihar
Sub-Vihar
Vihar Handover
Hold Details
Safety Warning
SOS
Emergency
Call Police
Vihar History
Vihar Details
Profile
Settings

Administrator:

Admin Login
Dashboard
Live Map
User Monitoring
Sub-Vihar Monitoring
Handover Details
Hold Details
Emergency Details
Emergency History
Police Call
Reports

Super Administrator:

Dashboard
Users
Vihar Sevaks
Administrators
Areas
Permissions
System Configuration
Audit Logs
Reports
Analytics

==================================================
52. AI MULTI-AGENT SYSTEM
==================================================

Design the application so that AI is an additional intelligence layer.

Do not make AI responsible for core emergency detection.

Core SOS and deterministic safety rules must work independently.

Create future agents:

Navigation Agent
Safety Agent
Weather Agent
Volunteer Agent
Health/Safety Agent
Communication Agent

Create:

AI Orchestrator

The orchestrator coordinates agent results.

==================================================
53. NAVIGATION AGENT
==================================================

Analyze:

Route progress
Distance
Speed
ETA
Expected arrival
Sub-Vihar progress
Handover timing

Answer:

Will the user likely reach before the expected time?

Is the current speed sufficient?

Is the route progressing normally?

When should a Vihar handover potentially occur?

==================================================
54. SAFETY AGENT
==================================================

Analyze:

Route deviation
Unexpected stopping
Speed anomalies
Time
Battery
Network
Location quality
Hold history
Handover state
Current Sub-Vihar

Generate:

Advisory safety assessment.

==================================================
55. WEATHER AGENT
==================================================

Analyze:

Current weather
Rain probability
Temperature
Wind
Weather warnings

Predict:

Potential weather risks during remaining Vihar.

==================================================
56. VOLUNTEER AGENT
==================================================

Future feature.

Identify:

Nearby volunteers
Nearest available helper
Distance
Estimated arrival

Recommend appropriate volunteer assistance.

==================================================
57. HEALTH/SAFETY AGENT
==================================================

Provide contextual safety recommendations.

Do NOT provide medical diagnosis.

Use available:

Weather
Distance
Duration
Battery
Location
Environmental context

==================================================
58. COMMUNICATION AGENT
==================================================

Generate:

Safety messages
Admin alerts
Localized notifications
User instructions
Handover communication
Hold-related communication

Support:

English
Hindi
Gujarati

==================================================
59. AI PREDICTIVE SYSTEM
==================================================

The system should eventually analyze the next:

30–60 minutes.

Possible predictions:

ETA
Weather risk
Battery sufficiency
Route risk
Potential stopping
Nearby temple
Nearby rest location
Nearby assistance
Alternative route
Potential handover requirement

Every prediction should provide:

Prediction
Reason
Confidence where possible

Clearly distinguish:

FACT
PREDICTION
RECOMMENDATION

==================================================
60. AI SAFETY RULE
==================================================

AI must never override:

SOS
Emergency Mode
Deterministic route-deviation rules
Critical battery handling
Administrator escalation
Police call functionality

AI is advisory.

Safety-critical deterministic logic always has priority.

==================================================
61. FUTURE FEATURES
==================================================

Architect the system for:

Smartwatch SOS
Wearable integration
Voice commands
QR-based Vihar registration
Community volunteers
Geofencing
Checkpoint monitoring
Offline maps
Predictive safety analytics
Multi-city expansion
Advanced Vihar handover networks

These should be modular so they can be added later without rewriting the entire application.

==================================================
62. UI COMPONENT SYSTEM
==================================================

Create reusable components:

PrimaryButton
SecondaryButton
EmergencyButton
PoliceCallButton
StatusBadge
UserCard
ViharCard
SubViharCard
StatCard
MapContainer
LocationStatus
BatteryIndicator
NetworkIndicator
SafetyIndicator
AlertCard
ProfileAvatar
BottomNavigation
AppHeader
LoadingState
EmptyState
ErrorState
ConfirmationDialog
HoldCard
HandoverCard

Maintain consistent design.

==================================================
63. ACCESSIBILITY
==================================================

Important controls must have:

Large touch targets
Readable typography
High contrast
Clear icons
Voice feedback where appropriate

SOS must always be easy to access during an active Vihar.

CALL POLICE must also remain easily accessible during Emergency Mode.

==================================================
64. DATABASE PERFORMANCE
==================================================

Optimize:

Location inserts
Realtime subscriptions
Historical queries
Reports
Analytics
Handover queries
Hold queries

Use:

Indexes
Pagination
Data retention strategies
Efficient queries
Batching

Do not load thousands of historical GPS records into mobile memory unnecessarily.

==================================================
65. DATA RETENTION
==================================================

Design a configurable data-retention approach.

Differentiate:

Active location data
Historical Vihar data
Emergency records
Handover records
Hold records
Audit logs

Do not automatically delete important emergency records without an explicit retention policy.

Vihar Sevak deletion must follow the HARD DELETE business rule defined earlier.

==================================================
66. AUDIT LOGGING
==================================================

Log important actions:

Admin login
Super Admin login
Account approval
Account disabling
Administrator creation
Administrator area assignment
Administrator area change
Permission changes
System configuration changes
Emergency activation
Emergency resolution
Police call action
Admin escalation
Vihar handover
Hold creation
Important security events
Hard deletion of Sevak account

==================================================
67. TESTING
==================================================

Create testing strategy for:

Unit tests
Repository tests
Business logic tests
UI tests
Authentication tests
Registration tests
Registration editing tests
Database tests
RLS tests
Realtime tests
GPS tests
Offline synchronization
SOS
Police call action
Route deviation
Stationary detection
Hold system
Vihar handover
Sub-Vihar tracking
Battery alerts
Notification handling
Hard deletion
Area authorization

Test failure conditions, not only successful cases.

==================================================
68. REAL DEVICE TESTING
==================================================

Test on real Android devices.

Test:

App foreground
App background
Screen locked
Poor GPS
GPS disabled
Internet disconnected
Internet restored
Low battery
Phone restart
Notification permission denied
Background permission denied
Police call permission behavior
Background restrictions
Vihar handover
Sub-Vihar transition
Hold mode
SOS
Emergency escalation

Document device limitations.

==================================================
69. SECURITY TESTING
==================================================

Verify:

Users cannot access another user's data.

Vihar Sevaks cannot access Admin-only data.

Administrators cannot change Super Admin permissions unless authorized.

Administrators cannot access Vihars outside their authorized area unless explicitly permitted.

Service-role credentials are never included in the APK.

RLS works correctly.

Unauthorized users cannot perform hard deletion.

Unauthorized users cannot modify Vihar handover records.

Unauthorized users cannot change Administrator areas.

==================================================
70. PRODUCTION BUILD
==================================================

Prepare:

Android application ID
App icon
Splash screen
Release configuration
Environment variables
Google Maps configuration
Supabase configuration

Create:

Debug build
Release build

Generate APK/AAB.

==================================================
71. DOCUMENTATION
==================================================

Create complete project documentation.

Include:

Project overview
Problem statement
Objectives
Scope
Functional requirements
Non-functional requirements
System architecture
Database architecture
ER diagram
Use case diagram
DFD
Sequence diagrams
Class/component architecture
API documentation
Supabase configuration
Google Maps configuration
Authentication flow
GPS flow
Vihar flow
Sub-Vihar flow
Vihar handover flow
Hold flow
Emergency flow
Police call flow
AI architecture
Testing documentation
Deployment guide
User manual
Vihar Sevak manual
Administrator manual
Super Administrator manual
Future scope

==================================================
72. DEVELOPMENT PROCESS
==================================================

IMPORTANT:

Build the project sequentially.

Do NOT generate everything randomly.

The development process must be organized by both:

TECHNICAL PHASE

and

USER ROLE / UI RESPONSIBILITY.

The three major UI implementation groups are:

GROUP A — VIHAR SEVAK UI
GROUP B — ADMINISTRATOR UI
GROUP C — SUPER ADMINISTRATOR UI

The backend/database/security phases must support all three groups.

--------------------------------------------------
PHASE 1 — REQUIREMENT CONFIRMATION
--------------------------------------------------

STATUS:

UPDATED / CONFIRM AGAIN

Confirm:

Roles
Surat-level scope
Vihar workflow
Sub-Vihar workflow
Vihar handover
Hold system
Sevak helping information
Police calling
Administrator area
Sevak registration editing
Administrator-interest field
Hard-delete requirement
Emergency flow
AI scope

Do not begin implementation until the complete requirements are understood.

--------------------------------------------------
PHASE 2 — SYSTEM ARCHITECTURE
--------------------------------------------------

STATUS:

UPDATED

Design architecture for:

Vihar Sevak
Administrator
Super Administrator

Include:

Main Vihar
Sub-Vihar
Handover
Hold
Area-based authorization
Emergency
Police call
Real-time monitoring

--------------------------------------------------
PHASE 3 — TECHNOLOGY SETUP
--------------------------------------------------

STATUS:

COMPLETED / NO FUNCTIONAL CHANGE

Set up:

Node.js
React Native
JavaScript
Android development environment
Supabase
Google Maps
Required libraries

--------------------------------------------------
PHASE 4 — REACT NATIVE PROJECT CREATION
--------------------------------------------------

STATUS:

COMPLETED / NO FUNCTIONAL CHANGE

Create the React Native project and configure Android.

--------------------------------------------------
PHASE 5 — FOLDER ARCHITECTURE
--------------------------------------------------

STATUS:

UPDATED

Add feature modules for:

auth
registration
profile
vihar
subVihar
handover
hold
location
navigation
emergency
admin
superAdmin
reports
settings
ai

--------------------------------------------------
PHASE 6 — DESIGN SYSTEM AND THEME
--------------------------------------------------

STATUS:

COMPLETED / NO FUNCTIONAL CHANGE

Implement:

Jain-inspired theme
Light mode
Dark mode
Reusable components
Safety colors
Emergency colors
Premium typography

--------------------------------------------------
PHASE 7 — SUPABASE PROJECT SETUP
--------------------------------------------------

STATUS:

UPDATED

Configure:

Authentication
Database
Realtime
Storage
Edge Functions

Prepare area-based and role-based backend architecture.

--------------------------------------------------
PHASE 8 — DATABASE SCHEMA
--------------------------------------------------

STATUS:

MAJOR UPDATE REQUIRED

Implement database tables for:

profiles
roles
user_roles
areas
administrators
vihars
vihar_subsessions
vihar_participants
vihar_handover
vihar_holds
vihar_locations
vihar_routes
route_events
emergencies
emergency_attempts
safety_checks
notifications
device_status
system_settings
admin_permissions
audit_logs

Add:

interested_in_administrator BOOLEAN

Add:

area_id

Add Main Vihar → Sub-Vihar relationships.

Add participant relationships.

Add handover relationships.

Add Hold records.

Design hard-delete handling for Vihar Sevaks.

--------------------------------------------------
PHASE 9 — RLS POLICIES
--------------------------------------------------

STATUS:

MAJOR UPDATE REQUIRED

Implement:

Role-based access
Area-based access
Sevak-specific access
Administrator access
Super Administrator access

Protect:

Vihar data
Location data
Emergency data
Handover data
Hold data
Profile data
Administrator data
Area data

Ensure hard deletion is restricted to authorized backend operations.

--------------------------------------------------
PHASE 10 — AUTHENTICATION AND REGISTRATION
--------------------------------------------------

STATUS:

MAJOR UPDATE REQUIRED

Implement:

Phone OTP
Registration
Profile creation
Registration status
Registration editing
Interested-in-Administrator field
Role detection
Session management

A submitted Sevak registration must remain editable by the Sevak according to permitted fields.

--------------------------------------------------
PHASE 11 — PROFILE SYSTEM
--------------------------------------------------

STATUS:

MAJOR UPDATE REQUIRED

Implement:

Vihar Sevak profile
Registration edit
Profile photo
Emergency contact
Language
Blood group
Gender
Administrator-interest field
Account status

Implement the required hard-delete workflow for Sevak accounts.

--------------------------------------------------
PHASE 12 — VIHAR CREATION
--------------------------------------------------

STATUS:

UPDATED

Implement:

Start Vihar
Source
Destination
Expected arrival
Notes
Route preview
Main Vihar creation

Prepare the system for Sub-Vihars.

--------------------------------------------------
PHASE 13 — SUB-VIHAR AND HANDOVER SYSTEM
--------------------------------------------------

STATUS:

NEW PHASE

Implement:

Main Vihar
Sub-Vihar
Multiple Sevaks
Current Sevak group
Previous Sevak group
Next Sevak group
Handover
Handover confirmation
Handover location
Handover time
Handover notes

The Main Vihar must remain active across multiple Sub-Vihars.

--------------------------------------------------
PHASE 14 — GOOGLE MAPS
--------------------------------------------------

STATUS:

COMPLETED / NO CORE CHANGE

Implement:

Google Maps
Directions API
Places API
Route preview
Source
Destination

Support Sub-Vihar route visualization.

--------------------------------------------------
PHASE 15 — GPS TRACKING
--------------------------------------------------

STATUS:

UPDATED

Implement live location tracking.

Every location must associate with:

Sevak
Main Vihar
Current Sub-Vihar

Support:

Latitude
Longitude
Speed
Heading
Accuracy
Battery
Network
Timestamp

--------------------------------------------------
PHASE 16 — BACKGROUND TRACKING
--------------------------------------------------

STATUS:

COMPLETED / NO CORE CHANGE

Implement background GPS tracking subject to Android restrictions.

--------------------------------------------------
PHASE 17 — OFFLINE SYNCHRONIZATION
--------------------------------------------------

STATUS:

UPDATED

Ensure offline data includes:

Location
Sub-Vihar state
Handover state
Hold state
Emergency state

Synchronize safely when connectivity returns.

--------------------------------------------------
PHASE 18 — ROUTE DEVIATION ENGINE
--------------------------------------------------

STATUS:

UPDATED

Route deviation must be calculated for the current active Sub-Vihar while maintaining the Main Vihar context.

--------------------------------------------------
PHASE 19 — SAFETY MONITORING
--------------------------------------------------

STATUS:

UPDATED

Implement:

Safe
Warning
Emergency
Offline
On Hold
Completed

Stationary monitoring must recognize valid Holds.

--------------------------------------------------
PHASE 20 — HOLD MANAGEMENT
--------------------------------------------------

STATUS:

NEW PHASE

Implement:

Start Hold
Hold reason
Hold location
Hold time
Hold duration
Hold notes
End Hold

Admin must see Hold information.

--------------------------------------------------
PHASE 21 — SOS SYSTEM
--------------------------------------------------

STATUS:

UPDATED

Implement:

SOS
Emergency Mode
Live location
Alarm
Voice
Vibration
Emergency notification

--------------------------------------------------
PHASE 22 — POLICE AND EMERGENCY CALLING
--------------------------------------------------

STATUS:

NEW PHASE

Implement police-call functionality for:

Vihar Sevak
Administrator

Vihar Sevak:

CALL POLICE from active Vihar/emergency.

Administrator:

CALL POLICE from emergency response.

Handle Android permissions and limitations.

Provide manual fallback.

Log the action appropriately.

--------------------------------------------------
PHASE 23 — EMERGENCY ESCALATION
--------------------------------------------------

STATUS:

UPDATED

Implement:

Multiple administrators
Sequential escalation
Timeout
Response tracking
Call status
Police call action
Emergency resolution

--------------------------------------------------
PHASE 24 — NOTIFICATIONS
--------------------------------------------------

STATUS:

UPDATED

Add notifications for:

Emergency
Route deviation
Battery
Safety check
Hold
Handover
System events

--------------------------------------------------
PHASE 25 — VIHAR SEVAK UI
--------------------------------------------------

STATUS:

NEW ROLE-BASED PHASE

Build complete Vihar Sevak UI.

Navigation:

Vihar
History
SOS
Profile
More

Implement:

Registration
Registration Edit
Start Vihar
Active Vihar
Sub-Vihar
Handover
Hold
SOS
Call Police
Profile
Settings
History

--------------------------------------------------
PHASE 26 — ADMINISTRATOR UI
--------------------------------------------------

STATUS:

NEW ROLE-BASED PHASE

Build complete Administrator UI.

Navigation:

Dashboard
Live
Alerts
Reports
More

Implement:

Active Vihar monitoring
Live map
Sub-Vihar monitoring
Handover monitoring
Hold monitoring
Emergency response
Call Police
Sevak helping details
Area-based filtering
Reports

--------------------------------------------------
PHASE 27 — SUPER ADMINISTRATOR UI
--------------------------------------------------

STATUS:

NEW ROLE-BASED PHASE

Build complete Super Administrator UI.

Navigation:

Dashboard
Users
Monitoring
Reports
More

Implement:

Vihar Sevak management
Administrator management
Area management
Permissions
System settings
Audit logs
Hard-delete Sevak functionality
Reports
Analytics

--------------------------------------------------
PHASE 28 — ADMINISTRATOR AREA MANAGEMENT
--------------------------------------------------

STATUS:

NEW PHASE

Implement:

Administrator creation
Area assignment
Area editing
Area authorization

Super Administrator:

Full control.

Administrator:

Can fill/update area where permission is granted.

Use RLS and backend authorization.

--------------------------------------------------
PHASE 29 — REPORTS
--------------------------------------------------

STATUS:

UPDATED

Reports must include:

Vihars
Sub-Vihars
Distance
Duration
Emergencies
Route deviations
Holds
Handovers
Administrator response
Safety events

--------------------------------------------------
PHASE 30 — ANALYTICS
--------------------------------------------------

STATUS:

UPDATED

Add analytics for:

Vihar activity
Sub-Vihar activity
Handovers
Holds
Emergency events
Route deviations
Response times
Battery alerts

--------------------------------------------------
PHASE 31 — VOICE ALERTS
--------------------------------------------------

STATUS:

COMPLETED / NO CORE CHANGE

Implement:

English
Hindi
Gujarati

--------------------------------------------------
PHASE 32 — SECURITY HARDENING
--------------------------------------------------

STATUS:

UPDATED

Test:

Role security
Area security
Hard deletion
Profile privacy
Emergency privacy
Location privacy
Handover security
Hold security
Administrator permissions

--------------------------------------------------
PHASE 33 — AI ARCHITECTURE
--------------------------------------------------

STATUS:

UPDATED

AI must understand:

Main Vihar
Sub-Vihar
Handover
Hold
Current Sevak
Current route
Current safety state

--------------------------------------------------
PHASE 34 — AI AGENTS
--------------------------------------------------

STATUS:

UPDATED

Implement future architecture for:

Navigation Agent
Safety Agent
Weather Agent
Volunteer Agent
Health/Safety Agent
Communication Agent
AI Orchestrator

--------------------------------------------------
PHASE 35 — PREDICTIVE INTELLIGENCE
--------------------------------------------------

STATUS:

UPDATED

Support future prediction of:

ETA
Weather
Battery
Route risk
Potential stopping
Assistance
Handover requirement
Sub-Vihar progress

--------------------------------------------------
PHASE 36 — FUTURE FEATURES, TESTING, PERFORMANCE, PRODUCTION AND DOCUMENTATION
--------------------------------------------------

STATUS:

UPDATED

Complete:

Future feature architecture
Smartwatch support
Wearables
Voice commands
QR registration
Volunteers
Geofencing
Checkpoints
Offline maps
Testing
Real device testing
Security testing
Performance optimization
Production configuration
APK/AAB generation
Complete documentation

==================================================
73. FILE GENERATION RULE
==================================================

When implementing:

First explain the phase.

Then show:

1. What we are building
2. Why we are building it
3. Folder/file structure
4. Required installation commands
5. Configuration
6. Complete code
7. Where each file belongs
8. How to run it
9. How to test it
10. Expected result
11. Common errors and solutions

Do not provide pseudo-code.

Do not provide incomplete code.

Do not use:

TODO
FIXME
"implement later"
"add your code here"

If something genuinely cannot be automated because it requires a user's account/dashboard action, clearly explain the exact manual step.

==================================================
74. CODE QUALITY
==================================================

All code must be:

Readable
Modular
Reusable
Secure
Maintainable
Production-oriented

Use meaningful names.

Avoid unnecessary duplication.

Explain complex business logic.

==================================================
75. IMPORTANT PLATFORM LIMITATIONS
==================================================

Never claim that Android allows unrestricted:

Background phone calls
Background flashlight activation
Background alarm behavior
Notification delivery
GPS tracking

without OS restrictions.

Implement the best possible architecture while clearly handling platform limitations.

Emergency functionality must always provide manual fallback controls.

The CALL POLICE feature must respect Android phone/call restrictions.

==================================================
76. FINAL QUALITY REQUIREMENT
==================================================

The final application should feel like a professional safety platform rather than a student CRUD project.

It must combine:

Real-time location
Vihar management
Main Vihar and Sub-Vihar management
Vihar handover
Hold management
Route intelligence
Emergency response
Police calling
Administrator monitoring
Area-based administration
Offline support
Security
Analytics
Multilingual support
Premium UI
Future AI capabilities

The application must be scalable and maintainable.

==================================================
77. STARTING INSTRUCTION
==================================================

IMPORTANT:

The first 15 development phases have already been worked on.

Before modifying or generating code, review the current project state and identify which parts of the existing implementation correspond to the updated requirements.

Do NOT blindly recreate already completed work.

Start by reviewing:

PHASE 1 — SYSTEM ARCHITECTURE AND DEVELOPMENT PLAN

Then identify the existing implementation status of:

Phases 1–15

For every phase:

If the existing implementation is still correct:

Mark it as:

COMPLETED — NO CHANGE REQUIRED

If the new requirements affect that phase:

Mark it as:

UPDATED — CHANGES REQUIRED

Then explain the complete updated requirements for that phase before modifying code.

Do not provide a separate change/diff document.

The master development flow itself must contain the updated phase requirements.

After confirming the architecture and existing implementation, proceed one logical phase at a time.

Never skip a phase.

Never generate hundreds of files at once.

The ultimate goal is a complete, tested, production-ready Jinaarya Vihar Setu Android application with:

Vihar Sevak UI
Administrator UI
Super Administrator UI
Surat-level operational scope
Main Vihar management
Sub-Vihar management
Vihar handover
Hold management
Sevak helping information
Registration editing
Administrator-interest registration field
Administrator area management
Hard deletion of Sevak accounts
Police calling for Sevak
Police calling for Administrator
SOS
Emergency escalation
Live monitoring
Offline synchronization
Secure Supabase backend
Real-time tracking
Premium UI
Multilingual support
Future AI multi-agent architecture
and complete production deployment.

