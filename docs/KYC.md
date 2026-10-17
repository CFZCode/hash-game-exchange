# KYC — sirf Direct Users

**Rule (2026-10-17, user ka faisla):** KYC sirf **direct user** karega. Agent ke neeche wala player
KYC nahi karta, na admin ki KYC list me dikhta hai.

| Kaun | Pehchaan | KYC |
|---|---|---|
| Direct user | `users.parent_staff_id IS NULL` (site pe khud signup) | ✅ submit karta hai, admin review karta hai |
| Agent ka player | `users.parent_staff_id` set (Sports Exchange → Create Account se bana, kisi bhi staff level ke neeche) | ❌ nahi |

**Kyu:** agent ke player ka paisa agent deta hai aur agent hi cash out karta hai. Uske paas withdrawal
rail hi nahi hai (`WITHDRAW_NOT_FOR_AGENT_USERS`), toh KYC kisi kaam ki shart nahi banti.

---

## 1. Player site (frontend)

1. Direct user: **Settings → Personal Verification** (`/settings/verification`) pe form bharta hai —
   naam, DOB, address, city, country, document type, aur document files.
2. Agent ka player: ye menu aur `/settings/verify*` routes dikhte hi nahi —
   `frontend/src/services/gates.js` me `kyc: { feature: 'kyc', notAgentPlayer: true }`.
   `agentPlayer` = `/user/auth/me` ke `capabilities` me `vault` aur `deposit` dono `false`.
3. Owner panel me `kyc` feature band ho toh KYC kisi ke liye nahi dikhta.

## 2. Backend — player API (user-service, `/api/v1/user/kyc`)

| Route | Kya karta hai |
|---|---|
| `GET /status` | Apni KYC ka status: `NotSubmitted` / `Pending` / `Verified` / `Rejected` (+ rejection reason) |
| `POST /submit` | Form + files (multipart: `idFront`, `idBack`, `passport`). **Agent ka player → 403 `KYC_NOT_FOR_AGENT_USERS`** (`denyAgentPlayer('kyc')`) |
| `GET /documents/:kycId/:field` | Apna hi document dekhna |

Submit ke rules (`kyc.service.js`):
- Files: sirf JPEG / PNG / PDF, har file ≤ 5 MB. Type magic bytes se check hota hai, browser ke MIME pe bharosa nahi.
- Kam se kam ek document zaroori (`KYC_DOCUMENTS_REQUIRED`).
- Pehle se `Pending` → 409 `KYC_ALREADY_PENDING`; `Verified` → 409 `KYC_ALREADY_VERIFIED`.
- `Rejected` application dobara bhejne pe **wahi row update** hoti hai (naya row nahi) aur status `Pending` ho jata hai.
- Data `user_kyc` table me; files `KYC_STORAGE_DIR` me. File ka path kabhi API me nahi jata.

Agent-player rule ki ek hi jagah: `backend/packages/auth/src/agentPlayers.js` →
`AGENT_PLAYER_RESTRICTIONS.kyc`. Isi se `/user/auth/me` ke `capabilities.kyc` bhi aata hai
(direct = `true`, agent ka player = `false`).

## 3. Admin panel — KYC review (`admin.parker567.com/kyc`)

Sidebar: **Transactions → KYC**.

1. List me **sirf direct users** ki applications. Direct/Agent tabs nahi hain. Backend list hamesha
   `direct` channel pe chalti hai (`listApplications`); `?channel=` bheja bhi toh ignore hota hai.
2. Status chips: All / Unverified / Pending / Verified / Rejected. Default **Pending**.
3. Row kholo → details + documents (har document dekhna activity log me `kyc.document-viewed`).
4. **Approve** → `Verified`. **Reject** → reason zaroori (`KYC_REJECTION_REASON_REQUIRED`).
   Player ko notification jaati hai. Har faisla activity log me `kyc.review`.
5. Agent ke player ka review → 403 `KYC_DIRECT_USERS_ONLY` (purani row ho tab bhi).

Admin API (user-service, `/api/v1/admin/kyc`):

| Route | Permission |
|---|---|
| `GET /applications?status=&search=&limit=&offset=` | `users:read` |
| `PUT /review` `{ userId, status, rejectionReason? }` | `users:write` |
| `GET /documents/:kycId/:field` | `users:read` |

Staff ko sirf apne tree ke players dikhte hain (`playerScope`); Super Admin sab direct users dekhta hai.

## 4. Withdraw se rishta

- Owner panel ki `withdrawal_requirements` policy: `none` / `kyc` / `wager` / `kyc_and_wager`
  (default `kyc`), aur env `WITHDRAW_REQUIRE_KYC` (default on).
- Policy me KYC ho toh **direct user** ka withdraw tabhi hota hai jab KYC `Verified` ho
  (`withdraw-requirements/withdrawRequirements.js`).
- Agent ke player pe ye lagta hi nahi — uska koi withdrawal rail hai hi nahi; agent cash out karta hai.

## 5. Files

| Kaam | File |
|---|---|
| Agent-player rule (`kyc` capability) | `backend/packages/auth/src/agentPlayers.js` |
| Player routes (submit guard) | `backend/services/user/src/modules/kyc/routes/user.routes.js` |
| Admin routes | `backend/services/user/src/modules/kyc/routes/admin.routes.js` |
| Logic (status, submit, review, list) | `backend/services/user/src/modules/kyc/kyc.service.js` |
| Errors | `backend/services/user/src/modules/kyc/kyc.errors.js` |
| Withdraw ki KYC shart | `backend/services/user/src/modules/withdraw-requirements/withdrawRequirements.js` |
| Admin KYC page | `admin/src/views/kyc/KycQueue.tsx` |
| Player site gate | `frontend/src/services/gates.js` |
| Player KYC page | `frontend/src/pages/Settings/Verification.jsx` |

## 6. Error codes

| Code | HTTP | Kab |
|---|---|---|
| `KYC_NOT_FOR_AGENT_USERS` | 403 | Agent ka player submit kare |
| `KYC_DIRECT_USERS_ONLY` | 403 | Admin agent ke player ka review kare |
| `KYC_ALREADY_PENDING` | 409 | Pending pe dobara submit |
| `KYC_ALREADY_VERIFIED` | 409 | Verified pe dobara submit |
| `KYC_DOCUMENTS_REQUIRED` | 422 | Koi document nahi |
| `KYC_INVALID_FILE_TYPE` | 422 | JPEG/PNG/PDF ke alawa |
| `KYC_FILE_TOO_LARGE` | 413 | File > 5 MB |
| `KYC_REJECTION_REASON_REQUIRED` | 422 | Reject bina reason |
| `KYC_NOT_FOUND` | 404 | Us user ki koi application nahi |
