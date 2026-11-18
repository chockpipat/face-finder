# Face Finder

ค้นหารูปตัวเองจาก Google Drive ด้วย Face Recognition (InsightFace / ArcFace)

**Privacy-first: ไม่มีฐานข้อมูลถาวร ไม่มีบัญชีผู้ใช้ ข้อมูลทุกอย่างลบอัตโนมัติหลัง 1 ชั่วโมง**

---

## Architecture

```
Browser → Next.js (Web + API) → Redis (Job Queue + Temp Store)
                                      ↓
                              Python AI Worker
                                      ↓
                              Google Drive API
```

## Stack

| ส่วน        | เครื่องมือ                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14 · TypeScript · Tailwind  |
| Auth        | NextAuth · Google OAuth (Drive only)|
| Queue       | BullMQ · Redis                      |
| Temp Store  | Redis (TTL 1 hr, no DB)             |
| AI Worker   | Python · InsightFace · ArcFace      |
| Container   | Docker · Docker Compose             |

---

## Getting Started

### 1. Google Cloud Project

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง project ใหม่
3. เปิด **Google Drive API**
4. สร้าง **OAuth 2.0 Client ID** (Web application)
5. เพิ่ม Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### 2. Environment

```bash
cp .env.example .env
# แก้ค่าใน .env
```

ค่าที่ต้องใส่:
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=    # openssl rand -base64 32
INTERNAL_TOKEN=     # openssl rand -hex 32  (shared secret web ↔ worker)
```

### 3. Run

```bash
docker compose up --build
```

เปิด http://localhost:3000

---

## Data Flow

```
1. User เชื่อมต่อ Google (OAuth) — ได้ access token ชั่วคราว
2. User ใส่ Drive folder URL + อัปโหลดรูปใบหน้า
3. POST /api/search → สร้าง Job ใน Redis → enqueue BullMQ
4. Python Worker:
   - รับ job จาก queue
   - สร้าง face embedding จากรูปอ้างอิง
   - ลบ base64 รูปต้นฉบับทันที
   - ดาวน์โหลด + วิเคราะห์รูปจาก Drive ทีละภาพ
   - บันทึกเฉพาะ match results ใน Redis (TTL 1 hr)
5. Frontend polls GET /api/jobs/:id ทุก 1.5 วินาที
6. เมื่อเสร็จ → redirect ไปหน้า Results
7. User กด "ลบผลลัพธ์" → DELETE /api/jobs/:id → ลบทันที
   หรือรอ TTL หมด → ลบอัตโนมัติ
```

## Privacy

- ❌ ไม่มี PostgreSQL หรือฐานข้อมูลถาวร
- ❌ ไม่มีบัญชีผู้ใช้
- ❌ ไม่เก็บ refresh token
- ❌ ไม่ log face embedding
- ✅ Access token อยู่ใน encrypted JWT cookie เท่านั้น
- ✅ รูปอ้างอิง base64 ถูกลบทันทีหลังสร้าง embedding
- ✅ ผลลัพธ์ใน Redis ลบอัตโนมัติใน 1 ชั่วโมง
- ✅ ผู้ใช้ลบผลลัพธ์ได้ทันที

## Project Structure

```
face-finder/
├── web/                    # Next.js application
│   ├── app/
│   │   ├── page.tsx        # Home (Step 1-3)
│   │   ├── search/[id]/    # Progress page (polling)
│   │   ├── results/[id]/   # Result gallery
│   │   └── api/
│   │       ├── auth/       # NextAuth (Google OAuth)
│   │       ├── search/     # POST — create job
│   │       ├── jobs/[id]/  # GET status, DELETE
│   │       └── drive/      # verify + list (internal)
│   ├── lib/
│   │   ├── redis.ts        # Redis client
│   │   ├── jobStore.ts     # Job CRUD in Redis
│   │   ├── queue.ts        # BullMQ queue
│   │   └── drive.ts        # Google Drive API helpers
│   └── types/index.ts      # Shared TypeScript types
│
├── ai-worker/              # Python Face Recognition Worker
│   └── app/
│       ├── main.py         # Queue consumer loop
│       ├── face_engine.py  # InsightFace / ArcFace wrapper
│       ├── drive.py        # Drive image downloader
│       └── job_store.py    # Redis helpers (mirrors web/lib)
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## Roadmap

- [x] Phase 1 — Core scaffold (no-DB, privacy-first)
- [ ] Phase 2 — Google Drive OAuth flow (wire up NextAuth properly)
- [ ] Phase 3 — Real-time SSE progress (replace polling)
- [ ] Phase 4 — Multiple reference images (average embedding)
- [ ] Phase 5 — pgvector (optional, for very large folders only)
