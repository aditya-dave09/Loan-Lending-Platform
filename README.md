# LoanForge API

> A fintech/legal-tech platform that formalizes personal loans between individuals — converting informal personal loans into documented, legally credible transactions.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What It Does

LoanForge acts as a **trusted neutral third party** that:

- ✅ **Verifies identities** — KYC document submission and admin verification
- ✅ **Creates legal agreements** — Auto-generated PDF loan documents with QR verification
- ✅ **Tracks repayments** — EMI schedules, payment recording, overdue detection
- ✅ **Secures records** — Tamper-proof SHA-256 integrity hashes on every agreement
- ✅ **Maintains audit trails** — Immutable, append-only event logging

## Architecture

```
Client → Express.js API → Service Layer → Prisma ORM → PostgreSQL
                ↓               ↓
           Middleware      Background Jobs (Bull + Redis)
           (Auth, RBAC,    (PDF generation, emails,
            Validation,     overdue reminders)
            Rate Limit)
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | PostgreSQL 15 |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Cache / Queues | Redis + Bull |
| PDF Generation | PDFKit + QR Code |
| Email | Nodemailer |
| Validation | Joi |
| Docs | Swagger (OpenAPI 3.0) |
| Testing | Jest + Supertest |
| Container | Docker + Docker Compose |

## Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for PostgreSQL + Redis)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/loanforge-api.git
cd loanforge-api

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 4. Start PostgreSQL + Redis with Docker
docker-compose up -d postgres redis

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed the database
npm run db:seed

# 7. Start the development server
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| API | http://localhost:3000/api/v1 |
| Health Check | http://localhost:3000/api/v1/health |
| Swagger Docs | http://localhost:3000/api/docs |
| Prisma Studio | `npm run db:studio` |

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@loanforge.com | Admin@123 |
| Lender | lender@example.com | Lender@123 |
| Borrower | borrower@example.com | Borrower@123 |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, get tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get profile |
| PATCH | `/users/me` | Update profile |

### KYC
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/kyc/submit` | Submit KYC documents |
| GET | `/kyc/status` | Check verification status |
| PATCH | `/kyc/:id/verify` | Admin: approve/reject |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/loans` | Create loan agreement |
| GET | `/loans` | List my loans |
| GET | `/loans/:id` | Get loan details |
| PATCH | `/loans/:id/status` | Update loan status |
| POST | `/loans/:id/sign` | Digitally sign agreement |
| GET | `/loans/:id/pdf` | Download PDF agreement |
| GET | `/loans/:id/verify` | Public: verify integrity |

### Repayments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/loans/:id/repayments` | View repayment schedule |
| POST | `/repayments/:id/pay` | Record payment |

### Dashboard & Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Dashboard statistics |
| GET | `/audit/logs` | View audit trail |

## Project Structure

```
src/
├── config/          # Environment, database, Redis, logger, Swagger
├── middleware/       # Auth, RBAC, validation, rate limiting, error handling
├── modules/          # Feature modules (auth, user, kyc, loan, etc.)
│   └── [module]/
│       ├── module.controller.js
│       ├── module.service.js
│       ├── module.routes.js
│       ├── module.validation.js
│       └── module.test.js
├── services/         # Shared services (audit, cache, PDF, email)
├── jobs/             # Background job processors
├── utils/            # ApiError, ApiResponse, helpers
├── app.js            # Express app setup
└── server.js         # Server entry point
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Docker Deployment

```bash
# Build and start all services
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api
```

## Environment Variables

See [`.env.example`](.env.example) for the complete list of configuration options.

## License

[MIT](LICENSE)
