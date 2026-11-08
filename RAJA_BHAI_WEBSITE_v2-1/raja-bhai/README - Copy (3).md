# RAJA BHAI — Virtual Arcade Demo

A responsive, locally runnable arcade dashboard with demo authentication, SQLite storage, a protected owner panel, virtual-point wallet, game history and seven interactive mini-games.

**Safety boundary:** This project uses virtual points only. It has no real-money deposits, betting, cash-out, financial transfer or redeemable prizes. All scores/outcomes are simulations.

## Requirements
- Windows 10/11
- Node.js 18 or newer (LTS recommended)
- Internet connection for the first `npm install`

## Start in 4 steps
1. Install Node.js LTS from https://nodejs.org/ and restart your terminal.
2. Open the `raja-bhai` folder in File Explorer. In that folder, click the address bar, type `cmd`, and press Enter.
3. Run `npm install`.
4. Run `npm start`, then open **http://localhost:3000** in Chrome or Edge.

Keep the terminal open while using the website. On Android, the phone and laptop must be on the same Wi-Fi; open `http://YOUR-LAPTOP-LAN-IP:3000`. For phone access, configure Windows Firewall for Node.js on a private network only.

## Demo credentials
- Owner ID: `owner`
- Owner password: `RajaAdmin#2026`
- Player account: create one using Sign up. Each new player receives 1,500 virtual points.

Change the owner password after first login using Profile → Change password. The owner account is seeded automatically on first launch.

## Features
- Unique user IDs, bcrypt password hashes, SQLite-backed sessions and account isolation.
- Login/logout and current-password password change.
- One active browser session per login: login regenerates the session; existing sessions are not forcibly revoked from other browsers.
- Wallet ledger, simulated credits and blocked withdrawal request.
- Owner-only user search, balance add/subtract/set, account enable/disable, game availability and audit log.
- Seven original arcade experiences: Aviator Flight, Chicken Road, Balloon Pop, Color Challenge, Limbo Lab, GoRush Sprint and eCrash Orbit.
- Game history, mobile layout and reduced-complexity CSS animations.

## Data and reset
SQLite data is stored in `backend/data/`. Stop the server and remove that folder to reset the local demo database and sessions. This also resets the seeded owner account to its initial demo password.

## Security notes
- Passwords are hashed with bcryptjs (12 rounds).
- Session cookies are HttpOnly and SameSite=Lax; sessions are stored in SQLite.
- Authentication routes are rate-limited; admin APIs require the admin role.
- Use a strong `SESSION_SECRET` environment variable before exposing this app beyond your local machine.
- This is a starter demo, not a production identity system. It does not implement email-based password recovery, CSRF tokens, MFA, forced single-session revocation, or production deployment hardening. The demo password reset requires the currently logged-in user's current password.
- For real deployment, set HTTPS, `SESSION_SECRET` (32+ random characters), `ADMIN_PASSWORD` (12+ unique characters, set before first production start), and `RAJA_DATA_DIR` to a persistent disk mount. The app uses `RAJA_DATA_DIR` for both its SQLite app database and sessions. Also add CSRF protection, backups, monitoring and stricter validation/rate limits before production use.

## Testing
Run `npm test` for the built-in smoke test. Start the server and verify:
1. Sign up two different users and confirm each starts with 1,500 points.
2. Log out and sign into each account; verify their balances and histories remain separate.
3. Log in as `owner`, adjust a player's balance and check the audit log.
4. Disable a player and verify they cannot log in.
5. Play each game and check Game History.
6. Resize the browser or open it on a phone to check the responsive layout.

## Project structure
```text
raja-bhai/
  frontend/
    index.html
    login.html
    signup.html
    dashboard.html
    profile.html
    wallet.html
    games/game.html
    css/style.css
    js/app.js
    assets/
  backend/
    server.js
    database.js
    middleware/auth.js
    routes/
  package.json
```


## Render deployment notes
- Create a Render **Web Service** from this repository (not a Static Site).
- Build command: `npm install`
- Start command: `npm start`
- Set `NODE_ENV=production`, `SESSION_SECRET` to a unique random string (32+ characters), `ADMIN_PASSWORD` to a unique password (12+ characters), and `RAJA_DATA_DIR=/var/data`.
- Attach a paid persistent disk mounted at `/var/data` before first deployment. The disk is required to preserve SQLite users, balances, history and sessions across restarts/redeploys.
- The seeded owner account is `owner`; its initial password is the value of `ADMIN_PASSWORD` when the database is first created. Changing the environment variable later does not change an already-created account password.
- This is still a starter demo, not production-hardened software. Keep it limited to virtual points; do not enable deposits, wagering or cash-outs.
