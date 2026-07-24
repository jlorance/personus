---
type: prd
title: "Personus.ai — Growth Model & Unit Economics"
description: "Version: 1.0 Date: 2026-02-17 Audience: Stakeholders, investors, advisors Status: Draft for review"
status: current
tags: [business-model]
timestamp: 2026-02-17
---

# Personus.ai — Growth Model & Unit Economics

**Version:** 1.0
**Date:** 2026-02-17
**Audience:** Stakeholders, investors, advisors
**Status:** Draft for review

---

## The Network Flywheel

Personus grows through a virtuous cycle driven by generosity and trust:

```
User creates persona → endorses people they trust →
  Shadow personas created for non-users → shadows discoverable by AI agents →
    Someone searches via AI agent → finds shadow → requests introduction →
      Introduction mediated through endorser → claim invite sent to shadow subject →
        Shadow subject joins Personus → claims persona with endorsements attached →
          New user endorses THEIR network → more shadows, more trust → flywheel accelerates
```

Every node in this cycle is a growth event:
- **Persona creation** adds a discoverable entity
- **Endorsement** adds a trust signal that improves search quality
- **Shadow creation** adds a discoverable entity AND sends a claim invite (viral loop)
- **AI agent query** is a moment of value delivery that can convert the searcher
- **Claim** converts a shadow into a full user who will endorse others

### Community Amplification

Communities multiply the flywheel's velocity:

```
Leader creates community → invites existing contacts →
  Members build context-rich personas → endorse each other →
    Each member endorses people OUTSIDE the community →
      New shadows created → new communities formed → cycle repeats
```

A 100-person community where each member averages 3 endorsements generates ~300 potential new users through shadow personas. This is why **community creation is unlimited across all tiers** — every community is a growth engine.

---

## How Different Groups Drive Growth

### Communities (Free Tier — Highest Volume)

**Examples:** Neighborhood groups, hobby clubs, alumni networks, faith communities, parent groups

**Growth math:**
- Average community: 80 members
- Average endorsements per member: 3 (of which ~2 are for non-members)
- Shadow personas generated: 80 × 2 = 160
- Claim rate (industry benchmark for "warm" invites): 15-25%
- New users per community: 24-40
- Cost to Personus: $0 (free tier) + ~$0.50-1.00/mo per active user in Coach LLM costs

**Why this is the highest-ROI growth channel:** Communities are free. They bring 80 users at zero acquisition cost. Those 80 users generate 160 shadows, 24-40 of which convert to new users who bring their own networks. The CAC is approximately $0.

### Guilds (CO Base $99/year — Highest Quality)

**Examples:** Freelance design communities, trade groups, mentorship networks

**Growth math:**
- Average guild: 35 members
- Average endorsements per member: 5 (guild members tend to be more active)
- Shadow personas: 35 × 3 (non-member endorsements) = 105
- Claim rate: 20-30% (guild members' endorsements carry more weight)
- New users per guild: 21-32
- Revenue: $99/year from the guild + potential Pro conversions from members

**Why guilds drive quality:** Guild members are vetted. Their endorsements are higher-signal. The people they recommend are more likely to be skilled, active professionals who will in turn endorse others. Guilds are the trust network's quality filter.

### Membership Organizations (CO Pro $199/mo — Highest Scale)

**Examples:** The Nature Conservancy, Rotary, professional associations

**Growth math:**
- Average deployed org: 2,000 members (on CO Pro)
- Average endorsements per member: 2 (lower — many are casual members)
- Shadow personas: 2,000 × 1.5 (non-member endorsements) = 3,000
- Claim rate: 10-15% (larger orgs have more casual invitations)
- New users per org: 300-450
- Revenue: $199/mo from the org + individual Pro conversions

**Why orgs drive scale:** A single Nature Conservancy deployment brings 2,000 users and generates 300-450 new users. Five such deployments = 10,000 users + 1,500-2,250 new users. At $199/mo per org, the customer acquisition cost per user is ~$0.50/mo — far below any paid acquisition channel.

### Enterprises (Enterprise $499/mo — Highest Revenue)

**Growth math:**
- Average enterprise: 500 employees
- All 500 become Personus users (Solo Pro included)
- Endorsement behavior: lower (internal focus), but each employee's persona is now in the network
- External discovery value: enterprise employees are discoverable by AI agents for consulting, partnerships, speaking

**Why enterprises anchor the network:** They bring hundreds of users at once with guaranteed engagement (employer-driven adoption). These users' personas add professional density to the network that benefits everyone's search results.

---

## Scenario Deep Dives

### Scenario 1: Finding a Recommended Accountant (Solo Free → Solo Pro Conversion)

**Jamie**, not a Personus user, uses Claude with the Personus MCP plugin.

"I need an accountant near Portland who my friends recommend."

**Step 1 — Discovery (free, anonymous):**
Claude calls `personus_search`. Jamie gets 3 results (free tier limit) with display name, headline, skills, and endorsement count.

**Step 2 — Detail (free, anonymous):**
Jamie asks about one result. Claude calls `personus_get_persona`. Returns visible traits per the accountant's MCP visibility settings.

**Step 3 — Conversion point:**
Jamie wants an introduction. Claude explains: "To send a privacy-preserving introduction, you'll need a free Personus account. This lets Sarah see who you are and decide whether to connect."

**Step 4 — Post-signup flywheel:**
Jamie creates an account (free). The Coach asks: "Who would YOU recommend? Know a great dentist, lawyer, or contractor?" Jamie endorses 3 people → 3 shadow personas created → 3 claim invites sent → network grows.

**Revenue path:** Jamie uses Personus regularly, hits the 5 intro/month limit, upgrades to Solo Pro ($12/mo) after month 2.

**LTV estimate:** Solo Pro retained for 18 months = $216. Plus Jamie's 3 endorsements created 3 shadows, 1 of which converts → that new user's LTV contributes to Jamie's network value.

### Scenario 2: Recruiter (Pathfinder Conversion)

**Taylor**, a recruiter at a mid-size tech company, uses ChatGPT with Personus.

**Path A — Casual (free tier):**
Taylor does 5-10 searches for a specific role. Gets 5 results per query. Sends 3 introduction requests. The mediated contact model delivers higher response rates than InMail. Taylor is satisfied for this one-off search.

**Path B — Systematic (Pathfinder $49/mo):**
Taylor recruits regularly. Needs 200 searches/day, compound filters, 50 intros/month, and pipeline tracking. Upgrades to Pathfinder after the free tier's daily limits become constraining.

**Revenue path:** Pathfinder at $49/mo retained for 24 months = $1,176. If Taylor's company has a recruiting team of 5, they upgrade to Pathfinder Team ($149/mo) = $3,576/year.

**Comparison:** LinkedIn Recruiter at $10,800/year for a single seat. Pathfinder Team at $1,788/year for 5 seats. The value proposition is not "cheaper" — it is "fundamentally better" (trust signals, mediated contact, higher response rates) and happens to cost 84% less.

### Scenario 3: Enterprise — Internal Talent Discovery

**Acme Corp**, 500-person SaaS company. VP of Engineering wants to know team capabilities.

**Month 1 — Free:**
Creates "Acme Engineering" team community (free, 50 engineers). Internal directory, group-scoped search. Discovers that two engineers have ML experience hidden behind their job titles.

**Month 3 — CO Base ($99/year):**
Expands to full engineering org (200 engineers). Adds context fields: team, role, projects, certifications. Analytics show skill distribution.

**Month 6 — Enterprise Base ($499/mo):**
Company-wide deployment (500 employees). All employees get Solo Pro. CTO gets aggregate intelligence: "23% of engineering has Python, 4% has ML deployment skills." Gap analysis: "We need 3 more ML engineers for the Q3 initiative."

**Month 12 — Enterprise Pro (custom, $2,000/mo):**
SSO integration with Okta. HRIS sync with Workday. Custom dashboards for CTO, VP Engineering, and HR. External talent discovery for hiring.

**Revenue path:** $0 → $99/year → $499/mo → $2,000/mo over 12 months. Total Year 1 revenue: ~$15,000. Total Year 2 (at steady state): $24,000.

**Plus:** 500 employees are now Personus users with personas, generating endorsements and network growth beyond Acme's walls.

### Scenario 4: The Nature Conservancy — Membership Organization

**TNC**, environmental membership org with 1M+ members.

**Month 1 — Pilot (free):**
200 members from one chapter. Internal directory, endorsements, group-scoped search.

**Month 3 — CO Base ($99/year):**
Pilot succeeds. Expands to 800 members across 5 chapters.

**Month 6 — CO Pro ($199/mo):**
20 chapters, 3,000 members. Aggregate capability intelligence becomes the killer feature: "847 members with legal expertise, 156 Spanish speakers across 12 chapters." TNC leadership uses this for campaign planning.

**Month 12 — Enterprise ($499/mo or custom):**
50 chapters, 10,000+ members. Specialized guilds (Science, Policy, Storytelling). SSO, CRM integration, custom analytics. TNC mobilizes members for campaigns based on capability matching.

**Revenue path:** $0 → $99/year → $199/mo → $499+/mo over 12 months. Total Year 1: ~$4,000. Total Year 2 (at scale): $6,000-$12,000.

**Network impact:** 10,000+ environmentally-minded professionals with rich personas. Each member brings their non-environmental professional identity too — a marine biologist who's also a photographer, a policy advocate who's also a yoga instructor. The template replicates to Sierra Club, Audubon Society, every professional association.

---

## Unit Economics

### Cost Structure Per Tier

| Component | Cost Driver | Per-User/Month |
|---|---|---|
| **LLM inference (Coach)** | GPT-4o: ~$0.05-0.10/session | Free: $0.50-1.00 (10 sessions) / Pro: $2.50-5.00 (50 sessions) |
| **LLM inference (triage/routing)** | GPT-4o: ~$0.01-0.10/decision | $0.05-0.20 (varies by activity) |
| **Embedding generation** | text-embedding-3-small: $0.02/1M tokens | ~$0.001 (negligible) |
| **Database (Neon)** | Compute + storage + pgvector | ~$0.02-0.10/user at scale |
| **MCP/API serving** | Compute (Vercel serverless) | ~$0.001-0.01/query |
| **Email/notifications** | Transactional email provider | ~$0.01-0.05/user |

**Key insight:** MCP queries are the highest-margin revenue line. When Claude or ChatGPT calls our MCP endpoint, the caller's LLM pays for its own inference. We serve structured data from the database. Our cost per MCP query is compute + DB — approximately $0.001-0.005. If a Pathfinder user makes 200 queries/day, our cost is ~$0.20-1.00/day. At $49/mo, the gross margin is approximately 95%.

### Margin Analysis by Tier

| Tier | Price | Our Cost/Mo | Gross Margin | Key Cost Driver |
|---|---|---|---|---|
| **Solo Free** | $0 | $0.50-1.10 | -100% (investment) | Coach LLM (10 sessions) |
| **Solo Pro** | $12/mo | $2.50-5.50 | 54-79% | Coach LLM (50 sessions) |
| **CO Base** | $8.25/mo ($99/yr) | $5-15 | Breakeven to slight loss | DB for 1K member community |
| **CO Pro** | $199/mo | $20-40 | 80-90% | DB + LLM for aggregate reports |
| **Pathfinder** | $49/mo | $2-5 | 90-96% | DB queries only |
| **Pathfinder Team** | $149/mo | $5-15 | 90-97% | DB queries only |
| **Enterprise Base** | $499/mo | $50-100 | 80-90% | DB + LLM + dedicated compute |
| **Enterprise Pro** | $2,000+/mo | $200-400 | 80-90% | Custom + dedicated |

### Why Free Users Are an Investment, Not a Cost

A free user costs us $0.50-1.10/month in Coach LLM inference. In return, they contribute:
- A discoverable persona (improves search quality for everyone)
- 3+ endorsements on average (trust signals that improve the network)
- 2+ shadow personas on average (direct user acquisition at $0 CAC)
- Data that makes the network more valuable to paying users and AI agents

If 5% of free users convert to Solo Pro within 12 months, the average free user's "revenue contribution" is: 0.05 × $12/mo × 18mo average retention = $10.80 in LTV. Against a 12-month cost of $6-13.20, this is a positive ROI before counting the indirect value of their network contributions.

---

## Revenue Projections

### Year 1: Foundation (Building the Network)

| Revenue Line | Customers | Revenue/Mo | Annual |
|---|---|---|---|
| Solo Pro | 5,000 individuals | $60K | $720K |
| CO Base | 100 communities | $825 | $9.9K |
| CO Pro | 20 communities | $3.98K | $47.8K |
| Pathfinder | 200 individuals | $9.8K | $117.6K |
| Pathfinder Team | 30 teams | $4.47K | $53.6K |
| Enterprise Base | 10 orgs | $4.99K | $59.9K |
| Enterprise Pro | 3 orgs | $6K est. | $72K |
| **Total** | | **$90K/mo** | **$1.08M** |

**Supporting metrics:** 100K free users, 500 free communities, 5K individual subscribers

### Year 2: Growth (Network Effects Compound)

| Revenue Line | Customers | Revenue/Mo | Annual |
|---|---|---|---|
| Solo Pro | 25,000 | $300K | $3.6M |
| CO Base | 500 | $4.1K | $49.5K |
| CO Pro | 100 | $19.9K | $238.8K |
| Pathfinder | 1,000 | $49K | $588K |
| Pathfinder Team | 150 | $22.4K | $268.2K |
| Enterprise Base | 50 | $24.95K | $299.4K |
| Enterprise Pro | 15 | $30K est. | $360K |
| **Total** | | **$450K/mo** | **$5.4M** |

**Supporting metrics:** 500K free users, 2K free communities, MCP queries growing 20x

### Year 3: Scale (AI Agent Adoption Accelerates)

| Revenue Line | Customers | Revenue/Mo | Annual |
|---|---|---|---|
| Solo Pro | 75,000 | $900K | $10.8M |
| CO Base | 2,000 | $16.5K | $198K |
| CO Pro | 400 | $79.6K | $955.2K |
| Pathfinder | 3,000 | $147K | $1.76M |
| Pathfinder Team | 500 | $74.5K | $894K |
| Enterprise Base | 150 | $74.85K | $898.2K |
| Enterprise Pro | 50 | $100K est. | $1.2M |
| Transaction/commerce fees | — | $150K est. | $1.8M |
| **Total** | | **$1.54M/mo** | **$18.5M** |

**Supporting metrics:** 2M free users, 10K free communities, MCP becoming a standard AI agent tool

### Key Assumptions

- 5% free-to-paid conversion rate (industry benchmark for freemium: 2-5%)
- 18-month average retention for Solo Pro (industry benchmark: 12-24 months)
- 24-month average retention for Pathfinder (high switching cost)
- 36-month average retention for Enterprise (deep integration)
- MCP queries growing 10-20x annually as AI agent adoption accelerates
- Network effects improve conversion rates over time (more personas = better search results = more value = higher conversion)

---

## Blended Cost of Goods Sold

| Year | Revenue | COGS (LLM + DB + compute) | Gross Margin |
|---|---|---|---|
| Year 1 | $1.08M | $350K (heavily weighted by free user LLM costs) | 68% |
| Year 2 | $5.4M | $1.2M | 78% |
| Year 3 | $18.5M | $3.5M | 81% |

Gross margin improves as the revenue mix shifts toward higher-margin tiers (Pathfinder at 90%+, Enterprise at 80-90%) and as LLM inference costs continue to decline (OpenAI has reduced pricing ~80% since GPT-4 launch).

### The LLM Cost Trajectory

LLM inference costs are declining rapidly:
- GPT-4 (Mar 2023): $60/1M output tokens
- GPT-4o (May 2024): $15/1M output tokens
- GPT-4o (current): $10/1M output tokens
- Projected 2027: $2-5/1M output tokens

This means our per-user cost for Coach conversations will decline 50-80% over the next 2 years, dramatically improving Solo tier margins. The free tier becomes cheaper to support over time, not more expensive.

---

## Key Performance Indicators

| Metric | Year 1 Target | Year 2 Target | Year 3 Target |
|---|---|---|---|
| **Total users** | 100K | 500K | 2M |
| **Personas created** | 150K | 750K | 3M |
| **Endorsements** | 300K | 2M | 10M |
| **Shadow personas** | 200K | 1M | 5M |
| **Shadow claim rate** | 15% | 20% | 25% |
| **Free-to-paid conversion** | 5% | 6% | 7% |
| **Monthly active users (MAU)** | 40K | 200K | 800K |
| **MCP queries/month** | 500K | 10M | 200M |
| **Communities** | 600 | 2.5K | 12K |
| **Net revenue retention** | 110% | 120% | 130% |
| **CAC (blended)** | $5 | $3 | $2 |
| **LTV:CAC ratio** | 8:1 | 15:1 | 25:1 |

---

*Personus's unit economics improve with scale. The network is the moat. Every user, every endorsement, every community makes the platform more valuable for everyone — and the platform more defensible against competitors.*
