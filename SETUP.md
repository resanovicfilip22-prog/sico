# Postavljanje projekta

## 1. Supabase

1. Idi na https://supabase.com i napravi besplatni projekt
2. Kopiraj "Project URL" i "anon public key" iz Settings → API
3. Otvori `.env.local` i zamijeni vrijednosti:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tvoj-projekt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tvoj-anon-key
   ```
4. U Supabase dashboardu idi na **SQL Editor** i pokopi sadržaj `supabase/migrations/001_initial.sql`
5. Klikni **Run**

## 2. Admin korisnik

U Supabase dashboardu → **Authentication** → **Users** → **Add user**:
- Email: tvoj@email.com
- Password: tvoja lozinka

## 3. Lokalni razvoj

```bash
npm run dev
```

Otvori http://localhost:3000

Admin panel: http://localhost:3000/admin

## 4. Deploy na Vercel (besplatno)

1. Idi na https://vercel.com i spoji GitHub repozitorij
2. Dodaj environment varijable (iste kao u .env.local)
3. Deploy!

## Struktura

- `/` — Javna naslovnica (ljestvica + top strijelci)
- `/standings` — Cijela ljestvica
- `/players` — Rang lista igrača
- `/matches` — Raspored i rezultati
- `/playoff` — Playoff bracket
- `/seasons` — Pregled svih sezona
- `/admin` — Admin panel (zaštićeno loginom)
