const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const state = { user:null, games:[], activeTab:"Live", sound:true, timer:null, score:0, round:0 };
const gameMeta = {
  "aviator": ["Aviator Flight","✈️","Guide your plane through a moving sky and build a flight score."],
  "chicken-road": ["Chicken Road","🐔","Hop across lanes, avoid traffic and collect stage points."],
  "balloon": ["Balloon Pop","🎈","Tap floating balloons before they drift away."],
  "color-challenge": ["Color Challenge","🎨","Match the target color before the countdown ends."],
  "limbo": ["Limbo Lab","📈","Time your tap as the moving bar passes the target zone."],
  "gorush": ["GoRush Sprint","🏃","Tap to dash through a short obstacle course."],
  "ecrash": ["eCrash Orbit","🚀","Keep the rocket moving and stop the run before the simulated timer ends."]
};
const navItems = [
  ["Cricket","🏏"],["Football","⚽"],["Tennis","🎾"],["Basketball","🏀"],["Volleyball","🏐"],["Horse Racing info","🐎"],["E-Sports","🎮"],["Table Tennis","🏓"],["Badminton","🏸"],["Snooker","🎱"],["Ice Hockey","🏒"],["Rugby","🏉"],["Match Centre","📊"],["Game History","🕘"],["My Profile","👤"],["Settings","⚙️"],["Help Centre","❔"]
];
async function api(url, options={}) {
  const res = await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function toast(message){const root=$("#toast-root");root.innerHTML=`<div class="toast">${esc(message)}</div>`;setTimeout(()=>root.innerHTML="",2600)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function route(){let p=location.pathname.toLowerCase();if(p.endsWith("login.html"))return"login";if(p.endsWith("signup.html"))return"signup";if(p.endsWith("profile.html"))return"profile";if(p.endsWith("wallet.html"))return"wallet";if(p.includes("/games/"))return"game";if(p.endsWith("admin.html"))return"admin";if(p.endsWith("history.html"))return"history";return"dashboard"}
function go(url){location.href=url}
function navHref(label){if(label==="My Profile")return"/profile.html";if(label==="Game History")return"/history.html";if(label==="Settings")return"/profile.html#settings";if(label==="Help Centre")return"/profile.html#help";return`/?sport=${encodeURIComponent(label)}`}
function shell(content,active=""){
 const side=navItems.map(([n,i])=>`<a class="nav-link ${active===n?"active":""}" href="${navHref(n)}"><span class="nav-icon">${i}</span>${n}</a>`).join("");
 return `<header class="topbar"><button class="icon-btn" id="menu-open" aria-label="Open menu">☰</button><a class="brand" href="/"><span class="brand-mark">♛</span>RAJA BHAI</a><div class="top-spacer"></div>${state.user?`<a class="balance-pill" href="/wallet.html">◈ ${Number(state.user.balance).toLocaleString()} pts</a><a class="user-pill" href="/profile.html">${esc(state.user.userId)} ▾</a><button class="icon-btn" id="logout" title="Log out">↪</button>`:`<a class="btn small secondary" href="/login.html">Log in</a><a class="btn small" href="/signup.html">Join</a>`}</header>
 <div class="ticker"><span>✦ WELCOME TO RAJA BHAI ARCADE &nbsp; • &nbsp; VIRTUAL POINTS ONLY &nbsp; • &nbsp; ALL GAME OUTCOMES ARE SIMULATED &nbsp; • &nbsp; PLAY FOR FUN, NOT MONEY &nbsp; • &nbsp;</span></div>
 <nav class="mobile-nav"><a href="/">Home</a><a href="/wallet.html">Wallet</a><a href="/history.html">History</a><a href="/profile.html">Profile</a>${state.user?.role==="admin"?'<a href="/admin.html">Owner Panel</a>':""}</nav>
 <div class="menu-overlay" id="menu-overlay"></div><aside class="drawer" id="drawer"><div class="row between"><div class="brand"><span class="brand-mark">♛</span>RAJA BHAI</div><button class="icon-btn" id="menu-close">×</button></div><div class="side-label">SPORTS & CENTRE</div>${side}<div class="side-label">ACCOUNT</div><a class="nav-link" href="/wallet.html">◈ Virtual Wallet</a>${state.user?.role==="admin"?'<a class="nav-link" href="/admin.html">🛡 Owner Admin</a>':""}<div class="footer-note">Demo environment · virtual points only</div></aside>
 <div class="layout"><aside class="sidebar"><div class="side-label">SPORTS & CENTRE</div>${side}<div class="side-label">ACCOUNT</div><a class="nav-link" href="/wallet.html">◈ Virtual Wallet</a>${state.user?.role==="admin"?'<a class="nav-link" href="/admin.html">🛡 Owner Admin</a>':""}</aside><main class="main">${content}<div class="footer-note">RAJA BHAI is a simulated arcade demo. No real-money wagering, deposits or payouts.</div></main></div>`;
}
function bindShell(){
 $("#menu-open")?.addEventListener("click",()=>{$("#drawer").classList.add("show");$("#menu-overlay").classList.add("show")});
 const close=()=>{$("#drawer").classList.remove("show");$("#menu-overlay").classList.remove("show")};
 $("#menu-close")?.addEventListener("click",close);$("#menu-overlay")?.addEventListener("click",close);
 $("#logout")?.addEventListener("click",async()=>{try{await api("/api/auth/logout",{method:"POST"});state.user=null;go("/login.html")}catch(e){toast(e.message)}});
}
function mount(html,active){$("#app").innerHTML=shell(html,active);bindShell()}
function stat(label,value,icon){return `<div class="card"><span class="stat-icon">${icon}</span><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`}
function gameCard(key){const [name,emoji,desc]=gameMeta[key];const enabled=state.games.find(g=>g.game_key===key)?.enabled!==false;return `<article class="card game-card"><div class="game-art">${emoji}</div><div class="game-info"><span class="tag">SIMULATED ARCADE</span><h3>${name}</h3><p>${desc}</p><button class="btn block ${enabled?"":"secondary"}" ${enabled?`data-play="${key}"`:"disabled"}>${enabled?"Play demo":"Temporarily unavailable"}</button></div></article>`}
async function dashboard(){
 let content=`<div class="page-head"><div><div class="eyebrow">YOUR ARCADE HUB</div><h1 class="page-title">Welcome${state.user?`, ${esc(state.user.userId)}`:" to RAJA BHAI"} 👋</h1><div class="sub">Pick a game, set a personal score target and have fun.</div></div><a class="btn secondary" href="/wallet.html">◈ Wallet</a></div>
 <div class="announcement"><span>✦</span><div><b>Demo mode active</b><br><span class="sub">Every point is virtual. No cash value, deposits or withdrawals.</span></div></div>
 <div class="grid">${stat("Virtual points",Number(state.user?.balance||0).toLocaleString(),"◈")}${stat("Arcade games",state.games.filter(g=>g.enabled).length,"🎮")}${stat("Account status",state.user?.enabled?"Active":"—","●")}</div>
 <div class="row between"><h2 class="section-title">Arcade games</h2><span class="muted">7 experiences</span></div><div class="grid">${Object.keys(gameMeta).map(gameCard).join("")}</div>`;
 mount(content,"");$$("[data-play]").forEach(b=>b.addEventListener("click",()=>go(`/games/game.html?game=${b.dataset.play}`)));
}
function authPage(kind){
 const signup=kind==="signup";
 $("#app").innerHTML=`<div class="topbar"><a class="brand" href="/"><span class="brand-mark">♛</span>RAJA BHAI</a><div class="top-spacer"></div><a class="btn small secondary" href="/">Home</a></div><div class="form-card"><div class="eyebrow">${signup?"CREATE YOUR ACCOUNT":"WELCOME BACK"}</div><h1 class="page-title">${signup?"Join the arcade":"Log in"}</h1><p class="sub">${signup?"Create a private demo account and receive 1,500 virtual points.":"Sign in to your own virtual arcade account."}</p><form id="auth-form"><div class="field"><label>User ID</label><input name="userId" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" autocomplete="username" placeholder="e.g. raja_player"></div><div class="field"><label>Password</label><input name="password" type="password" required minlength="8" maxlength="72" autocomplete="${signup?"new-password":"current-password"}" placeholder="At least 8 characters"></div>${signup?'<div class="field"><label>Confirm password</label><input name="confirmPassword" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></div>':""}<div class="form-error" id="auth-error"></div><button class="btn block" type="submit">${signup?"Create account":"Log in"}</button></form><p class="sub" style="margin-top:18px">${signup?'Already registered? <a href="/login.html" style="color:var(--teal)">Log in</a>':'New here? <a href="/signup.html" style="color:var(--teal)">Create an account</a>'}</p><p class="muted" style="font-size:11px">Virtual demo only. No real-money transactions.</p></div>`;
 $("#auth-form").addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.target),body=Object.fromEntries(fd);const err=$("#auth-error");err.textContent="";const btn=$("button[type=submit]",e.target);btn.disabled=true;btn.textContent="Please wait…";try{const r=await api(`/api/auth/${signup?"signup":"login"}`,{method:"POST",body:JSON.stringify(body)});state.user=r.user;go("/")}catch(ex){err.textContent=ex.message;btn.disabled=false;btn.textContent=signup?"Create account":"Log in"}});
}
async function wallet(){
 const d=await api("/api/wallet");
 const rows=d.history.map(t=>`<tr><td>${esc(t.kind.replaceAll("_"," "))}</td><td class="${t.amount>=0?"positive":"negative"}">${t.amount>0?"+":""}${t.amount.toLocaleString()}</td><td>${t.balance_after.toLocaleString()}</td><td>${esc(t.note)}</td><td>${new Date(t.created_at+"Z").toLocaleString()}</td></tr>`).join("");
 mount(`<div class="page-head"><div><div class="eyebrow">ACCOUNT</div><h1 class="page-title">Virtual Wallet</h1><div class="sub">A points ledger for this demo account.</div></div></div><div class="card"><div class="stat-label">CURRENT DEMO BALANCE</div><div class="stat-value">◈ ${d.balance.toLocaleString()} <span class="muted" style="font-size:14px">points</span></div><div class="row" style="margin-top:17px"><button class="btn" id="add-credits">＋ Add demo credits</button><button class="btn danger" id="withdraw-demo">Withdrawal request</button></div><p class="muted" style="font-size:11px;margin-bottom:0">Adding credits is a simulation. Withdrawal requests are intentionally disabled.</p></div><h2 class="section-title">Balance history</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>TYPE</th><th>CHANGE</th><th>BALANCE</th><th>NOTE</th><th>DATE</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">No transactions yet.</td></tr>'}</tbody></table></div>`);
 $("#add-credits").onclick=async()=>{const amount=Number(prompt("Add how many virtual demo credits? (1–5,000)","500"));if(!Number.isFinite(amount))return;try{await api("/api/wallet/credits",{method:"POST",body:JSON.stringify({amount})});toast("Demo credits added.");await refreshUser();wallet()}catch(e){toast(e.message)}};
 $("#withdraw-demo").onclick=()=>toast("Real withdrawals are disabled in this virtual demo.");
}
async function profile(){
 const h=await api("/api/history");
 mount(`<div class="page-head"><div><div class="eyebrow">ACCOUNT CENTRE</div><h1 class="page-title">My Profile</h1><div class="sub">Your account details and security settings.</div></div></div><div class="grid">${stat("User ID",esc(state.user.userId),"👤")}${stat("Account role",state.user.role==="admin"?"Owner":"Player","🛡")}${stat("Status",state.user.enabled?"Active":"Disabled","●")}</div><div class="card" id="settings" style="margin-top:16px"><h2 class="section-title" style="margin-top:0">Change password</h2><form id="pw-form"><div class="field"><label>Current password</label><input type="password" name="currentPassword" required></div><div class="field"><label>New password (8+ characters)</label><input type="password" name="newPassword" minlength="8" required></div><div class="form-error" id="pw-error"></div><button class="btn">Update password</button></form></div><div class="card" id="help" style="margin-top:15px"><h2 class="section-title" style="margin-top:0">Help Centre</h2><p class="sub">This is a local demo. Your points have no cash value. For account access, use the owner account on this local installation.</p></div>`);
 $("#pw-form").onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));try{await api("/api/auth/reset-password",{method:"POST",body:JSON.stringify(body)});toast("Password updated.")}catch(x){$("#pw-error").textContent=x.message}};
}
async function historyPage(){
 const h=await api("/api/history");
 mount(`<div class="page-head"><div><div class="eyebrow">YOUR ACTIVITY</div><h1 class="page-title">Game History</h1><div class="sub">Recent simulated arcade sessions.</div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>GAME</th><th>SCORE</th><th>RESULT</th><th>DATE</th></tr></thead><tbody>${h.history.map(x=>`<tr><td>${esc(gameMeta[x.game_key]?.[0]||x.game_key)}</td><td>${x.score}</td><td>${esc(x.result)}</td><td>${new Date(x.created_at+"Z").toLocaleString()}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">Play a game to see your history.</td></tr>'}</tbody></table></div>`);
}
async function adminPage(){
 const [o,u,g,a]=await Promise.all([api("/api/admin/overview"),api("/api/admin/users"),api("/api/admin/games"),api("/api/admin/audit")]);
 const userRows=u.users.map(x=>`<tr><td>${esc(x.userId)}</td><td>${x.balance.toLocaleString()}</td><td><span class="badge ${x.enabled?"":"off"}">${x.enabled?"Active":"Disabled"}</span></td><td><div class="admin-actions"><button class="btn small secondary" data-user="${x.id}">Manage</button></div></td></tr>`).join("");
 mount(`<div class="page-head"><div><div class="eyebrow">RESTRICTED AREA</div><h1 class="page-title">Owner Admin</h1><div class="sub">All changes are recorded in the audit log.</div></div><span class="badge">ADMIN ONLY</span></div><div class="admin-grid">${stat("Registered players",o.users,"👥")}${stat("Active accounts",o.active,"●")}${stat("Game sessions",o.games,"🎮")}${stat("Virtual points",o.points.toLocaleString(),"◈")}</div><div class="card" style="margin-top:16px"><div class="row between"><h2 class="section-title" style="margin:0">Registered users</h2><input class="pill-input" id="user-search" placeholder="Search User ID"></div><div class="table-wrap" style="margin-top:14px"><table class="data-table"><thead><tr><th>USER ID</th><th>BALANCE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody id="user-rows">${userRows||'<tr><td colspan="4">No users yet.</td></tr>'}</tbody></table></div></div><div class="card" style="margin-top:16px"><h2 class="section-title" style="margin-top:0">Game availability</h2><div class="grid">${g.games.map(x=>`<div class="row between"><span>${esc(gameMeta[x.game_key]?.[0]||x.game_key)}</span><button class="btn small ${x.enabled?"secondary":"danger"}" data-game="${x.game_key}" data-enabled="${x.enabled}">${x.enabled?"Enabled":"Disabled"}</button></div>`).join("")}</div></div><div class="card" style="margin-top:16px"><h2 class="section-title" style="margin-top:0">Audit log</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>OWNER</th><th>ACTION</th><th>TARGET</th><th>DETAILS</th><th>DATE</th></tr></thead><tbody>${a.logs.map(x=>`<tr><td>${esc(x.actor||"—")}</td><td>${esc(x.action)}</td><td>${esc(x.target||"—")}</td><td>${esc(x.details)}</td><td>${new Date(x.created_at+"Z").toLocaleString()}</td></tr>`).join("")||'<tr><td colspan="5">No owner actions recorded yet.</td></tr>'}</tbody></table></div></div>`);
 $("#user-search").oninput=async e=>{const r=await api("/api/admin/users?q="+encodeURIComponent(e.target.value));$("#user-rows").innerHTML=r.users.map(x=>`<tr><td>${esc(x.userId)}</td><td>${x.balance.toLocaleString()}</td><td><span class="badge ${x.enabled?"":"off"}">${x.enabled?"Active":"Disabled"}</span></td><td><button class="btn small secondary" data-user="${x.id}">Manage</button></td></tr>`).join("")||'<tr><td colspan="4">No matches.</td></tr>';bindManage()};
 function bindManage(){$$("[data-user]").forEach(b=>b.onclick=()=>manageUser(b.dataset.user))}
 bindManage();
 $$("[data-game]").forEach(b=>b.onclick=async()=>{try{await api(`/api/admin/games/${b.dataset.game}`,{method:"POST",body:JSON.stringify({enabled:b.dataset.enabled!=="true"})});toast("Game setting saved.");adminPage()}catch(e){toast(e.message)}});
}
async function manageUser(id){
 const d=await api(`/api/admin/users/${id}`);
 const modal=document.createElement("div");modal.className="modal-backdrop";modal.innerHTML=`<div class="modal"><div class="row between"><h2 style="margin:0">Manage ${esc(d.user.user_id)}</h2><button class="icon-btn" id="modal-x">×</button></div><p class="sub">Current balance: <b>${d.user.balance}</b> points</p><div class="field"><label>Amount (whole virtual points)</label><input id="admin-amount" type="number" min="0" max="1000000" value="500"></div><div class="row"><button class="btn small" data-balance="add">Add</button><button class="btn small secondary" data-balance="subtract">Subtract</button><button class="btn small secondary" data-balance="set">Set balance</button></div><div class="row between" style="margin-top:18px"><span>Account ${d.user.enabled?"enabled":"disabled"}</span><button class="btn small ${d.user.enabled?"danger":"secondary"}" id="toggle-user">${d.user.enabled?"Disable":"Enable"}</button></div><p class="muted" style="font-size:11px">Every owner action is added to the audit log.</p></div>`;
 document.body.append(modal);modal.querySelector("#modal-x").onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
 modal.querySelectorAll("[data-balance]").forEach(b=>b.onclick=async()=>{try{await api(`/api/admin/users/${id}/balance`,{method:"POST",body:JSON.stringify({action:b.dataset.balance,amount:Number($("#admin-amount",modal).value)})});toast("Balance updated.");modal.remove();adminPage()}catch(e){toast(e.message)}});
 modal.querySelector("#toggle-user").onclick=async()=>{try{await api(`/api/admin/users/${id}/status`,{method:"POST",body:JSON.stringify({enabled:!d.user.enabled})});toast("Account status updated.");modal.remove();adminPage()}catch(e){toast(e.message)}};
}
function gamePage(){
 const key=new URLSearchParams(location.search).get("game")||"aviator";if(!gameMeta[key])return dashboard();
 const [name,emoji,desc]=gameMeta[key];state.score=0;state.round=0;
 mount(`<div class="page-head"><div><div class="eyebrow">SIMULATED ARCADE</div><h1 class="page-title">${name}</h1><div class="sub">${desc}</div></div><a class="btn secondary" href="/">← All games</a></div><div class="game-shell"><div class="game-stage" id="stage"><div class="cloud">☁️</div><div class="cloud c2">☁️</div><div class="cloud c3">☁️</div><div class="big-emoji" id="game-actor">${emoji}</div></div><div class="game-controls"><span class="score-chip">Score: <b id="score">0</b></span><span class="score-chip">Time: <b id="time">—</b></span><button class="btn" id="start-game">Start game</button><button class="btn secondary" id="pause-game">Pause</button><button class="btn secondary" id="restart-game">Restart</button><button class="btn secondary" id="sound-game">🔊 Sound on</button></div></div><p class="muted" style="font-size:11px;margin-top:12px">This is a skill-style simulation. Scores do not convert to money or redeemable prizes.</p><div class="card" style="margin-top:14px"><h3 style="margin-top:0">How to play</h3><p class="sub" id="instructions">${instructions(key)}</p><div class="row" id="extra-controls"></div></div>`);
 initGame(key);
}
function instructions(k){return ({aviator:"Press Start, watch the plane move through the sky, then pause or restart. Your score tracks simulated flight time.", "chicken-road":"Tap HOP or press Space to move the chicken forward. Avoid the passing traffic and earn points for each safe lane.", balloon:"Tap the floating balloons to pop them and score points. Start a 20-second round.", "color-challenge":"A target color appears. Select the matching color card before the timer reaches zero.",limbo:"Tap when the moving marker enters the highlighted target zone to score. Each round speeds up.",gorush:"Tap DASH repeatedly to move through the sprint course. Avoid the obstacle and reach the finish.",ecrash:"Start a simulated rocket flight. Press STOP before the flight timer ends to bank your score."})[k]}
function initGame(k){
 let running=false,paused=false,score=0,time=0,interval=null,spawn=null,position=0;
 const stage=$("#stage"),actor=$("#game-actor"),scoreEl=$("#score"),timeEl=$("#time"),start=$("#start-game"),pause=$("#pause-game"),extra=$("#extra-controls");
 const update=()=>{scoreEl.textContent=score;timeEl.textContent=time;};
 function stop(){running=false;clearInterval(interval);clearInterval(spawn);interval=null;spawn=null;start.textContent="Start game";pause.textContent="Pause"}
 async function save(result="completed"){try{await api("/api/games/history",{method:"POST",body:JSON.stringify({gameKey:k,score,result})})}catch(e){toast(e.message)}}
 function finish(result){stop();toast(`Round complete · score ${score}`);save(result)}
 function startRound(){stop();running=true;paused=false;score=0;time=0;position=0;update();start.textContent="Running…";pause.textContent="Pause";stage.querySelectorAll(".balloon,.obstacle").forEach(x=>x.remove());if(k==="aviator"){actor.className="big-emoji plane";}else{actor.className="big-emoji";} 
  if(k==="aviator"){interval=setInterval(()=>{if(!running)return;time++;score=time*10;update()},1000)}
  if(k==="chicken-road"){actor.className="chicken";actor.textContent="🐔";actor.style.left="10%";stage.insertAdjacentHTML("beforeend",'<div class="road"></div><div class="obstacle">🚗</div>');interval=setInterval(()=>{time++;if(time%3===0){score+=10;update()}if(time>=40)finish("finished")},1000)}
  if(k==="balloon"){actor.style.display="none";for(let i=0;i<7;i++){const b=document.createElement("button");b.className="balloon";b.textContent=["🎈","🎈","🎈","🟣","🎈"][i%5];b.style.left=(8+i*13)+"%";b.style.animationDelay=(-i*.7)+"s";b.onclick=()=>{score+=10;update();b.remove()};stage.append(b)}interval=setInterval(()=>{time++;update();if(time>=20)finish("time_up")},1000)}
  if(k==="color-challenge"){actor.style.display="none";let target;const colors=["#e74d68","#27c49b","#4e91f0","#e8b84f"];const labels=["RED","GREEN","BLUE","YELLOW"];function next(){target=Math.floor(Math.random()*4);stage.innerHTML=`<div style="text-align:center;z-index:3"><div class="muted">MATCH THIS COLOR</div><div style="width:72px;height:72px;border-radius:50%;background:${colors[target]};margin:14px auto"></div><b>${labels[target]}</b></div>`;extra.innerHTML=colors.map((c,i)=>`<button class="color-choice" data-color="${i}" style="background:${c}"></button>`).join("");$$("[data-color]",extra).forEach(b=>b.onclick=()=>{if(Number(b.dataset.color)===target)score+=15;else score=Math.max(0,score-5);update();next()})}next();interval=setInterval(()=>{time++;update();if(time>=25)finish("time_up")},1000)}
  if(k==="limbo"){stage.innerHTML='<div class="progress"><i id="limbo-bar"></i></div><div style="position:absolute;top:20%;color:#a8efdb">HIT THE TARGET ZONE</div>';let v=0,dir=1;interval=setInterval(()=>{time++;v+=dir*7;if(v>=100||v<=0)dir*=-1;const bar=$("#limbo-bar");if(bar)bar.style.width=v+"%";update();if(time>=30)finish("time_up")},160)}
  if(k==="gorush"){actor.textContent="🏃";actor.style.display="block";actor.style.position="absolute";actor.style.left="8%";actor.style.bottom="20%";stage.insertAdjacentHTML("beforeend",'<div class="road"></div><div class="obstacle">🪵</div>');interval=setInterval(()=>{time++;if(time>=25)finish("finished");update()},1000)}
  if(k==="ecrash"){actor.textContent="🚀";actor.className="big-emoji plane";interval=setInterval(()=>{time++;score=time*12;update();if(time>=18)finish("auto_end")},1000)}
  update();
 }
 start.onclick=()=>{if(!running)startRound()};
 pause.onclick=()=>{if(!running)return;paused=!paused;if(paused){clearInterval(interval);pause.textContent="Resume"}else{pause.textContent="Pause";if(k==="aviator"||k==="chicken-road"||k==="balloon"||k==="color-challenge"||k==="gorush"||k==="ecrash")interval=setInterval(()=>{time++;if(k==="aviator"||k==="ecrash")score+=k==="ecrash"?12:10;update();if((k==="balloon"&&time>=20)||(k==="color-challenge"&&time>=25)||(k==="chicken-road"&&time>=40)||(k==="gorush"&&time>=25)||(k==="ecrash"&&time>=18))finish("time_up")},1000)}};
 $("#restart-game").onclick=()=>startRound();
 $("#sound-game").onclick=e=>{state.sound=!state.sound;e.currentTarget.textContent=state.sound?"🔊 Sound on":"🔇 Sound off";toast(state.sound?"Sound enabled (UI demo)":"Sound muted")};
 stage.addEventListener("click",e=>{if(!running||paused)return;if(k==="chicken-road"||k==="gorush"){score+=10;position+=1;actor.style.left=Math.min(78,10+position*8)+"%";update()}if(k==="limbo"){score+=Math.random()>.45?20:0;update()}if(k==="ecrash"){finish("stopped_by_player")}});
 document.addEventListener("keydown",e=>{if(e.code==="Space"&&["chicken-road","gorush"].includes(k)){e.preventDefault();stage.click()}});
 extra.innerHTML=`<button class="btn" id="action-game">${({ "chicken-road":"HOP","gorush":"DASH",limbo:"TAP TARGET",ecrash:"STOP FLIGHT"}[k]||"PLAY")}</button>`;
 $("#action-game").onclick=()=>{if(!running){toast("Press Start first.");return}if(k==="chicken-road"||k==="gorush"){score+=10;position++;actor.style.left=Math.min(78,10+position*8)+"%";update()}else if(k==="limbo"){score+=20;update()}else if(k==="ecrash"){finish("stopped_by_player")}};
}
async function refreshUser(){const r=await api("/api/me");state.user=r.user}
async function init(){
 try{await refreshUser()}catch(e){state.user=null}
 try{const g=await api("/api/games");state.games=g.games}catch(e){state.games=Object.keys(gameMeta).map(game_key=>({game_key,enabled:true}))}
 const r=route();
 if(r==="login"||r==="signup"){authPage(r);return}
 if(!state.user){go("/login.html");return}
 if(r==="wallet"){await wallet();return}
 if(r==="profile"){await profile();return}
 if(r==="history"){await historyPage();return}
 if(r==="admin"){if(state.user.role!=="admin"){go("/");return}await adminPage();return}
 if(r==="game"){gamePage();return}
 await dashboard();
}
window.addEventListener("DOMContentLoaded",()=>init().catch(e=>{$("#app").innerHTML=`<div class="form-card"><h2>Could not load RAJA BHAI</h2><p class="sub">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Retry</button></div>`}));
