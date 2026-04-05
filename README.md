# Mess Management System

A full-stack mess management application with role-based access control.

## Tech Stack

**Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Better Auth, Nodemailer  
**Frontend:** Next.js 15, TypeScript, Tailwind CSS, Better Auth React

## Project Structure

```
mess-management/
├── backend/     # Express API server
└── frontend/    # Next.js app
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database

---

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` from the example:
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mess_management"
BETTER_AUTH_SECRET="your-super-secret-key-at-least-32-chars"
BETTER_AUTH_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"
PORT=5000

# Email (for due reminders)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Mess Manager <your-email@gmail.com>"
```

Run Prisma migrations:
```bash
npm run db:generate
npm run db:push
```

Start dev server:
```bash
npm run dev
```

---

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Start dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

| Feature | Super Admin | Manager | Member |
|---------|-------------|---------|--------|
| Create mess | ✅ | - | - |
| Assign manager | ✅ | - | - |
| Add meals | - | ✅ | - |
| Add bazaar | - | ✅ | - |
| Record payments | - | ✅ | - |
| View cash balance | ✅ | ✅ | ❌ |
| Send due reminders | - | ✅ | - |
| View monthly report | ✅ | ✅ | ✅ |
| View all history | ✅ | ✅ | ✅ |

## Meal Rate Formula

```
Meal Rate = Total Bazaar Cost ÷ Total Meals
Member Cost = Member Meals × Meal Rate
Due = Member Cost − Total Paid
```

**Meal weights:** Breakfast = 0.5, Lunch = 1.0, Dinner = 1.0
