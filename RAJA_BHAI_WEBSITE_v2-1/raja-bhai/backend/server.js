const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const db = require("./database");
const { requireAuth, requireAdmin } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.RAJA_DATA_DIR || path.join(__dirname, "data");
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "local-development-secret-only");
if (process.env.NODE_ENV === "production" && (!SESSION_SECRET || SESSION_SECRET.length < 32)) {
  throw new Error("Set SESSION_SECRET to a random value of at least 32 characters.");
}
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  store: new SQLiteStore({ db: "sessions.sqlite", dir: DATA_DIR }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: "raja.sid",
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 12 }
}));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false });

const adminId = "owner";
const adminExists = db.prepare("SELECT id FROM users WHERE user_id=?").get(adminId);
if (!adminExists) {
  const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "RajaAdmin#2026");
  if (!adminPassword || adminPassword.length < 12) throw new Error("Set ADMIN_PASSWORD to a unique password of at least 12 characters before first production start.");
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare("INSERT INTO users(user_id,password_hash,role,balance) VALUES(?,?, 'admin', 0)").run(adminId, hash);
}

function publicUser(row) {
  return { id: row.id, userId: row.user_id, role: row.role, balance: row.balance, enabled: !!row.enabled, createdAt: row.created_at };
}
function audit(admin, action, target, details = {}) {
  db.prepare("INSERT INTO audit_logs(admin_id,action,target_user_id,details) VALUES(?,?,?,?)")
    .run(admin.id, action, target || null, JSON.stringify(details));
}
function tx(userId, kind, amount, balanceAfter, note, actorId = null) {
  db.prepare("INSERT INTO transactions(user_id,kind,amount,balance_after,note,actor_id) VALUES(?,?,?,?,?,?)")
    .run(userId, kind, amount, balanceAfter, note, actorId);
}
function cleanId(v) { return typeof v === "string" && /^[a-zA-Z0-9_]{3,20}$/.test(v); }

app.get("/api/health", (req,res) => res.json({ ok: true, app: "RAJA BHAI", mode: "virtual-demo" }));

app.post("/api/auth/signup", authLimiter, (req,res) => {
  const { userId, password, confirmPassword } = req.body || {};
  if (!cleanId(userId)) return res.status(400).json({ error: "User ID must be 3–20 letters, numbers or underscores." });
  if (typeof password !== "string" || password.length < 8 || password.length > 72) return res.status(400).json({ error: "Password must be 8–72 characters." });
  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match." });
  if (db.prepare("SELECT id FROM users WHERE user_id=?").get(userId)) return res.status(409).json({ error: "That User ID is already taken." });
  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare("INSERT INTO users(user_id,password_hash,balance) VALUES(?,?,1500)").run(userId, hash);
  tx(info.lastInsertRowid, "welcome_credit", 1500, 1500, "Welcome demo credits");
  const row = db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid);
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start session." });
    req.session.user = publicUser(row);
    res.status(201).json({ user: req.session.user });
  });
});

app.post("/api/auth/login", authLimiter, (req,res) => {
  const { userId, password } = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE user_id=?").get(String(userId || ""));
  if (!row || !bcrypt.compareSync(String(password || ""), row.password_hash)) return res.status(401).json({ error: "Incorrect User ID or password." });
  if (!row.enabled) return res.status(403).json({ error: "This demo account is disabled. Contact the owner." });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start session." });
    db.prepare("UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?").run(row.id);
    req.session.user = publicUser(row);
    res.json({ user: req.session.user });
  });
});

app.post("/api/auth/logout", (req,res) => {
  req.session.destroy(() => { res.clearCookie("raja.sid"); res.json({ ok: true }); });
});
app.get("/api/me", requireAuth, (req,res) => {
  const row = db.prepare("SELECT * FROM users WHERE id=?").get(req.session.user.id);
  if (!row || !row.enabled) return req.session.destroy(() => res.status(401).json({ error: "Account unavailable." }));
  req.session.user = publicUser(row);
  res.json({ user: req.session.user });
});

// Demo-only password reset: requires current password; no insecure account lookup reset.
app.post("/api/auth/reset-password", requireAuth, (req,res) => {
  const { currentPassword, newPassword } = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE id=?").get(req.session.user.id);
  if (!bcrypt.compareSync(String(currentPassword || ""), row.password_hash)) return res.status(400).json({ error: "Current password is incorrect." });
  if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) return res.status(400).json({ error: "New password must be 8–72 characters." });
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(newPassword,12), row.id);
  res.json({ ok: true });
});

app.get("/api/wallet", requireAuth, (req,res) => {
  const user = db.prepare("SELECT balance FROM users WHERE id=?").get(req.session.user.id);
  const history = db.prepare("SELECT kind,amount,balance_after,note,created_at FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 100").all(req.session.user.id);
  res.json({ balance: user.balance, history });
});
app.post("/api/wallet/credits", requireAuth, (req,res) => {
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > 5000) return res.status(400).json({ error: "Choose 1–5,000 demo credits." });
  const update = db.transaction(() => {
    const row = db.prepare("SELECT balance FROM users WHERE id=?").get(req.session.user.id);
    const balance = row.balance + amount;
    db.prepare("UPDATE users SET balance=? WHERE id=?").run(balance, req.session.user.id);
    tx(req.session.user.id, "demo_credit", amount, balance, "User-added demo credits");
    return balance;
  });
  const balance = update();
  req.session.user.balance = balance;
  res.json({ balance });
});
app.post("/api/wallet/withdrawal-request", requireAuth, (req,res) => {
  res.status(400).json({ error: "Real withdrawals are not supported. This wallet contains virtual demo points only." });
});

app.get("/api/games", requireAuth, (req,res) => {
  res.json({ games: db.prepare("SELECT game_key,enabled,config_json FROM game_settings ORDER BY game_key").all().map(g => ({...g, enabled:!!g.enabled, config:JSON.parse(g.config_json)})) });
});
app.post("/api/games/history", requireAuth, (req,res) => {
  const { gameKey, score, result } = req.body || {};
  const allowed = ["aviator","chicken-road","balloon","color-challenge","limbo","gorush","ecrash"];
  if (!allowed.includes(gameKey)) return res.status(400).json({ error: "Unknown game." });
  const setting = db.prepare("SELECT enabled FROM game_settings WHERE game_key=?").get(gameKey);
  if (!setting || !setting.enabled) return res.status(403).json({ error: "This game is currently unavailable." });
  const safeScore = Math.max(0, Math.min(100000, Math.floor(Number(score) || 0)));
  db.prepare("INSERT INTO game_history(user_id,game_key,score,points_used,result) VALUES(?,?,?,0,?)")
    .run(req.session.user.id, gameKey, safeScore, String(result || "completed").slice(0,40));
  res.json({ ok: true });
});
app.get("/api/history", requireAuth, (req,res) => {
  res.json({ history: db.prepare("SELECT game_key,score,result,created_at FROM game_history WHERE user_id=? ORDER BY id DESC LIMIT 50").all(req.session.user.id) });
});

app.get("/api/admin/overview", requireAdmin, (req,res) => {
  const users = db.prepare("SELECT COUNT(*) n FROM users WHERE role='user'").get().n;
  const active = db.prepare("SELECT COUNT(*) n FROM users WHERE role='user' AND enabled=1").get().n;
  const games = db.prepare("SELECT COUNT(*) n FROM game_history").get().n;
  const points = db.prepare("SELECT COALESCE(SUM(balance),0) n FROM users WHERE role='user'").get().n;
  res.json({ users, active, games, points });
});
app.get("/api/admin/users", requireAdmin, (req,res) => {
  const q = String(req.query.q || "").slice(0,30);
  const rows = db.prepare("SELECT id,user_id,role,balance,enabled,created_at,last_login FROM users WHERE role='user' AND user_id LIKE ? ORDER BY id DESC LIMIT 100").all(`%${q}%`);
  res.json({ users: rows.map(r => ({id:r.id,userId:r.user_id,balance:r.balance,enabled:!!r.enabled,createdAt:r.created_at,lastLogin:r.last_login})) });
});
app.get("/api/admin/users/:id", requireAdmin, (req,res) => {
  const user = db.prepare("SELECT id,user_id,role,balance,enabled,created_at,last_login FROM users WHERE id=? AND role='user'").get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found." });
  const transactions = db.prepare("SELECT kind,amount,balance_after,note,created_at FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 30").all(user.id);
  const games = db.prepare("SELECT game_key,score,result,created_at FROM game_history WHERE user_id=? ORDER BY id DESC LIMIT 30").all(user.id);
  res.json({ user:{...user,enabled:!!user.enabled}, transactions, games });
});
app.post("/api/admin/users/:id/balance", requireAdmin, (req,res) => {
  const target = Number(req.params.id), { action, amount } = req.body || {};
  const n = Number(amount);
  if (!Number.isInteger(n) || n < 0 || n > 1000000) return res.status(400).json({ error: "Amount must be 0–1,000,000 whole points." });
  const result = db.transaction(() => {
    const user = db.prepare("SELECT * FROM users WHERE id=? AND role='user'").get(target);
    if (!user) throw new Error("User not found.");
    let balance = user.balance;
    if (action === "add") balance += n;
    else if (action === "subtract") balance -= n;
    else if (action === "set") balance = n;
    else throw new Error("Invalid balance action.");
    if (balance < 0) throw new Error("Insufficient balance for subtraction.");
    db.prepare("UPDATE users SET balance=? WHERE id=?").run(balance,target);
    const delta = balance - user.balance;
    tx(target, `admin_${action}`, delta, balance, `Owner ${action}: ${n} points`, req.session.user.id);
    audit(req.session.user, `balance_${action}`, target, { amount:n, oldBalance:user.balance, newBalance:balance });
    return balance;
  });
  try { res.json({ balance: result() }); } catch(e) { res.status(400).json({ error:e.message }); }
});
app.post("/api/admin/users/:id/status", requireAdmin, (req,res) => {
  const target = Number(req.params.id), enabled = !!req.body.enabled;
  const user = db.prepare("SELECT id FROM users WHERE id=? AND role='user'").get(target);
  if (!user) return res.status(404).json({ error:"User not found." });
  db.prepare("UPDATE users SET enabled=? WHERE id=?").run(enabled?1:0,target);
  audit(req.session.user, enabled?"account_enabled":"account_disabled", target, {enabled});
  res.json({ok:true});
});
app.get("/api/admin/games", requireAdmin, (req,res) => res.json({games:db.prepare("SELECT game_key,enabled,config_json FROM game_settings").all().map(g=>({...g,enabled:!!g.enabled,config:JSON.parse(g.config_json)}))}));
app.post("/api/admin/games/:key", requireAdmin, (req,res) => {
  const allowed = ["aviator","chicken-road","balloon","color-challenge","limbo","gorush","ecrash"];
  if (!allowed.includes(req.params.key)) return res.status(404).json({error:"Unknown game."});
  const enabled = !!req.body.enabled;
  db.prepare("UPDATE game_settings SET enabled=? WHERE game_key=?").run(enabled?1:0,req.params.key);
  audit(req.session.user,"game_availability_changed",null,{game:req.params.key,enabled});
  res.json({ok:true});
});
app.get("/api/admin/audit", requireAdmin, (req,res) => {
  res.json({logs:db.prepare("SELECT a.action,a.details,a.created_at,u.user_id AS actor,t.user_id AS target FROM audit_logs a LEFT JOIN users u ON u.id=a.admin_id LEFT JOIN users t ON t.id=a.target_user_id ORDER BY a.id DESC LIMIT 100").all()});
});

app.use(express.static(path.join(__dirname,"..","frontend")));
app.get("*", (req,res) => res.sendFile(path.join(__dirname,"..","frontend","index.html")));
app.use((err,req,res,next) => { console.error(err); res.status(500).json({error:"Unexpected server error."}); });

app.listen(PORT, "0.0.0.0", () => console.log(`RAJA BHAI demo running on port ${PORT}`));
