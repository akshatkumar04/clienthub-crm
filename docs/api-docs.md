# ClientHub – API Reference

Base URL (local): `http://localhost:5000/api`

The API exposes **32 REST endpoints**.

## Conventions

### Authentication
Session based. `POST /auth/login` sets an `httpOnly` cookie named `clienthub.sid`; send it on every
request (browsers do this automatically with `withCredentials`; Postman keeps a cookie jar).
There is no token to copy around.

### Response envelope
Every response, success or failure, has the same shape:

```json
{ "success": true, "data": { }, "message": "Human readable message" }
```

### Status codes

| Code | Meaning |
| --- | --- |
| 200 / 201 | Success / created |
| 400 | Malformed request, invalid id, or a business rule (e.g. demoting the only admin) |
| 401 | Not logged in, or bad credentials |
| 403 | Logged in but the role is not allowed (admin-only route) |
| 404 | Not found **or not visible to you** (execs get 404 for records owned by others) |
| 409 | Conflict: duplicate email, lead already converted, record still referenced |
| 422 | Validation failed; `data` is a list of `{ field, message }` |
| 500 | Unexpected server error |

Validation error example:

```json
{
  "success": false,
  "data": [{ "field": "email", "message": "A valid email is required" }],
  "message": "Validation failed"
}
```

### Pagination
List endpoints accept `page` (default 1) and `limit` (default noted per endpoint, max 200) and return:

```json
{
  "items": [ ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "pages": 5 }
}
```

### Access legend
**Public** = no session needed · **Any** = any logged-in user (execs are limited to their own records) · **Admin** = admin only.

## Endpoint index

| # | Method | Route | Access |
| --- | --- | --- | --- |
| 1 | GET | `/health` | Public |
| 2 | POST | `/auth/login` | Public |
| 3 | POST | `/auth/logout` | Public |
| 4 | GET | `/auth/me` | Any |
| 5 | GET | `/users` | Admin |
| 6 | POST | `/users` | Admin |
| 7 | GET | `/users/:id` | Admin |
| 8 | PUT | `/users/:id` | Admin |
| 9 | DELETE | `/users/:id` | Admin |
| 10 | GET | `/leads` | Any |
| 11 | POST | `/leads` | Any |
| 12 | GET | `/leads/:id` | Any |
| 13 | PUT | `/leads/:id` | Any |
| 14 | DELETE | `/leads/:id` | Any |
| 15 | POST | `/leads/:id/convert` | Any |
| 16 | GET | `/contacts` | Any |
| 17 | POST | `/contacts` | Any |
| 18 | GET | `/contacts/:id` | Any |
| 19 | PUT | `/contacts/:id` | Any |
| 20 | DELETE | `/contacts/:id` | Any |
| 21 | GET | `/deals` | Any |
| 22 | POST | `/deals` | Any |
| 23 | GET | `/deals/:id` | Any |
| 24 | PUT | `/deals/:id` | Any |
| 25 | PATCH | `/deals/:id/stage` | Any |
| 26 | DELETE | `/deals/:id` | Any |
| 27 | GET | `/activities` | Any |
| 28 | GET | `/activities/follow-ups` | Any |
| 29 | POST | `/activities` | Any |
| 30 | PUT | `/activities/:id` | Any |
| 31 | DELETE | `/activities/:id` | Any |
| 32 | GET | `/dashboard` | Any |

---

## Health

### 1. `GET /health` — Public
```json
{ "success": true, "data": { "uptime": 12.4 }, "message": "ClientHub API is running" }
```

## Auth

### 2. `POST /auth/login` — Public
Request:
```json
{ "email": "admin@clienthub.in", "password": "Password@123" }
```
Response `200` (sets `clienthub.sid` cookie):
```json
{
  "success": true,
  "data": { "_id": "665f1c...", "name": "Aarav Mehta", "email": "admin@clienthub.in", "role": "admin", "createdAt": "2026-01-10T08:00:00.000Z" },
  "message": "Logged in successfully"
}
```
Errors: `401` invalid email or password · `422` malformed body.

### 3. `POST /auth/logout` — Public
No body. Destroys the server-side session and clears the cookie.
```json
{ "success": true, "data": null, "message": "Logged out successfully" }
```

### 4. `GET /auth/me` — Any
Returns the logged-in user (same shape as the login `data`). `401` when there is no valid session.

## Users (admin only)

### 5. `GET /users`
```json
{ "success": true, "data": [ { "_id": "665f1c...", "name": "Kavya Iyer", "email": "kavya@clienthub.in", "role": "sales_exec", "createdAt": "..." } ], "message": "Users fetched" }
```

### 6. `POST /users`
Request (`role` optional, defaults to `sales_exec`):
```json
{ "name": "Rohan Gupta", "email": "rohan@clienthub.in", "password": "Password@123", "role": "sales_exec" }
```
Response `201` with the created user (no password). `409` if the email already exists.

### 7. `GET /users/:id`
Returns one user. `404` if missing.

### 8. `PUT /users/:id`
Any subset of `name`, `email`, `password` (min 8 chars), `role`.
```json
{ "name": "Rohan G.", "role": "admin" }
```
`400` when demoting the only admin.

### 9. `DELETE /users/:id`
`400` when deleting yourself · `409` when the user still owns leads, contacts or deals.
```json
{ "success": true, "data": null, "message": "User deleted" }
```

## Leads

Lead fields: `name`*, `company`, `email`, `phone`, `source` (`website|referral|cold call|event|other`),
`status` (`new|contacted|qualified|unqualified`), `notes`, `assignedTo` (admin only; execs are always the owner).

### 10. `GET /leads`
Query: `search` (name/company), `status`, `source`, `assignedTo` (admin only), `page`, `limit` (default 10).
```json
{
  "success": true,
  "data": {
    "items": [
      { "_id": "6660a1...", "name": "Rahul Verma", "company": "Infosys", "email": "rahul@infosys.example", "phone": "+91 98765 43210",
        "source": "referral", "status": "contacted", "assignedTo": { "_id": "665f1c...", "name": "Kavya Iyer", "email": "kavya@clienthub.in" },
        "notes": "Met at Bengaluru Tech Summit", "createdAt": "2026-02-02T09:30:00.000Z" }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
  },
  "message": "Leads fetched"
}
```

### 11. `POST /leads`
```json
{ "name": "Meera Shah", "company": "Wipro", "email": "meera@wipro.example", "phone": "+91 99887 76655", "source": "website", "notes": "Asked for a demo" }
```
Response `201` with the created lead. `422` if `name` is missing or a field is invalid.

### 12. `GET /leads/:id`
Returns the lead with `assignedTo` populated. `404` if it does not exist or belongs to another exec.

### 13. `PUT /leads/:id`
Any subset of the lead fields. `assignedTo` is honoured for admins only (that is how leads are reassigned).
```json
{ "status": "qualified", "notes": "Budget approved" }
```

### 14. `DELETE /leads/:id`
Also deletes the lead's activities.
```json
{ "success": true, "data": null, "message": "Lead deleted" }
```

### 15. `POST /leads/:id/convert`
Creates a contact (linked to the lead) and a deal in the `qualified` stage; sets the lead to `qualified`.
Request (`dealTitle` and `expectedCloseDate` optional):
```json
{ "dealTitle": "Infosys CRM Rollout", "value": 750000, "expectedCloseDate": "2026-12-15" }
```
Response `201`:
```json
{
  "success": true,
  "data": {
    "lead": { "_id": "6660a1...", "status": "qualified" },
    "contact": { "_id": "6660b2...", "name": "Rahul Verma", "linkedLead": "6660a1..." },
    "deal": { "_id": "6660c3...", "title": "Infosys CRM Rollout", "value": 750000, "stage": "qualified" }
  },
  "message": "Lead converted to contact and deal"
}
```
`409` when the lead was already converted.

## Contacts

Contact fields: `name`*, `company`, `email`, `phone`, `designation`, `linkedLead`, `owner` (admin only).

### 16. `GET /contacts`
Query: `search` (name/company/email), `page`, `limit` (default 10). Returns the pagination envelope.

### 17. `POST /contacts`
```json
{ "name": "Priya Nair", "company": "Tata Consultancy Services", "email": "priya@tcs.example", "phone": "+91 91234 56780", "designation": "Procurement Head" }
```
Response `201` with the created contact.

### 18. `GET /contacts/:id`
Returns one contact (owner populated).

### 19. `PUT /contacts/:id`
Any subset of the contact fields.

### 20. `DELETE /contacts/:id`
`409` when deals still reference the contact.

## Deals

Deal fields: `title`*, `value`* (INR, >= 0), `stage` (`new|qualified|proposal|won|lost`, default `new`),
`contact`* (id of a contact you can access), `expectedCloseDate`, `owner` (admin only).

### 21. `GET /deals`
Query: `stage`, `search` (title), `page`, `limit` (default 100 so the Kanban board loads in one request).
```json
{
  "success": true,
  "data": {
    "items": [
      { "_id": "6660c3...", "title": "Infosys CRM Rollout", "value": 750000, "stage": "proposal",
        "contact": { "_id": "6660b2...", "name": "Rahul Verma", "company": "Infosys" },
        "owner": { "_id": "665f1c...", "name": "Kavya Iyer" },
        "expectedCloseDate": "2026-12-15T00:00:00.000Z", "createdAt": "...", "updatedAt": "..." }
    ],
    "pagination": { "page": 1, "limit": 100, "total": 1, "pages": 1 }
  },
  "message": "Deals fetched"
}
```

### 22. `POST /deals`
```json
{ "title": "Reliance Analytics Suite", "value": 1200000, "stage": "new", "contact": "6660b2...", "expectedCloseDate": "2027-01-31" }
```
Response `201`. `404` if the contact does not exist or is not yours.

### 23. `GET /deals/:id`
Returns one deal with contact and owner populated. Another exec's deal returns `404`.

### 24. `PUT /deals/:id`
Any subset of the deal fields (`owner` for admins only).

### 25. `PATCH /deals/:id/stage`
Used by the Kanban dropdown / drag-and-drop.
```json
{ "stage": "won" }
```
```json
{ "success": true, "data": { "_id": "6660c3...", "stage": "won" }, "message": "Deal moved to won" }
```

### 26. `DELETE /deals/:id`
Also deletes the deal's activities.

## Activities

Activity fields: `type`* (`call|email|meeting|note`), `description`*, `relatedTo`* `{ kind: "Lead"|"Deal", item: <id> }`,
`followUpDate` (ISO date), `completed` (boolean). Execs see activities they created.

### 27. `GET /activities`
Query: `kind` (`Lead|Deal`), `item` (record id), `completed` (`true|false`), `page`, `limit` (default 20).
```json
{
  "success": true,
  "data": {
    "items": [
      { "_id": "6660d4...", "type": "call", "description": "Discussed pricing tiers",
        "relatedTo": { "kind": "Lead", "item": { "_id": "6660a1...", "name": "Rahul Verma", "company": "Infosys" } },
        "followUpDate": "2026-10-16T00:00:00.000Z", "completed": false,
        "createdBy": { "_id": "665f1c...", "name": "Kavya Iyer" }, "createdAt": "..." }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
  },
  "message": "Activities fetched"
}
```

### 28. `GET /activities/follow-ups`
Open (`completed = false`) activities whose `followUpDate` is today or earlier, oldest first. Returns an array in `data`.

### 29. `POST /activities`
```json
{ "type": "meeting", "description": "Product demo for the procurement team", "relatedTo": { "kind": "Deal", "item": "6660c3..." }, "followUpDate": "2026-10-20" }
```
Response `201`. `404` if the lead/deal does not exist or is not yours.

### 30. `PUT /activities/:id`
Any subset of `type`, `description`, `followUpDate`, `completed`. Mark a follow-up done with:
```json
{ "completed": true }
```

### 31. `DELETE /activities/:id`

## Dashboard

### 32. `GET /dashboard`
Admins get team-wide numbers; sales execs get numbers for their own records only.
```json
{
  "success": true,
  "data": {
    "pipelineValue": 4850000,
    "openDeals": 12,
    "conversionRate": 62.5,
    "wonValue": 2150000,
    "totalLeads": 30,
    "pendingFollowUps": 4,
    "dealsByStage": [
      { "stage": "new", "count": 3, "value": 600000 },
      { "stage": "qualified", "count": 5, "value": 2100000 },
      { "stage": "proposal", "count": 4, "value": 2150000 },
      { "stage": "won", "count": 5, "value": 2150000 },
      { "stage": "lost", "count": 3, "value": 900000 }
    ],
    "leadsBySource": [
      { "source": "website", "count": 9 },
      { "source": "referral", "count": 7 },
      { "source": "cold call", "count": 5 },
      { "source": "event", "count": 6 },
      { "source": "other", "count": 3 }
    ]
  },
  "message": "Dashboard data fetched"
}
```
`conversionRate` is a percentage: `won / (won + lost) * 100`, rounded to one decimal.
