# CONFERENCE WEBSITE REVISION - PHASED IMPLEMENTATION PLAN

## PROJECT OVERVIEW
**Conference:** National Young Scientist Conference 2026 (NYSC-2026)  
**Organizers:** Central University of Karnataka, ISRO  
**Venue:** Taurian Public School, Ranchi, Jharkhand  
**Dates:** Dec 17-18, 2026

Based on the rejection feedback, the core issues were: **too complex, not user-friendly, over-featured, and buggy.** This plan prioritizes simplicity and clarity above all else.

---

## ADDITIONAL REQUIREMENTS (from Round 2 clarifications)

### A1. Speakers Section Naming
- Different categories (Chief Guest, etc.) must be **named according to their actual role**
- NOT grouped under generic "Speakers" label

### A2. Sponsors and Patrons Placement
- **Separate sections** - NOT combined into one
- Place wherever most suitable on site

### A3. Register vs Submit Naming Clarity
- **"Register to Attend"** → For anyone attending sessions
- **"Submit Paper"** → For paper submission only
- Must make clear that presenting students need BOTH actions

### A4. Hero Section Video
- Current: Earth rotating video (premium feel)
- Asset: `nysc-frontend/public/earth_rotation.mp4`
- **Open question:** Consider continuous background changes (cross-fading clips, animated layers, seamless loop)

### A5. Conference Highlights - Dynamic Poster Sizing
- Placeholders dynamically adjust to each poster's actual aspect ratio
- Remove "speakers preview" element

### A6. Missing Sections Placement
- Important Dates
- Organizing Committee  
- FAQs
- Need decided placement in new structure

### A7. Domain-Relevant Visuals
- Apply beyond Media Gallery - ALL visual/media additions
- Examples: Jharkhand's mines, forests, sustainable development contrast
- Format: Clear enough for common person to understand at a glance
- Available images in `/public/`:
  - `bg-mining.jpg`, `mining-bg.jpg` (mining backgrounds)
  - `netarhat_sunrise.png` (nature/forest)
  - `satellite_image_jharkhand.png` (aerial view)
  - `Bokaro_jharkahnd.jpeg` (industrial/mining)

---

## PHASE 1: REGISTRATION PAGE SIMPLIFICATION (`/register`)

### Frontend Changes (`src/pages/Registration.jsx`)
**REMOVE these fields completely:**
- ❌ `fieldOfStudy` (Stream of the student - for school students)
- ❌ `paperTitle` (Paper details during registration)
- ❌ `coAuthors` array (Co-author details during registration)

**KEEP these fields:**
- ✅ Basic info: category, subCategory, fullName, email, phone
- ✅ Student fields: institution, educationLevel, studentClass, graduationYear
- ✅ Address fields: state, city
- ✅ Professional fields: organization, designation, experience
- ✅ Account: password, confirmPassword
- ✅ Photo upload (with special restrictions - see below)
- ✅ Agreements: agreeDeclaration, agreeMandatory, agreeTerms

**Special Rule - Photo Upload:**
- Photo must NOT be viewable by delegate anywhere in their dashboard
- Photo must NOT be printed on ID card
- Photo ONLY visible to admins when scanning QR code for identity verification
- No UI should show the delegate their uploaded photo

### Backend Changes (`nysc-backend/app/routers/registration.py`, `auth.py`)
- Remove `paper_title` and `co_authors` from registration creation endpoint
- Ensure photo upload endpoint doesn't return photo URL to the user
- Paper submission moves to separate endpoint in `paper.py` router

### Estimated Effort: 4-6 hours

---

## PHASE 2: DELEGATE DASHBOARD RESTRUCTURE (`/dashboard`)

### Current State (5 tabs):
1. Overview
2. Schedule
3. Documents
4. Services
5. News

### Required State (7 tabs EXACTLY):
1. **Check-in Status** - shows whether they've checked in
2. **ID Card Status** - shows status of their ID card (generated/pending)
3. **Announcements** - conference announcements feed
4. **QR Code** - personal QR code for attendance/meal scanning
5. **Schedule** - personal/conference schedule
6. **Paper Upload & Tracking** - upload PDF and see submission status (under review/accepted/rejected)
7. **Help Desk** - keep as-is (already approved)

### Implementation Details (`src/pages/DelegateDashboard.jsx`)
- Create 7 new tab components
- Remove current tabs: Overview, Documents, Services
- Rename "News" to "Announcements"
- Add dedicated "Check-in Status" tab
- Add dedicated "ID Card Status" tab
- Add dedicated "QR Code" tab
- Add "Paper Upload & Tracking" tab with PDF upload and status display
- **CRITICAL:** Do NOT show delegate their uploaded registration photo anywhere
- **CRITICAL:** Do NOT add any tabs beyond these 7

### Backend Support (`nysc-backend/app/routers/delegate.py`)
- Create endpoints for each new tab
- Ensure paper submission status tracking exists
- Ensure ID card generation status is exposed

### Estimated Effort: 8-10 hours

---

## PHASE 3: VOLUNTEER PAGE SIMPLIFICATION (`/volunteer/dashboard`)

### REMOVE Completely:
- ❌ "My Tasks" section / task history
- ❌ "History" tab (attendance history)
- ❌ Any task assignment UI

### KEEP/BUILD ONLY:
- ✅ Volunteer's own personal QR code (for their identification)
- ✅ QR Scanner tool (shared reusable component)
- ✅ Self check-in button

### Implementation Details (`src/pages/VolunteerDashboard.jsx`)
- Strip down to minimal interface
- Use same QR scanner component as admin (shared component in `components/QRScanner.jsx`)
- **IMPORTANT:** Delegates must NOT have access to scanner - only their QR code to be scanned

### Estimated Effort: 3-4 hours

---

## PHASE 4: ADMIN PANEL CLEANUP (`/admin/*`)

### 4.1 Logistics Section - REMOVE Tabs:
- ❌ Timeline
- ❌ Charts
- ❌ Tasks
- ❌ Checklist

### 4.2 Technical Section - REMOVE Tabs:
- ❌ Time
- ❌ Schedule
- ❌ Charts

### 4.3 Hospitality Section - REMOVE Tabs:
- ❌ Volunteer Deployment
- ❌ Materials
- ❌ Meal Plan

### 4.4 Media Section - REMOVE ENTIRELY:
- ❌ Delete entire Media section from admin panel and navigation
- ❌ Can leave `media.py` router unused or remove it

### 4.5 Finance Section - REMOVE:
- ❌ All charts (any graphical representation)
- ✅ Keep tables and numbers only

### 4.6 Overview Section (Admin Dashboard Home) - COMPLETE REDESIGN:
- ❌ NO charts of any kind
- ✅ Show NUMBERS ONLY in CARD FORMAT
- ✅ Quick-glance flash-style summary
- ✅ Simple stat cards (label + number)
- Examples: Total registrations, Total checked-in, Hospitality numbers, Finance totals

### 4.7 Settings Section - REMOVE:
- ❌ Conference information fields
- ❌ Registration pricing fields (managed through payment gateway)

### Implementation Files:
- `src/pages/AdminDashboard.jsx`
- `src/components/admin/*` (various admin components)
- Backend routers: `admin.py`, `logistics.py`, `technical.py`, `hospitality.py`, `finance.py`, `settings.py`

### Estimated Effort: 12-15 hours

---

## PHASE 5: BACKEND LOGIC CHANGES

### 5.1 Meal Timing Role-Based Logic
**OLD:** Fixed meal timing applied to EVERYONE (all roles)  
**NEW:** Fixed meal timing applies ONLY to DELEGATES

**Implementation:**
- Modify meal scanning logic in backend
- Add role-based condition check
- Other roles (volunteers, admins, staff) NOT restricted by fixed meal timing

### 5.2 Role-Based Access Flexibility
- "Head of Website" role must be able to get additional permissions to other admin sections
- Permission system must support granting extra scoped access
- NOT hardcoded role restrictions - build as flexible/extendable permission toggle

### 5.3 Manual ID Card Generation for Special Guests (NEW FEATURE)
**Requirements:**
- Generate ID cards for people WITHOUT accounts in system
- Each manually generated ID card has its own QR code (independent of user account)
- Include editable field: "Invited on behalf of [Name]"
- Shows which sponsor/host person invited this guest

**Slot System (Configurable):**
- Super users (e.g., General Chair) have allocated invitation slots
- Each slot = one manually-created special guest ID card
- Slot count is CONFIGURABLE per super user (NOT hardcoded)
- "On behalf of" field shows the super user's name (editable)

**Backend Implementation:**
- New endpoint in `id_card.py` router
- Database model for manual ID cards
- Slot allocation system per super user

### Estimated Effort: 10-12 hours

---

## PHASE 6: BUG FIXES & QA PASS

### Known Bugs to Fix:
1. **"Call for Papers" redirect** - Currently redirects to hero section (dead link)
2. **"Schedule" mislabeling** - In Programs dropdown, should say "Technical Schedule"
3. **Overlapping sections** - "Organized By" and "Conference Venue" share same video/location
4. **Patrons and Sponsors placement** - Currently on Contact page, should be on About page
5. **Redundant registration entry points** - "Attend" dropdown + "Register" button + "Submit" button create confusion
6. **Mismatched poster aspect ratios** - Conference Highlights section

### Full QA Checklist:
- [ ] Test all navigation links
- [ ] Verify all buttons work
- [ ] Check mobile responsiveness
- [ ] Test registration flow end-to-end
- [ ] Verify delegate dashboard tabs
- [ ] Test volunteer scanner functionality
- [ ] Verify admin panel access controls
- [ ] Test paper submission flow
- [ ] Verify QR code generation and scanning
- [ ] Test payment integration

### Estimated Effort: 8-10 hours

---

## PHASE 7: UI/UX OVERHAUL - LANDING PAGE

### 7.1 Hero Section Redesign
**Issues:** Inconsistent font styles, poor color selection  
**Fix:**
- Establish consistent typography system (font family, weight, size hierarchy)
- Establish cohesive color palette (primary, secondary, accent, background, text)
- Apply consistently across hero and whole site

### 7.2 Conference Highlights Section
**Issue:** Mismatched aspect ratios (poster images vs placeholders)  
**Fix:** Standardize all posters to one orientation OR make placeholders dynamically match

### 7.3 Animations Enhancement
**Already Good:** Page-level/section-level animations - LEAVE AS-IS  
**Add:**
- Dropdown menu animations (navbar dropdowns) - smooth open/close transitions
- FAQ section animations - smooth expand/collapse transitions (currently has basic animation, enhance it)

### 7.4 "Organized By" and "Conference Venue" Separation
**Current Bug:** Both sections overlap and share same background video  
**Fix:** Separate into TWO DISTINCT sections:
1. **"Organized By"** - own background video (organizing body/institution related)
2. **"Conference Venue"** - own background video (venue-related, keep current video here)

**Action Required:** Need separate video for "Organized By" section (CUK/ISRO related)

### 7.5 Patrons and Sponsors Relocation
**Current Bug:** Content is on Contact page  
**Fix:** Move to ABOUT page instead (integrate into `About.jsx` component)

### 7.6 Navbar Structure Cleanup

**Current Issues:**
- "Programs" dropdown has item labeled "Schedule" but links to "Technical Schedule"
- "Authors" dropdown may be unnecessary (Call for Papers redirects to hero)
- "Attend" dropdown is redundant (duplicate registration link)
- "Register to Attend" and "Submit" buttons side-by-side create confusion

**Proposed Final Navbar Structure:**
```
Home | News | About ▼ | Program ▼ | Authors ▼ | Register Now [button]

About Dropdown:
- Conference Overview
- Patrons & Sponsors (MOVED FROM CONTACT)
- Organizing Committee
- Contact

Program Dropdown:
- Technical Schedule (RENAMED FROM "Schedule")
- Invited Speakers

Authors Dropdown (RE-EVALUATE - may remove):
- Call for Papers (FIX LINK - not to hero)
- Submission Guidelines
```

**OR** remove "Authors" dropdown entirely if it serves no unique purpose.

**Remove "Attend" dropdown completely** - consolidation to one clear registration path.

### 7.7 "Register to Attend" and "Submit" Separation
**Current Bug:** Placed side by side - creates confusion  
**Fix:** 
- Separate visually and/or contextually
- Distinct styling
- Consider spacing or relocating one
- Make purposes unambiguous (registering vs. submitting paper)

**Recommendation:** Keep "Register Now" as primary CTA in navbar, move "Submit Paper" to Authors section or make it a secondary action in hero.

### 7.8 "Pillars of Scientific Focus" Enhancement - NEW
**Add:** Set of images with slow fade-in effect
- Images slowly appear via FADE-IN transition (decreasing opacity fade)
- Smooth, gradual fade-in - NOT abrupt
- Effect tied to scroll/visibility

**Images Location:** Already in `/workspace/nysc-frontend/public/` (need to identify which images)

### 7.9 Background Video Readability Fix
**Issue:** Moonlight effect shines over dates text - hard to read  
**Partial Fix:** Grey gradient overlay added over dates area  
**Action:**
- Verify grey gradient overlay is properly applied
- Refine overlay (opacity, size, positioning) to blend naturally
- Should look intentional, not like a patch

### 7.10 General Landing Page Polish
- Overall quality rated very poor
- Needs FULL VISUAL POLISH PASS
- Consistency of fonts, colors, spacing, video treatment across landing page

### Files to Modify:
- `src/components/Hero.jsx`
- `src/components/Navbar.jsx`
- `src/components/About.jsx`
- `src/components/PhotoCarousel.jsx`
- `src/components/FAQ.jsx`
- `src/components/Host.jsx` (needs split into two sections)
- `src/pages/Contact.jsx` (remove sponsors)
- `src/components/Sponsors.jsx` (move to About)
- `src/pages/Landing.jsx`

### Estimated Effort: 15-18 hours

---

## PHASE 8: FINAL INTEGRATION & TESTING

### Integration Tasks:
- Merge all phase changes
- Run full end-to-end tests
- Performance optimization
- Cross-browser testing
- Mobile responsiveness verification

### Documentation:
- Update README with new structure
- Document API changes
- Create deployment guide

### Estimated Effort: 6-8 hours

---

## TOTAL ESTIMATED EFFORT: ~66-83 hours

---

## IMPLEMENTATION ORDER (RECOMMENDED)

1. ✅ **Phase 1** - Registration form simplification
2. ✅ **Phase 2** - Delegate dashboard restructure
3. ✅ **Phase 3** - Volunteer page cleanup
4. ✅ **Phase 4** - Admin panel tab removals
5. ✅ **Phase 5** - Backend logic changes (meal timing, permissions, guest ID cards)
6. ✅ **Phase 6** - Bug fixes & QA pass
7. ✅ **Phase 7** - UI/UX overhaul (landing page, navbar)
8. ✅ **Phase 8** - Final integration & testing

---

## QUESTIONS FOR CLIENT BEFORE STARTING

1. **Video Assets:** Do you have a separate background video for the "Organized By" section (CUK/ISRO related), or should we use a static image/placeholder?

2. **Pillars Images:** Which specific images in `/public/` should be used for the "Pillars of Scientific Focus" fade-in effect? Or will you provide new ones?

3. **Navbar Final Structure:** Please confirm the exact navbar structure you want. My recommendation above removes redundancy - do you approve?

4. **Guest ID Card Slots:** Which specific admin roles should have configurable guest invitation slots? (General Chair only, or also other roles?)

5. **Color Palette:** Should I propose a cohesive color palette for the redesign, or do you have specific colors in mind?

6. **Timeline:** What is your deadline for completion?

---

## NEXT STEPS

Once you confirm the answers to the questions above, I will:
1. Start with Phase 1 (Registration simplification)
2. Proceed sequentially through each phase
3. Provide updates after each phase completion
4. Allow you to test and provide feedback between phases

**Shall I proceed with Phase 1?**
