# Platform Wars release checklist

Apply the Supabase migrations in chronological order, then deploy `auth-app`
with the static site. Configure `SIGNUP_IP_HASH_SALT` to a unique secret and
set `FREE_TRIAL_VCOINS=20` (or the current one-dollar equivalent).

Verify in production with two separate test accounts:

1. Create a Phone and a Desktop quick match; both accounts must see the same
   match ID and opponent movement.
2. Create public, friends-only, and private lobbies. Confirm only eligible
   users see the first two and only the share link/code reaches the private
   lobby.
3. Send, accept, and decline a friend request; verify messages cannot be sent
   before acceptance.
4. Enable cheats on Save 1, save the game, then attempt a direct save update.
   `cheat_mode` must remain true and the canvas watermark must remain visible.
5. Change save slots during a game and verify the browser reloads.
6. Confirm `/my/stats/` ignores an unfocused idle tab and records interaction
   time, actions, kills, and deaths.
7. Sign up two accounts from one test IP: only the first receives the trial
   V Coin ledger entry. A second IP receives its own one-time credit.
8. Submit a private creator draft, preview it, submit it, approve it as an
   admin, then enable monetization setup as its owner.

Never grant browser users a Supabase service-role key. The service-role key,
IP hash salt, and admin role assignment remain server-side operations.
