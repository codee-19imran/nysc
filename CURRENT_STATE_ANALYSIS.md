# NYSC-2026 Conference Website - Current State Analysis

## 📊 CODEBASE OVERVIEW

### Frontend Structure (`/workspace/nysc-frontend/`)
**Framework:** React + Vite  
**Key Dependencies:** React Router, Tailwind CSS, Lucide Icons

#### Pages Located:
- `src/pages/Landing.jsx` - Home page
- `src/pages/Registration.jsx` (836 lines) - Registration form ⚠️ NEEDS SIMPLIFICATION
- `src/pages/DelegateDashboard.jsx` (796 lines) - Delegate dashboard ⚠️ NEEDS RESTRUCTURE
- `src/pages/VolunteerDashboard.jsx` (347 lines) - Volunteer dashboard ⚠️ NEEDS CLEANUP
- `src/pages/AdminDashboard.jsx` (322 lines) - Admin panel ⚠️ NEEDS TAB REMOVALS
- `src/pages/Speakers.jsx` - Speakers section ⚠️ NEEDS ROLE NAMING
- `src/pages/About.jsx` - About page
- `src/pages/Contact.jsx` ⚠️ Has Patrons/Sponsors that need moving
- `src/pages/Schedule.jsx` - Schedule page
- `src/pages/PaperSubmission.jsx` - Paper submission
- And more...

#### Key Components:
- `src/components/Hero.jsx` ⚠️ Needs redesign (font/color issues)
- `src/components/Navbar.jsx` ⚠️ Needs cleanup (redundant dropdowns)
- `src/components/Host.jsx` ⚠️ Overlapping sections bug
- `src/components/PhotoCarousel.jsx` ⚠️ Aspect ratio issues
- `src/components/FAQ.jsx` ⚠️ Missing animations
- `src/components/Sponsors.jsx` ⚠️ Wrong placement
- `src/components/QRScanner.jsx` ✅ Shared component for volunteers/admins
- `src/components/admin/*` - Various admin components ⚠️ Need removals

#### Public Assets (`/public/`):
- `earth_rotation.mp4` - Hero video (premium feel, keep)
- `hero_2.mp4` - Alternative hero video
- Mining/nature images for domain-relevant visuals:
  - `bg-mining.jpg`, `mining-bg.jpg`
  - `netarhat_sunrise.png` (forest/nature)
  - `satellite_image_jharkhand.png` (aerial view)
  - `Bokaro_jharkahnd.jpeg` (industrial/mining)
- Poster images in `/carosal/` folder

---

### Backend Structure (`/workspace/nysc-backend/`)
**Framework:** FastAPI + SQLAlchemy  
**Database:** PostgreSQL (via Alembic migrations)

#### Key Routers to Modify:
- `app/routers/auth.py` - Authentication & photo upload
- `app/routers/registration.py` ⚠️ Remove paper/co-author fields
- `app/routers/papers.py` - Paper submission (move from registration)
- `app/routers/delegate.py` ⚠️ New endpoints for 7 tabs
- `app/routers/volunteer.py` ⚠️ Remove task endpoints
- `app/routers/admin.py` ⚠️ Remove unused endpoints
- `app/routers/logistics.py`, `technical.py`, `hospitality.py`, `finance.py` ⚠️ Remove chart data
- `app/routers/media.py` ❌ DELETE ENTIRELY
- `app/routers/id_card.py` - Add manual ID card generation

#### Models to Update:
- User model (role permissions)
- Registration model (remove paper fields)
- Paper model (standalone, not tied to registration)
- IDCard model (add manual generation fields)
- GuestSlot model (new - for configurable invitation slots)

---

## ⚠️ CRITICAL ISSUES IDENTIFIED

### 1. Registration Page Issues (Phase 1 Priority)
**Current fields that MUST BE REMOVED:**
```javascript
// Line 39: fieldOfStudy (Stream of student)
fieldOfStudy: '',

// Lines 52-53: Paper details
paperTitle: '',
coAuthors: [{ name: '', institution: '', email: '' }],
```

**Validation logic to remove (lines 187-192, 206-208):**
- School student stream validation
- Paper title validation in step 2
- Co-author management functions (lines 109-130)

**Step 2 completely removed** for non-presenters - paper submission moves to dashboard

### 2. Delegate Dashboard Issues (Phase 2 Priority)
**Current tabs (5 total):**
1. Overview ❌ REMOVE
2. Schedule ✅ KEEP (but rename/move)
3. Documents ❌ REMOVE
4. Services ❌ REMOVE
5. News ✅ KEEP (rename to Announcements)

**Required tabs (7 total):**
1. Check-in Status ❌ NEW
2. ID Card Status ❌ NEW
3. Announcements ✅ (from News)
4. QR Code ❌ NEW
5. Schedule ✅ KEEP
6. Paper Upload & Tracking ❌ NEW
7. Help Desk ✅ KEEP AS-IS

### 3. Navbar Issues (Phase 7 Priority)
**Current structure has these problems:**
- "Attend" dropdown ❌ REDUNDANT (remove entirely)
- "Authors" dropdown ❌ CONFUSING (Call for Papers → hero section = dead link)
- "Schedule" label ❌ MISLEADING (should be "Technical Schedule")
- "Register to Attend" + "Submit" buttons side-by-side ❌ CONFUSING

### 4. Host Component Bug (Phase 7 Priority)
**File:** `src/components/Host.jsx`

**Current bug:** Both "Organized By" and "Conference Venue" sections:
- Share same background video (`earth_rotation.mp4`)
- Overlap at same location
- Need separate videos and distinct sections

### 5. Patrons/Sponsors Placement Bug (Phase 7 Priority)
**Current:** In `src/pages/Contact.jsx` ❌ WRONG  
**Should be:** In `src/pages/About.jsx` ✅

### 6. Photo Carousel Aspect Ratio (Phase 7 Priority)
**File:** `src/components/PhotoCarousel.jsx`

**Issue:** Mismatched aspect ratios between placeholders and actual posters  
**Solution:** Dynamic placeholder sizing based on image dimensions

---

## ✅ WHAT'S ALREADY GOOD

1. **QR Scanner component** (`src/components/QRScanner.jsx`) - Already reusable, shared between admin/volunteer
2. **Help Desk section** - Already approved, no changes needed
3. **Team Invitation section** - Already works correctly
4. **Page-level animations** - Already implemented well
5. **Hero video concept** - Earth rotation is premium, just needs refinement

---

## 🎯 IMPLEMENTATION STRATEGY

### Phase 1: Registration Simplification (START HERE)
**Files to modify:**
1. `src/pages/Registration.jsx` - Remove fields, simplify flow
2. `nysc-backend/app/routers/registration.py` - Remove paper endpoints
3. `nysc-backend/app/routers/auth.py` - Ensure photo doesn't return URL to user

**Changes:**
- Remove `fieldOfStudy`, `paperTitle`, `coAuthors` from form state
- Remove Step 2 entirely for non-presenters
- Remove co-author add/remove functions
- Remove paper validation logic
- Keep photo upload but ensure it's admin-only visible

### Phase 2: Delegate Dashboard Restructure
**Files to modify:**
1. `src/pages/DelegateDashboard.jsx` - Complete restructure
2. `src/components/` - Create 7 new tab components
3. Backend delegate router - Add new endpoints

### Phase 3-8: Continue sequentially per IMPLEMENTATION_PLAN.md

---

## 🔍 SPECIFIC LINE REFERENCES FOR PHASE 1

### Registration.jsx - Lines to REMOVE:
- Line 39: `fieldOfStudy: '',`
- Lines 52-53: `paperTitle` and `coAuthors`
- Lines 109-130: `handleCoAuthorChange`, `addCoAuthor`, `removeCoAuthor` functions
- Lines 187-192: School student stream validation
- Lines 206-208: Paper title validation
- Lines 467-468: SubCategoryCard references to "Paper Presenter"
- Lines 601-655: Entire Step 2 section (Paper Information + Co-authors)
- Lines 143, 146-157: `isNonPresenter` logic and progressSteps conditional

### Registration.jsx - Lines to MODIFY:
- Lines 146-157: Simplify to always show 2 steps (Profile → Payment)
- Line 467: Change "Paper Presenter" to just "Student Presenter" or similar
- Lines 278-284: Remove Step 2 paper submission logic

---

## 📝 QUESTIONS RESOLVED FROM CLIENT

✅ **Separate sections for Sponsors and Patrons** - Not combined  
✅ **Dynamic poster sizing** - Placeholders adjust to aspect ratio  
✅ **Domain-relevant visuals** - Use mining/forest images from `/public/`  
✅ **Role-based naming for speakers** - Chief Guest, etc., not generic "Speakers"  
✅ **Clear Register vs Submit naming** - Distinguish attendance registration from paper submission  
✅ **Admin guest invitation slots** - Configurable per super user role  

❓ **OPEN QUESTION:** Video for "Organized By" section - Do you have separate CUK/ISRO video or use static image?

---

## 🚀 READY TO START PHASE 1

All analysis complete. The implementation plan is solid and all files have been identified. 

**Next action:** Begin Phase 1 - Registration Page Simplification by modifying `Registration.jsx` to remove the three prohibited fields and simplify the flow to 2 steps maximum.

Shall I proceed with Phase 1 implementation?
