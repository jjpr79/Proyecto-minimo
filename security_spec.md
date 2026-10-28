# Security Specification: Multitenant Authentication

## 1. Data Invariants
- Users are not global entities; they belong to one or more tenants via a membership subcollection.
- Access to any tenant resource is strictly derived from the membership document in `tenants/{tenantId}/members/{userId}`.
- Tenant membership must have an associated role (e.g., 'admin', 'member').
- A user cannot modify their own role or other members' roles unless they are a tenant 'admin'.

## 2. The "Dirty Dozen" Payloads (Test cases)
1. Unauthorized read of a tenant document by a non-member.
2. Unauthorized write to a tenant document by a non-member.
3. Attempting to assign a role to oneself during membership creation.
4. Attempting to update a role of another member without admin privileges.
5. Accessing tenant A's data while authenticated as a member of tenant B.
6. Injecting a 1MB string into the tenant name field.
7. Attempting to delete the last admin of a tenant.
8. Updating a document field that should be immutable (e.g., tenantId).
9. Creating a member document in a non-existent tenant.
10. Spoofing an admin role via a forged document.
11. Reading PII of another member without authorization.
12. Creating a tenant without setting oneself as the initial admin.

## 3. Test Runner
(To be implemented in firestore.rules.test.ts)
