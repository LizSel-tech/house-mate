# Postgres setup for Fixora
#
# 1. Create a Postgres database (Neon, Railway, Render, Docker, local, etc.)
# 2. Add to `.env`:
#    DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
# 3. From the project root:
#    npx prisma generate
#    npx prisma db push
# 4. Restart `npm run dev`
# 5. Sign up at /signup — rows appear in the `users` table
#
# Optional GUI: `npx prisma studio`
#
# Demo login OTP until SMS is wired: 123456
#
# KYC
# - Default: artisans submit Ghana Card + guided face check; admins approve/reject
#   at /admin/verifications (no Smile Identity required).
# - Smile Identity client + webhook remain available for a future live integration.
