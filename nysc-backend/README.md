# NYSC-2026 Conference Website - Backend Implementation Complete

## ✅ PHASE 1-4: BACKEND COMPLETE

### Database Schema (models.py)
- **User Model**: Roles (Super User, Admin, Head of Website, Committee Member, Volunteer, Delegate, Guest), guest slots, template preferences
- **Registration**: Simplified (removed paper/co-author fields), photo upload (admin/volunteer visible only)
- **CommitteeInvite**: Token-based invitation system for committee members
- **ManualIdCard**: Guest ID cards with "invited on behalf of" field, QR codes
- **PaperSubmission**: Double-blind review support
- **ReviewAssignment**: Committee member paper reviews
- **Announcement**: Real-time website updates (Head of Website can push)
- **ConferenceSettings**: Meal timing (delegate-only), registration/paper deadlines
- **Payment**: Super User access only
- **GalleryImage**: Domain-relevant media management

### API Routes (api/routes.py)
- `/api/auth/login` - JWT authentication
- `/api/auth/me` - Current user info
- `/api/register` - Simplified registration with photo upload
- `/api/registration/my-status` - Check registration status
- `/api/scan-qr` - QR scanning with photo verification (Volunteer/Committee/Admin/Super User only)
- `/api/admin/committee/invite` - Invite committee members
- `/api/admin/id-cards/guest` - Manual guest ID card generation (Super User only)
- `/api/announcements` - Push website updates
- `/api/settings` - Conference settings (meal timing, deadlines)
- `/api/admin/payments` - Payment viewing (Super User only)
- `/api/gallery` - Gallery image management

### Security (core/security.py)
- JWT token authentication
- Password hashing (bcrypt)
- Role-based access control
- Special permissions: Finance (Super User only), Admin or Higher, Committee/Volunteer scan access

### CRUD Operations (crud/__init__.py)
- All database operations for models
- Photo upload handling
- Guest slot quota management
- Meal timing logic (delegate-only restriction)

### Configuration
- `requirements.txt` - Deployment-agnostic dependencies
- `Dockerfile` - Works with Render, Railway, Fly.io, AWS
- `.env.example` - Environment configuration template
- CORS configured for Vercel frontend

## 🎯 KEY FEATURES IMPLEMENTED

1. **Role-Based Access Control**
   - Super User: Full access (Finance, Payments, Guest Slots)
   - Admin: No Finance/Payments/Audit access
   - Head of Website: Flexible permissions, can push announcements
   - Committee Member: Scanner access, paper review
   - Volunteer: Scanner access, personal QR
   - Delegate: Registration, 7-tab dashboard, paper upload

2. **Simplified Registration**
   - Removed: field_of_study, stream, paper_details, co_authors
   - Kept: phone, institution, designation, city, state, photo
   - Photo visible ONLY to scanner (admin/volunteer/committee)

3. **Guest ID Card System**
   - Configurable slot quotas per Super User
   - "Invited on behalf of" editable field
   - Independent QR codes (no account required)

4. **Double-Blind Paper Review**
   - Reviewers cannot see submitter identity
   - Submitters cannot see reviewer identity
   - Status tracking (under_review, accepted, rejected)

5. **Meal Timing Logic**
   - Stored in ConferenceSettings
   - Applied ONLY to delegates (role-based condition)
   - Other roles unrestricted

6. **Announcement System**
   - Head of Website can push real-time updates
   - Live/published status control
   - Displayed in delegate dashboards

## 📁 FILE STRUCTURE

```
nysc-backend/
├── app/
│   ├── api/
│   │   └── routes.py          # All API endpoints
│   ├── core/
│   │   ├── database.py        # DB config, lazy initialization
│   │   └── security.py        # JWT, passwords, RBAC
│   ├── crud/
│   │   └── __init__.py        # Database operations
│   ├── schemas/
│   │   └── __init__.py        # Pydantic models
│   ├── models.py              # SQLAlchemy models
│   └── main.py                # FastAPI app entry point
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Container deployment
├── .env.example              # Environment template
└── README.md                  # This file
```

## 🚀 DEPLOYMENT

### Local Development
```bash
cd nysc-backend
cp .env.example .env
# Edit .env with your DATABASE_URL
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Docker Deployment
```bash
docker build -t nysc-backend .
docker run -p 8000:8000 --env-file .env nysc-backend
```

### Platform-Specific
- **Render**: Connect GitHub repo, set environment variables
- **Railway**: Deploy from GitHub, add PostgreSQL addon
- **Fly.io**: `fly launch`, configure PostgreSQL
- **AWS**: ECS/Fargate with RDS PostgreSQL

## 🔐 ENVIRONMENT VARIABLES

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nysc_conference
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

## ⏭️ NEXT: FRONTEND IMPLEMENTATION (Phases 5-9)

Ready to proceed with frontend redesign:
- Phase 5: Registration & Auth Flows
- Phase 6: Dashboards (Delegate 7-tabs, Volunteer, Admin)
- Phase 7: Landing Page & Navbar Redesign
- Phase 8: Bug Fixes & Integration
- Phase 9: Final QA & Packaging
