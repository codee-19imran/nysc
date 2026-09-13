"""
RBAC SEED SCRIPT - EXPANDED
Seeds roles, permissions, and page-level access.
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission

def seed_rbac():
    db: Session = SessionLocal()
    
    try:
        if db.query(Role).count() > 0:
            print("WARNING: RBAC data already exists.")
            response = input("   Wipe and re-seed? (y/n): ").strip().lower()
            if response != "y":
                return
            # Wipe existing data
            db.query(RolePermission).delete()
            db.query(Permission).delete()
            db.query(Role).delete()
            db.commit()
            print("   [DELETED] Cleared existing RBAC data.")
        
        print("Seeding RBAC data...")
        
        # --- 1. Create All Roles (10 total) ---
        roles_data = [
            # Core roles
            {"name": "super_admin", "description": "Root administrator with full system access", "is_system_role": True},
            {"name": "admin", "description": "Regular administrator with full access", "is_system_role": True},
            {"name": "delegate", "description": "Regular attendee", "is_system_role": True},
            {"name": "presenter", "description": "Paper submitter", "is_system_role": True},
            {"name": "volunteer", "description": "Event operations (QR scanning)", "is_system_role": True},
            
            # Department Head roles (NEW)
            {"name": "logistics_head", "description": "Head of Logistics Department", "is_system_role": True},
            {"name": "technical_head", "description": "Head of Technical Department", "is_system_role": True},
            {"name": "hospitality_head", "description": "Head of Hospitality Department", "is_system_role": True},
            {"name": "media_head", "description": "Head of Media Department", "is_system_role": True},
            {"name": "website_head", "description": "Head of Website Department", "is_system_role": True},
            {"name": "committee_member", "description": "Committee member under a department head", "is_system_role": True},
        ]
        
        roles = {}
        for role_data in roles_data:
            role = Role(**role_data)
            db.add(role)
            db.flush()
            roles[role_data["name"]] = role
        
        print(f"Created {len(roles)} roles")
        
        # --- 2. Create All Permissions ---
        permissions_data = [
            # PAGE-LEVEL PERMISSIONS (NEW - controls sidebar visibility)
            {"name": "page:overview", "description": "Access to Overview dashboard", "category": "page"},
            {"name": "page:users", "description": "Access to User Management", "category": "page"},
            {"name": "page:papers", "description": "Access to Paper Review", "category": "page"},
            {"name": "page:payments", "description": "Access to Payments", "category": "page"},
            {"name": "page:audit", "description": "Access to Audit Logs", "category": "page"},
            {"name": "page:settings", "description": "Access to Settings", "category": "page"},
            {"name": "page:logistics", "description": "Access to Logistics Management", "category": "page"},
            {"name": "page:technical", "description": "Access to Technical Management", "category": "page"},
            {"name": "page:hospitality", "description": "Access to Hospitality Management", "category": "page"},
            {"name": "page:media", "description": "Access to Media Management", "category": "page"},
            {"name": "page:website", "description": "Access to Website Management", "category": "page"},
            
            # MEDIA PERMISSIONS (NEW)
            {"name": "media:view", "description": "View media data", "category": "media"},
            {"name": "media:publicity", "description": "Manage publicity tasks", "category": "media"},
            {"name": "media:archive", "description": "Manage media archive", "category": "media"},
            {"name": "media:social", "description": "Manage social media posts", "category": "media"},
            {"name": "media:press", "description": "Manage press notes", "category": "media"},
            {"name": "page:volunteer_dashboard", "description": "Access volunteer dashboard", "category": "page"},
            {"name": "page:committee_dashboard", "description": "Access committee dashboard", "category": "page"},
            {"name": "page:attendance", "description": "Access attendance tracking", "category": "page"},
            
            # Committee Management
            {"name": "committee:manage", "description": "Add/remove committee members", "category": "committee"},
            
            # Attendance
            {"name": "attendance:view_all", "description": "View all attendance records", "category": "attendance"},
            
            # User Management
            {"name": "user:view", "description": "View user profiles", "category": "user"},
            {"name": "user:create", "description": "Create new users", "category": "user"},
            {"name": "user:edit", "description": "Edit user data", "category": "user"},
            {"name": "user:delete", "description": "Delete users", "category": "user"},
            {"name": "user:invite_admin", "description": "Invite new admins", "category": "user"},
            
            # Paper Management
            {"name": "paper:view_all", "description": "View all papers", "category": "paper"},
            {"name": "paper:view_assigned", "description": "View only assigned papers", "category": "paper"},
            {"name": "paper:assign", "description": "Assign papers to reviewers", "category": "paper"},
            {"name": "paper:review", "description": "Submit reviews", "category": "paper"},
            {"name": "paper:delete", "description": "Delete papers", "category": "paper"},
            
            # Payment Management
            {"name": "payment:view", "description": "View payment data", "category": "payment"},
            {"name": "payment:edit", "description": "Manually mark payments", "category": "payment"},
            {"name": "payment:refund", "description": "Process refunds", "category": "payment"},
            {"name": "payment:export", "description": "Export payment reports", "category": "payment"},
            
            # Event Operations
            {"name": "event:checkin", "description": "Scan QR for attendance", "category": "event"},
            {"name": "event:meal_scan", "description": "Scan QR for food coupons", "category": "event"},
            {"name": "event:view_stats", "description": "View live event stats", "category": "event"},
            
            # Communication
            {"name": "announcement:send", "description": "Send announcements", "category": "announcement"},
            {"name": "announcement:view", "description": "View announcement history", "category": "announcement"},
            
            # System
            {"name": "audit:view", "description": "View audit logs", "category": "system"},
            {"name": "settings:edit", "description": "Edit conference settings", "category": "system"},
            {"name": "admin:manage", "description": "Create/revoke admin invites", "category": "system"},
            
            # LOGISTICS PERMISSIONS (NEW)
            {"name": "venue:view", "description": "View logistics tasks/equipment/rooms", "category": "venue"},
            {"name": "venue:edit", "description": "Edit logistics data", "category": "venue"},
            {"name": "venue:assign", "description": "Assign tasks to volunteers", "category": "venue"},
            {"name": "venue:export", "description": "Export logistics data", "category": "venue"},
            {"name": "venue:checklist", "description": "Manage checklists", "category": "venue"},
            
            # TECHNICAL PERMISSIONS (NEW)
            {"name": "technical:view", "description": "View technical data", "category": "technical"},
            {"name": "technical:edit", "description": "Edit sessions, judges, etc.", "category": "technical"},
            {"name": "technical:schedule", "description": "Schedule sessions, assign papers", "category": "technical"},
            {"name": "technical:judges", "description": "Manage judges/evaluators", "category": "technical"},
            {"name": "technical:rubrics", "description": "Manage evaluation criteria", "category": "technical"},
            {"name": "technical:challenges", "description": "Manage technical challenges", "category": "technical"},
            {"name": "technical:demos", "description": "Manage demos/exhibitions", "category": "technical"},
            {"name": "technical:export", "description": "Export technical data", "category": "technical"},
            {"name": "technical:checklist", "description": "Manage checklists", "category": "technical"},
            
            # HOSPITALITY PERMISSIONS (NEW)
            {"name": "hospitality:view", "description": "View hospitality data", "category": "hospitality"},
            {"name": "hospitality:edit", "description": "Edit guests, meals, ceremonies", "category": "hospitality"},
            {"name": "hospitality:participants", "description": "Manage all participants", "category": "hospitality"},
            {"name": "hospitality:guests", "description": "Manage guests/VIPs", "category": "hospitality"},
            {"name": "hospitality:protocol", "description": "Manage protocol arrangements", "category": "hospitality"},
            {"name": "hospitality:volunteers", "description": "Assign tasks to volunteers", "category": "hospitality"},
            {"name": "hospitality:helpdesk", "description": "Manage help desk requests", "category": "hospitality"},
            {"name": "hospitality:materials", "description": "Manage materials distribution", "category": "hospitality"},
            {"name": "hospitality:export", "description": "Export hospitality data", "category": "hospitality"},
            
            # WEBSITE PERMISSIONS (NEW)
            {"name": "website:view", "description": "View website data", "category": "website"},
            {"name": "website:content", "description": "Manage website pages & news", "category": "website"},
            {"name": "website:registrations", "description": "View registrations (read-only)", "category": "website"},
            {"name": "website:participants", "description": "Access participant database", "category": "website"},
            {"name": "website:communications", "description": "Send communications", "category": "website"},
            {"name": "website:forms", "description": "Manage online forms", "category": "website"},
            {"name": "website:records", "description": "Access digital records", "category": "website"},
            {"name": "website:export", "description": "Export website data", "category": "website"},
            
            # Super Admin only (Website)
            {"name": "website:payment_history", "description": "View payment history (Super Admin)", "category": "website"},
            {"name": "website:paper_submissions", "description": "View paper submissions (Super Admin)", "category": "website"},
            {"name": "website:review_records", "description": "View review records (Super Admin)", "category": "website"},
        ]
        
        permissions = {}
        for perm_data in permissions_data:
            perm = Permission(**perm_data)
            db.add(perm)
            db.flush()
            permissions[perm_data["name"]] = perm
        
        print(f"Created {len(permissions)} permissions")
        
        # --- 3. Map Roles to Permissions ---
        role_permissions_map = {
            # Super Admin: EVERYTHING
            "super_admin": list(permissions.keys()),
            
            # Regular Admin: All except audit
            "admin": [p for p in permissions.keys() if p != "audit:view"],
            
            # Department Heads: Overview + their department only
            "logistics_head": [
                "page:overview", "page:logistics", "page:attendance",
                "venue:view", "venue:edit", "venue:assign", "venue:export", "venue:checklist",
                "event:view_stats", "event:checkin", "event:meal_scan",
                "committee:manage",
                "attendance:view_all"
            ],
            "technical_head": [
                "page:overview", "page:technical",
                "technical:view", "technical:edit", "technical:schedule",
                "technical:judges", "technical:rubrics", "technical:challenges",
                "technical:demos", "technical:export", "technical:checklist",
                "paper:view_all",
                "event:view_stats",
            ],
            "hospitality_head": [
                "page:overview", "page:hospitality",
                "hospitality:view", "hospitality:edit", "hospitality:participants",
                "hospitality:guests", "hospitality:protocol", "hospitality:volunteers",
                "hospitality:helpdesk", "hospitality:materials", "hospitality:export",
                "event:view_stats", "event:checkin",
                "venue:view", "venue:assign",  # To manage volunteer tasks
            ],
            "media_head": [
                "page:overview", "page:media",
                "media:view", "media:publicity", "media:archive",
                "media:social", "media:press",
            ],
            "website_head": [
                "page:overview", "page:website",
                "website:view", "website:content", "website:registrations",
                "website:participants", "website:communications", "website:forms",
                "website:records", "website:export",
                "user:view",
                "event:view_stats",
                "announcement:send",
            ],
            
            # Regular users
            "committee_member": [
                "page:volunteer_dashboard",
                "event:checkin",
                "event:meal_scan"
            ],
            "volunteer": ["event:checkin", "event:meal_scan"],
            "presenter": [],
            "delegate": [],
        }
        
        for role_name, perm_names in role_permissions_map.items():
            role = roles[role_name]
            for perm_name in perm_names:
                perm = permissions[perm_name]
                role_perm = RolePermission(role_id=role.id, permission_id=perm.id)
                db.add(role_perm)
        
        print(f"Mapped roles to permissions")
        
        db.commit()
        print("\nRBAC seed completed successfully!")
        print("\nRole Summary:")
        print("   • super_admin: ALL permissions")
        print("   • admin: All except audit")
        print("   • logistics_head: Overview + Logistics only")
        print("   • technical_head: Overview + Technical only")
        print("   • hospitality_head: Overview + Hospitality only")
        print("   • media_head: Overview + Media only")
        print("   • website_head: Overview + Website only")
        print("   • volunteer/presenter/delegate: Limited access")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_rbac()
