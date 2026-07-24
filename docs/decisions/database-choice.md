---
type: decision
title: "Database Choice: Neon vs Supabase vs Others"
description: "For Personus, Neon + Drizzle is the best choice. Here's why."
status: current
tags: [decisions]
---

# Database Choice: Neon vs Supabase vs Others

## TL;DR: Stick with Neon + Drizzle ✅

For Personus, **Neon + Drizzle** is the best choice. Here's why.

---

## Comparison Matrix

| Feature          | Neon      | Supabase  | PlanetScale | Turso        |
| ---------------- | --------- | --------- | ----------- | ------------ |
| **PostgreSQL**   | ✅ Pure   | ✅ Pure   | ❌ MySQL    | ❌ SQLite    |
| **pgvector**     | ✅ Native | ✅ Native | ❌ N/A      | ❌ N/A       |
| **Serverless**   | ✅ Best   | ⚠️ Good   | ✅ Good     | ✅ Excellent |
| **Cold starts**  | ✅ <100ms | ⚠️ ~500ms | ✅ Fast     | ✅ Fastest   |
| **Branching**    | ✅ Yes    | ❌ No     | ✅ Yes      | ❌ No        |
| **Edge support** | ✅ HTTP   | ✅ HTTP   | ✅ HTTP     | ✅ Native    |
| **ORM support**  | ✅ All    | ✅ All    | ✅ All      | ✅ Drizzle   |
| **Free tier**    | ✅ 0.5GB  | ✅ 500MB  | ✅ 5GB      | ✅ 9GB       |
| **Pricing**      | $ Good    | $$ Higher | $ Good      | $ Good       |

---

## Why Neon for Personus

### 1. **pgvector is Critical**

Personus needs semantic search for persona discovery:

```sql
-- Find similar personas by embedding
SELECT * FROM personas
ORDER BY embedding <=> $1
LIMIT 10;
```

**Only PostgreSQL supports pgvector well:**

- ✅ Neon: Native pgvector support, optimized
- ✅ Supabase: Native pgvector support
- ❌ PlanetScale: MySQL, no vector search
- ❌ Turso: SQLite, limited vector support

### 2. **Serverless Performance**

Neon is purpose-built for serverless:

- **Auto-scaling**: Scales to zero when idle
- **Cold starts**: <100ms (vs Supabase ~500ms)
- **Compute separation**: Storage + compute separate
- **HTTP drivers**: Optimized for edge/serverless

### 3. **Database Branching**

Neon's killer feature for development:

```bash
# Create branch for feature development
neon branches create my-feature

# Each preview deployment gets its own DB
# Perfect for Vercel preview deployments
```

**Why this matters:**

- Test schema migrations safely
- Each PR gets isolated database
- Never pollute production data
- Quick rollbacks

### 4. **Vercel Integration**

Neon + Vercel = perfect pairing:

```bash
# One command setup
vercel link
vercel env pull
```

- Auto-provision databases
- Environment variables managed
- Preview branches automatic
- Production/preview isolation

### 5. **Pure Postgres**

Neon is **just Postgres** with no extras:

- Use any Postgres tool
- Standard SQL
- Full ACID compliance
- No vendor lock-in
- Easy migration if needed

---

## Why NOT Supabase?

Supabase is great, but **too much for Personus**:

### ❌ What Supabase Adds (That We Don't Need)

1. **Auth** - We're using Clerk
2. **Storage** - We're using Cloudinary/R2
3. **Realtime** - We don't need it (not a chat app)
4. **Functions** - We have Next.js API routes
5. **Dashboard** - Nice but not essential

### ❌ Trade-offs

- **Heavier**: More services = more overhead
- **Slower cold starts**: ~500ms vs Neon's ~100ms
- **More expensive**: Paying for features we don't use
- **More complex**: More moving parts

### ✅ When to Use Supabase

Consider Supabase if you need:

- Built-in auth (and don't want Clerk)
- Realtime features
- File storage
- Edge functions
- All-in-one solution

**For Personus:** We have specialized tools for each piece, so Neon's focused approach is better.

---

## Why NOT PlanetScale?

PlanetScale is excellent, but wrong database:

❌ **MySQL, not PostgreSQL**

- No pgvector
- No advanced PostgreSQL features (JSONB operators, arrays)
- Different ecosystem

❌ **Personus needs Postgres**

- JSONB for trait storage
- pgvector for semantic search
- Array types for skills/tags

---

## Why NOT Turso?

Turso is interesting but too cutting-edge:

❌ **SQLite-based**

- No pgvector support
- Limited for multi-tenant
- Newer ecosystem

✅ **When to use Turso**

- Edge-first apps
- Read-heavy
- Simple data model
- Want cheapest option

---

## Drizzle vs Prisma?

**Stick with Drizzle** for Personus:

| Feature            | Drizzle      | Prisma        |
| ------------------ | ------------ | ------------- |
| **Type safety**    | ✅ Excellent | ✅ Excellent  |
| **SQL-like**       | ✅ Yes       | ❌ Abstracted |
| **Bundle size**    | ✅ Small     | ❌ Large      |
| **Edge support**   | ✅ Native    | ⚠️ Data Proxy |
| **pgvector**       | ✅ Easy      | ⚠️ Harder     |
| **Migrations**     | ✅ SQL       | ⚠️ Abstracted |
| **Learning curve** | ⚠️ Steeper   | ✅ Easier     |

**Why Drizzle for Personus:**

1. **SQL-like syntax** - Easy to optimize
2. **pgvector support** - Critical for search
3. **Smaller bundle** - Better for edge
4. **Type inference** - Excellent DX
5. **SQL migrations** - Full control

```typescript
// Drizzle is more SQL-like (easier to optimize)
const results = await db
  .select()
  .from(personas)
  .where(eq(personas.visibility, 'public'))
  .orderBy(sql`embedding <=> ${queryEmbedding}`)
  .limit(10);
```

---

## Final Recommendation

### For Personus MVP (Next 6 months)

```
✅ Neon (serverless Postgres)
✅ Drizzle ORM
✅ pgvector extension
✅ Vercel deployment
```

### If You Switch Later

**To Supabase:**

- Keep Drizzle
- Just change connection string
- Maybe use Supabase Storage
- Easy migration

**To managed Postgres (RDS, etc.):**

- Keep everything
- Just change connection string
- Easy migration

**Bottom line:** Neon + Drizzle gives you maximum flexibility with best performance for Personus use case.

---

## Setup

```bash
# 1. Create Neon project
# Visit: https://console.neon.tech

# 2. Get connection string
# Format: postgresql://user:pass@host/db?sslmode=require

# 3. Add to .env.local
DATABASE_URL=postgresql://...

# 4. Enable pgvector
# In Neon SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;

# 5. Push schema
bun run db:push

# 6. Done!
```

---

## Cost Projection

### Free Tier (Development)

- Neon: 0.5GB storage, sufficient for MVP
- Supabase: 500MB storage, 2GB transfer
- Both work fine for development

### Production (Est. 10k users)

- **Neon**: ~$20/month (compute + storage)
- **Supabase**: ~$25/month (Pro plan required)

### Scale (100k users)

- **Neon**: ~$100-150/month (scales incrementally)
- **Supabase**: ~$200/month (Team plan)

**Winner:** Neon is more cost-effective at scale.

---

## Conclusion

**Use Neon + Drizzle because:**

1. ✅ pgvector for semantic search (critical)
2. ✅ Best serverless Postgres performance
3. ✅ Database branching for dev workflow
4. ✅ Pure Postgres (no vendor lock-in)
5. ✅ Perfect Vercel integration
6. ✅ More cost-effective
7. ✅ Lighter, faster, focused

**Supabase is great, but overkill** for Personus since we have:

- Clerk (auth)
- Cloudinary (storage)
- Next.js (API)
- No realtime needs

**Stick with Neon.** 🚀
