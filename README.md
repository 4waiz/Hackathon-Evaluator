# Hackathon Evaluator

AI-assisted evaluation platform for hackathon submissions. Built for the "AI for Smart & Resilient Industrial Workforce" challenge organized by UAE Ministry of Industry & Advanced Technology and BRIDGE/EDGE Group.

## Overview

Hackathon Evaluator is a premium internal judging tool that helps evaluators assess hackathon submissions through:

- **Proposal analysis**: Extracts and evaluates proposal content from PDF/PPTX files
- **Code review**: Analyzes code submissions (ZIP/GitHub) for quality, architecture, and AI relevance
- **AI-powered scoring**: Uses OpenAI to generate draft evaluations with evidence-based scoring
- **Human-in-the-loop**: Evaluators can review, adjust scores, and add notes before finalizing
- **Structured reports**: Export evaluations as PDF, JSON, or CSV

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Prisma + SQLite (local dev) / PostgreSQL (production)
- **AI**: OpenAI API (GPT-4o)
- **File Parsing**: pdf-parse, JSZip, AdmZip
- **Charts**: Recharts

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up the database and seed demo data
npm run setup

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:
- **Email**: admin@hackeval.dev
- **Password**: admin123

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` (SQLite) |
| `OPENAI_API_KEY` | OpenAI API key for AI evaluation | (empty) |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o` |
| `MOCK_AI` | Use mock AI responses (no API key needed) | `true` |
| `APP_SECRET` | Secret for session signing | `dev-secret-...` |
| `MAX_UPLOAD_SIZE_MB` | Maximum upload file size | `50` |

### Mock Mode

By default, `MOCK_AI=true` is set so the app works without an OpenAI API key. Mock mode returns realistic sample evaluations for testing and development.

To use real AI evaluations:
1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Set `OPENAI_API_KEY=sk-your-key` in `.env`
3. Set `MOCK_AI=false` in `.env`
4. Or configure the key through the Settings page in the app

## Architecture

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # Server API endpoints
│   │   ├── auth/          # Authentication
│   │   ├── evaluations/   # CRUD + analysis + scoring + export
│   │   └── settings/      # App configuration
│   ├── dashboard/         # Protected dashboard pages
│   │   ├── evaluations/   # Evaluation list, create, detail pages
│   │   └── settings/      # Settings page
│   └── login/             # Login page
├── components/
│   ├── ui/                # shadcn/ui primitives
│   └── layout/            # App shell components
├── lib/
│   ├── auth.ts            # Authentication logic
│   ├── db.ts              # Prisma client
│   ├── openai.ts          # OpenAI client with mock mode
│   ├── evaluation/        # AI evaluation engine
│   │   ├── prompts.ts     # Engineered evaluation prompts
│   │   ├── proposal-evaluator.ts
│   │   ├── code-evaluator.ts
│   │   └── scoring-engine.ts
│   ├── parsers/           # File parsing
│   │   ├── pdf-parser.ts
│   │   ├── pptx-parser.ts
│   │   ├── zip-parser.ts
│   │   └── github-parser.ts
│   └── export/            # Report generation
└── types/                 # TypeScript type definitions
```

## Evaluation Criteria

### Judge Evaluation (60% of final score)
1. Applicability
2. Prototype Quality
3. Technical Feasibility
4. Entrepreneurship and Originality
5. Teamwork and Collaboration

### Code Review (40% of final score)
1. Code Quality
2. Architecture Quality
3. Documentation / Readability
4. Security and Robustness
5. AI Implementation Relevance
6. Maintainability / Testability

### Recommendation Bands
| Score Range | Recommendation |
|-------------|---------------|
| 0.0 - 4.9 | Reject |
| 5.0 - 6.4 | Consider |
| 6.5 - 7.9 | Shortlist |
| 8.0 - 8.9 | Finalist |
| 9.0 - 10.0 | Winner Candidate |

## Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run database migrations
npm run db:migrate

# Seed database with demo data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database and re-seed
npm run db:reset
```

## Security

- API keys are stored server-side only, never exposed to the browser
- File uploads are validated by type and size
- Uploaded code is statically analyzed only, never executed
- Session tokens use HMAC-SHA256 with configurable secret
- All sensitive operations are server-only

## User Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@hackeval.dev | admin123 | Admin (full access) |
| evaluator@hackeval.dev | eval123 | Evaluator |

## License

Internal use only. Built for the AI for Smart & Resilient Industrial Workforce challenge.
