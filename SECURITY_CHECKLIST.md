# SECURITY CHECKLIST FOR NEW ENDPOINTS

Use this checklist when adding new API endpoints or features. Ensures consistent security practices across the codebase.

---

## PRE-IMPLEMENTATION CHECKLIST

### Before You Code

**[ ] 1. Determine Role Requirements**
- Is this endpoint for ADMIN only?
- Should both ADMIN and USER have access?
- Is there user-level granularity (own data vs all data)?
- Document decision in code comments

**[ ] 2. Define Data Scope**
- Should endpoint access own company data only?
- Can different roles see different data?
- Are there any soft-deleted records to exclude?
- Document scoping rules in endpoint documentation

**[ ] 3. Identify Sensitive Operations**
- CREATE: Does it create sensitive resources (users, admin access)?
- UPDATE: Can it change critical fields (role, company, deleted status)?
- DELETE: Is it hard delete or soft delete (should be soft)?
- Document any restrictions in code

**[ ] 4. Check for Precedent**
- Look at similar endpoints in codebase
- Follow existing patterns (error handling, response format)
- Use same error response format as other endpoints
- Match style with existing code

**[ ] 5. Plan Multi-Tenancy**
- All queries MUST include: `WHERE companyId = auth.context.companyId`
- How will you handle cross-company access attempts?
- Should it be 403 Forbidden or 404 Not Found? (404 is safer)
- Test with accounts from different companies

---

## IMPLEMENTATION CHECKLIST

### While Coding

**[ ] 1. Add Role Validation**
```typescript
import { requireRole } from "@/lib/requireRole";

// For ADMIN-only endpoint:
await requireRole(request, "ADMIN");

// For ADMIN or USER:
await requireRole(request, ["ADMIN", "USER"]);
```

**[ ] 2. Extract Authentication Context**
```typescript
const authContext = getRequestContext(request);
// Now have: authContext.userId, authContext.companyId, authContext.role
```

**[ ] 3. Apply Multi-Tenancy Filter**
- Every SELECT query must filter by companyId
- Every UPDATE/DELETE operation must verify ownership
- Return 404 for cross-company access attempts (not 403)

**[ ] 4. Handle Soft Deletes**
```typescript
WHERE deletedAt IS NULL  // Always exclude deleted records in SELECT
```

**[ ] 5. Validate Input**
- Check required fields
- Validate field types and formats
- Prevent SQL injection (use parameterized queries)
- Sanitize user input

**[ ] 6. Use Consistent Error Responses**
```typescript
// Authentication error:
return NextResponse.json({ error: "Token ausente" }, { status: 401 });

// Authorization error:
return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

// Not found:
return NextResponse.json({ error: "Recurso nao encontrado" }, { status: 404 });

// Validation error:
return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
```

**[ ] 7. Add Error Handling**
- Catch and log errors without exposing sensitive info
- Return generic error messages to client
- Log actual error server-side for debugging

**[ ] 8. Test RBAC Before Submitting**
- Does requireRole() prevent USER access to ADMIN endpoints?
- Does multi-tenancy filter prevent cross-company access?
- Do error messages match existing patterns?

---

## TESTING CHECKLIST

### Manual Testing

**[ ] 1. Authentication Tests**
- Can unauthenticated request access endpoint? (should be 401)
- Does invalid token get rejected? (should be 401)
- Does valid token grant access? (should work)

**[ ] 2. Authorization Tests (Role-Based)**
- Can USER access ADMIN-only endpoint? (should be 403)
- Can ADMIN access USER endpoint? (should work)
- Are correct roles enforced? (requireRole validation)

**[ ] 3. Multi-Tenancy Tests**
- Does User A see only Company A data?
- Can User A access Company B resources? (should be 404)
- Can User A modify Company B records? (should be 404)

**[ ] 4. Data Integrity Tests**
- Does soft delete work (deletedAt is set)?
- Do deleted records not appear in LIST responses?
- Are soft-deleted records excluded from aggregations?

**[ ] 5. Error Response Tests**
- Do 401 errors appear for missing tokens?
- Do 403 errors appear for insufficient roles?
- Do 404 errors appear for missing resources?
- Are error messages generic (no sensitive info leakage)?

---

## CODE REVIEW CHECKLIST

### When Reviewing Others' Code

**[ ] 1. Role Validation Present**
- Is `requireRole()` called appropriately?
- Are all ADMIN-only endpoints protected?
- Are role requirements documented?

**[ ] 2. Multi-Tenancy Enforcement**
- Do all queries filter by `companyId`?
- Do all mutations verify ownership before modifying?
- Would cross-company access return 404, not 500?

**[ ] 3. Soft Delete Enforcement**
- Do SELECT queries include `WHERE deletedAt IS NULL`?
- Do aggregations (SUM, COUNT, AVG) exclude deleted records?
- Can you delete a record twice? (idempotent)

**[ ] 4. Input Validation**
- Are all user inputs validated?
- Are error messages meaningful but not leaking info?
- Are there checks for SQL injection vulnerabilities?

**[ ] 5. Consistency**
- Do error responses match existing patterns?
- Does code style match rest of codebase?
- Are similar endpoints implemented similarly?

**[ ] 6. Documentation**
- Are role requirements documented in comments?
- Is multi-tenancy scoping explained?
- Are sensitive operations noted?

---

## COMMON SECURITY ANTI-PATTERNS

### ❌ DO NOT DO THIS

**1. Trusting Client-Provided Headers**
```typescript
// WRONG:
const role = request.headers.get("x-user-role");

// RIGHT:
const authContext = getRequestContext(request);
const role = authContext.role; // From JWT, not client
```

**2. Missing Role Checks**
```typescript
// WRONG - endpoint is open to everyone:
export async function GET(request: Request) {
  const data = await db.query("SELECT * FROM users");
  return NextResponse.json(data);
}

// RIGHT - endpoint has role check:
export async function GET(request: Request) {
  await requireRole(request, "ADMIN");
  const data = await db.query("SELECT * FROM users WHERE companyId = ?");
  return NextResponse.json(data);
}
```

**3. Forgetting Multi-Tenancy Filter**
```typescript
// WRONG - returns data from ALL companies:
const accounts = await db.query("SELECT * FROM accounts");

// RIGHT - only return this company's data:
const accounts = await db.query(
  "SELECT * FROM accounts WHERE companyId = ? AND deletedAt IS NULL",
  [authContext.companyId]
);
```

**4. Hard Delete Instead of Soft Delete**
```typescript
// WRONG - data is permanently lost:
await db.query("DELETE FROM accounts WHERE id = ?");

// RIGHT - mark as deleted, preserve data:
await db.query("UPDATE accounts SET deletedAt = NOW() WHERE id = ?");
```

**5. Exposing Sensitive Data in Errors**
```typescript
// WRONG - leaks sensitive info:
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// RIGHT - generic error message:
catch (error) {
  console.error("Error creating account:", error);
  return NextResponse.json({ error: "Erro ao processar requisicao" }, { status: 500 });
}
```

**6. Using 403 for Missing Resources**
```typescript
// WRONG - allows attacker to enumerate valid IDs:
if (!account) {
  return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
}

// RIGHT - don't reveal whether resource exists:
if (!account) {
  return NextResponse.json({ error: "Recurso nao encontrado" }, { status: 404 });
}
```

---

## RBAC RULE SUMMARY

### Access Control Matrix

| Endpoint | USER | ADMIN | Notes |
|----------|------|-------|-------|
| GET /api/protected/accounts | ✅ own | ✅ all | Filtered by companyId |
| POST /api/protected/accounts | ✅ | ✅ | Creates in user's company |
| PUT /api/protected/accounts/{id} | ✅ own | ✅ own | Multi-tenancy enforced |
| DELETE /api/protected/accounts/{id} | ✅ own | ✅ own | Soft delete (deletedAt) |
| GET /api/protected/transactions | ✅ | ✅ | Company-scoped |
| POST /api/protected/transactions | ✅ | ✅ | Company-scoped |
| DELETE /api/protected/transactions/{id} | ✅ own | ✅ own | Soft delete |
| GET /api/protected/users | ❌ | ✅ | ADMIN-only |
| POST /api/protected/users | ❌ | ✅ | ADMIN-only |
| PUT /api/protected/users/{id} | ❌ | ✅ | Role/status changes |
| GET /api/protected/diagnostics | ❌ | ✅ | ADMIN-only |
| GET /api/protected/companies | ❌ | ✅ | ADMIN-only |
| PUT /api/protected/companies | ❌ | ✅ | ADMIN-only |
| GET /api/protected/financial/* | ✅ | ✅ | Company-scoped aggregations |

---

## DEPLOYMENT SECURITY CHECKLIST

### Before Production

**[ ] 1. Environment Variables**
- Is JWT_SECRET set and strong?
- Are all sensitive values in .env.local (not git)?
- Are API keys rotated?

**[ ] 2. Database Security**
- Is DATABASE_URL pointing to production database?
- Are backups enabled?
- Is SSL/TLS enabled for DB connections?
- Are unused user accounts removed?

**[ ] 3. API Security**
- Are HTTPS/TLS enforced?
- Is rate limiting configured on auth endpoints?
- Are CORS headers restrictive?
- Is CSP (Content Security Policy) configured?

**[ ] 4. Monitoring & Logging**
- Are failed auth attempts logged?
- Are admin actions logged for audit trail?
- Is error logging configured?
- Are logs stored securely?

**[ ] 5. Access Control**
- Are all protected routes behind requireRole()?
- Is multi-tenancy enforced on all queries?
- Are soft deletes working correctly?

---

## QUICK REFERENCE

### Adding a New Protected Endpoint

1. **Determine role**: ADMIN-only? Or ADMIN + USER?
2. **Extract context**: `const authContext = getRequestContext(request)`
3. **Check role**: `await requireRole(request, "ADMIN")`
4. **Apply filter**: `WHERE companyId = authContext.companyId`
5. **Validate input**: Check required fields
6. **Use soft delete**: `UPDATE table SET deletedAt = NOW()`
7. **Handle errors**: Return generic error messages
8. **Test**: Verify role check and multi-tenancy isolation

### Testing a New Endpoint

```bash
# Test without token (should be 401)
curl https://api/protected/endpoint

# Test with USER token (should respect role check)
curl -H "Authorization: Bearer USER_TOKEN" https://api/protected/endpoint

# Test cross-company access (should be 404)
curl -H "Authorization: Bearer USER_TOKEN_A" https://api/protected/endpoint/COMPANY_B_ID
```

---

## RELATED DOCUMENTATION

- [RBAC Security Audit](./RBAC_SECURITY_AUDIT.md) - Complete security audit findings
- [RBAC Implementation Guide](./RBAC_IMPLEMENTATION_GUIDE.md) - Detailed implementation patterns
- [Test Scenarios](./tests/rbac.security.test.ts) - 41 test scenarios and manual testing guide
