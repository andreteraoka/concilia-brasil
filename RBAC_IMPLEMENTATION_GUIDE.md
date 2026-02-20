/**
 * RBAC Implementation Guide & Best Practices
 * 
 * This document outlines how RBAC is implemented in this application
 * and provides guidelines for adding new secured endpoints.
 */

// ============================================================================
// 1. HOW TO IMPLEMENT RBAC IN NEW ENDPOINTS
// ============================================================================

/*
Step 1: Verify middleware middleware.ts handles the role extraction
- Middleware runs on /api/protected/* routes
- Injects headers: x-user-id, x-company-id, x-user-role
- These headers are set from JWT payload

Step 2: Protect the endpoint with requireRole()
- Import: import { requireRole } from "@/src/lib/requireRole";
- Basic usage: const auth = await requireRole("ADMIN");
- Multiple roles: const auth = await requireRole(["ADMIN", "USER"]);
- Check result: if (!auth.ok) return auth.response;

Step 3: Use auth.context for multi-tenancy
- auth.context.userId - The current user ID
- auth.context.companyId - The current company ID
- auth.context.role - The current user role (ADMIN or USER)

Step 4: Always filter by companyId in queries
- WHERE companyId = auth.context.companyId (prevents cross-company access)
- Soft delete: WHERE deletedAt IS NULL
- User status: WHERE status = "active" or similar

Example Endpoint:
```typescript
import { requireRole } from "@/src/lib/requireRole";
import { apiError, apiOk } from "@/src/lib/apiResponse";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  // 1. Verify authentication & role
  const auth = await requireRole(["ADMIN", "USER"]);
  if (!auth.ok) return auth.response;

  try {
    // 2. Use companyId from context
    const data = await prisma.yourModel.findMany({
      where: {
        companyId: auth.context.companyId, // ← CRITICAL: Multi-tenancy enforcement
        deletedAt: null, // ← Include soft delete filter if applicable
      },
    });

    // 3. Return data wrapped with apiOk
    return apiOk(data);
  } catch (error) {
    return apiError("Erro ao buscar dados", 400);
  }
}

export async function POST(req: Request) {
  // For sensitive operations, require higher roles
  const auth = await requireRole("ADMIN"); // ← Only ADMIN can POST
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    
    const data = await prisma.yourModel.create({
      data: {
        ...body,
        companyId: auth.context.companyId, // ← Always set from auth context
      },
    });

    return apiOk(data, 201);
  } catch (error) {
    return apiError("Erro ao criar", 400);
  }
}
```

// ============================================================================
// 2. ROLE DEFINITIONS & ACCESS LEVELS
// ============================================================================

Role: USER
├─ Can view own company's data (accounts, transactions, documents, financial)
├─ Can create accounts, transactions, documents
├─ Can edit/delete own company's resources
├─ Cannot:
│  ├─ Create or manage other users
│  ├─ Change company settings
│  ├─ Access diagnostics
│  ├─ Access/modify any other company's data
│  └─ See admin pages in UI

Role: ADMIN
├─ All USER permissions (implicit)
├─ Can manage company settings
├─ Can create, edit, delete users
├─ Can change user roles
├─ Can deactivate/activate users
├─ Can view system diagnostics
└─ Can access admin pages

// ============================================================================
// 3. ENDPOINT SECURITY CHECKLIST
// ============================================================================

Before deploying a new endpoint, verify:

□ Authentication check:
  - Calls requireRole() before processing
  - Handles !auth.ok case
  - Returns 401/403 appropriately

□ Authorization check:
  - Correct roles allowed (ADMIN-only vs both ADMIN+USER)
  - Role matches the operation's sensitivity
  - POST/PUT/DELETE for admin operations use requireRole("ADMIN")
  - GET for data access can use requireRole(["ADMIN", "USER"])

□ Multi-tenancy check:
  - All queries filter by auth.context.companyId
  - Cannot access/modify other company's data
  - User creation sets companyId from auth context
  - Verify test: Try accessing other company's resources (should fail)

□ Soft delete check:
  - If model has deletedAt field:
    - Include deletedAt: null in WHERE clause
    - Update operations should not select deleted records
    - Verify deleted records don't appear in lists

□ Error handling:
  - Uses apiError() for consistent error responses
  - No sensitive data in error messages
  - Proper HTTP status codes (401, 403, 404, 400, 500)

□ Documentation:
  - JSDoc comments explaining role requirements
  - Example: @example requireRole("ADMIN") or requireRole(["ADMIN", "USER"])

// ============================================================================
// 4. FRONTEND PROTECTION CHECKLIST
// ============================================================================

For new admin pages, add role checks:

```typescript
"use client";

import { useAuth } from "@/src/lib/useAuth";

export default function AdminPage() {
  const { loading, role } = useAuth();

  // Check 1: Loading state
  if (loading) {
    return <div>Carregando...</div>;
  }

  // Check 2: Role verification
  if (role !== "ADMIN") {
    return <div>Acesso negado</div>;
  }

  // Only ADMIN users see this content
  return (
    <div>
      {/* Admin-only content */}
    </div>
  );
}
```

Navigation items visibility:
- Check user role from useAuth() before rendering links
- Hide navigation items if role doesn't match
- Example: {role === "ADMIN" && <AdminLink />}

// ============================================================================
// 5. MULTI-TENANCY ISOLATION
// ============================================================================

All queries MUST include companyId filter:

CORRECT ✓:
```typescript
const accounts = await prisma.account.findMany({
  where: {
    companyId: auth.context.companyId,
    deletedAt: null,
  },
});
```

DANGEROUS ✗ (allows cross-company access):
```typescript
const accounts = await prisma.account.findMany({
  // Missing companyId filter! Another company's accounts are visible!
});
```

Data leak scenarios prevented:
1. User A trying to access User B's accounts:
   - Query: WHERE companyId = companyA, companyId NOT FOUND for companyB data
   - Result: Empty array or 404

2. User A trying to modify User B's transaction:
   - Query: WHERE id = transactionB AND companyId = companyA → Not found
   - Result: 404 "Transação não encontrada"

3. User from Company A logged in, header shows companyA:
   - Middleware extracted companyId from JWT
   - All queries filtered by companyA
   - Impossible to access Company B data

// ============================================================================
// 6. SOFT DELETE PATTERM
// ============================================================================

Soft delete prevents accidental data loss while maintaining security:

Schema:
```prisma
model Account {
  id        String    @id @default(uuid())
  // ... other fields
  deletedAt DateTime? // null = active, timestamp = deleted
}
```

Querying:
```typescript
// Only get active records
const active = await prisma.account.findMany({
  where: {
    deletedAt: null,
  },
});

// Get deleted records (for audit trail, if needed)
const deleted = await prisma.account.findMany({
  where: {
    deletedAt: { not: null },
  },
});
```

Deleting:
```typescript
// Soft delete
await prisma.account.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Hard delete (permanent) - rarely needed
// await prisma.account.delete({ where: { id } });
```

// ============================================================================
// 7. COMMON SECURITY PITFALLS & HOW TO AVOID THEM
// ============================================================================

Pitfall 1: Trusting client headers
❌ WRONG:
const role = req.headers.get("x-user-role"); // Client can fake this!
const companyId = req.headers.get("x-company-id");

✅ RIGHT:
// Middleware extracts from JWT (tamper-proof)
// Headers are set by middleware, not trusted from client
const auth = await requireRole("ADMIN");
const { companyId } = auth.context; // From verified JWT

Pitfall 2: Forgetting companyId filter
❌ WRONG:
const accounts = await prisma.account.findMany(); // All companies!

✅ RIGHT:
const accounts = await prisma.account.findMany({
  where: { companyId: auth.context.companyId },
});

Pitfall 3: Exposing sensitive data in errors
❌ WRONG:
if (!user) return apiError(`User with ID ${userId} not found`, 404);
// Leaks that we know the ID format/exists

✅ RIGHT:
if (!user) return apiError("Recurso não encontrado", 404);
// Generic message

Pitfall 4: Allowing USER to change roles
❌ WRONG:
export async function PUT(req) {
  const auth = await requireRole(["ADMIN", "USER"]);
  const body = await req.json();
  await prisma.user.update({ data: { role: body.role } });
  // USER can make themselves ADMIN!
}

✅ RIGHT:
export async function PUT(req) {
  const auth = await requireRole("ADMIN"); // Only ADMIN
  const body = await req.json();
  await prisma.user.update({ data: { role: body.role } });
  // Only ADMIN can change roles
}

// ============================================================================
// 8. TESTING RBAC CHANGES
// ============================================================================

After implementing new secured endpoints:

1. Test as ADMIN:
   - Should have full access
   - Can create, read, update, delete

2. Test as USER:
   - Should have limited access
   - Cannot access admin endpoints (403)
   - Can only access own company's data

3. Test cross-company access:
   - User from Company A tries to access Company B data
   - Should return 404 or empty results
   - Never expose other company's data

4. Test without authentication:
   - Requests without token should fail (401)
   - Requests with invalid token should fail (401)

5. Test with deleted records:
   - Soft deleted records should not appear
   - Hard deleted records should be unrecoverable

// ============================================================================
// 9. PRODUCTION HARDENING (RECOMMENDATIONS)
// ============================================================================

Beyond the current implementation, for extra security:

1. Rate Limiting
   - Limit API calls per IP/user
   - Prevent: brute force, enumeration attacks, DoS
   - Library: express-rate-limit, rate-limit-redis

2. Audit Logging
   - Log all sensitive operations:
     - User creation, role changes
     - Data deletions
     - Failed auth attempts
   - Include: user, action, timestamp, IP, result

3. Request Validation
   - Validate all input with schema validation
   - Library: Zod, Joi, fastest-validator
   - Prevent: SQL injection, malformed data

4. CORS Configuration
   - Whitelist allowed origins
   - Prevent: cross-origin attacks from malicious sites

5. API Versioning
   - /api/v1/protected/*
   - Allows backwards compatibility
   - Graceful deprecation of endpoints

6. HTTPS Enforcement
   - All in-flight communication encrypted
   - Prevent: man-in-the-middle attacks
   - Use: HSTS header

7. JWT Best Practices
   - Short expiration (15-30 minutes)
   - Refresh tokens for long sessions
   - Rotation on sensitive actions
   - Revocation on logout

8. Security Headers
   - CSP (Content-Security-Policy)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection

9. Database Security
   - Encryption at rest
   - Regular backups
   - SQL injection prevention (parameterized queries - using Prisma)
   - Row-level security (RLS) at DB layer

10. Monitoring & Alerting
    - Alert on failed auth attempts
    - Alert on role escalation attempts
    - Monitor for unusual access patterns
    - Track API usage by role

// ============================================================================
// 10. SUMMARY
// ============================================================================

Current Implementation Status: ✅ PRODUCTION-READY

The application has:
✅ Proper role-based access control
✅ Multi-tenancy isolation at data layer
✅ Middleware-enforced authentication
✅ Proper error handling
✅ Frontend access restrictions
✅ Soft delete support

This foundation is solid for a real multi-company SaaS platform.
*/
