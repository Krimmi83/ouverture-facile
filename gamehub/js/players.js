
(async function(){
  const tabs = document.getElementById('plTabs');
  const headRow = document.getElementById('plHeadRow');
  const tbody = document.querySelector('#plTable tbody');
  const search = document.getElementById('search');
  const adminBtn = document.getElementById('adminBtn');
  const adminBadge = document.getElementById('adminBadge');

  let currentGame = 'smash';

  // Form fields
  const fId = document.getElementById('fId');
  const fUser = document.getElementById('fUser');
  const fEmail = document.getElementById('fEmail');
  const fSmashWins = document.getElementById('fSmashWins');
  const fSmashLosses = document.getElementById('fSmashLosses');
  const fMkWins = document.getElementById('fMkWins');
  const fMkLosses = document.getElementById('fMkLosses');
  const fDemDiff = document.getElementById('fDemDiff');
  const fDemScore = document.getElementById('fDemScore');
  const fMcKills = document.getElementById('fMcKills');
  const fMcDeaths = document.getElementById('fMcDeaths');

  const addDemoBtn = document.getElementById('addDemo');
  const clearAllBtn = document.getElementById('clearAll');
  const backupBtn = document.getElementById('backupFolder');
  const form = document.getElementById('playerForm');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');

  function isAdmin(){ return localStorage.getItem('gamehub_admin_mode')==='1'; }
  function setAdminUI(){
    adminBadge.textContent = 'Admin: ' + (isAdmin()?'unlocked':'locked');
    adminBadge.className = 'badge ' + (isAdmin()?'green':'gray');
    for (const el of document.querySelectorAll('[data-admin-only]')) {
      el.style.display = isAdmin() ? '' : 'none';
    }
    for (const el of form.querySelectorAll('input,select,button')) {
      if (el === resetBtn) continue;
      el.disabled = !isAdmin();
    }
  }

  tabs.addEventListener('click', e => {
    const btn = e.target.closest('button[data-game]'); if (!btn) return;
    for (const b of tabs.querySelectorAll('button')) b.classList.remove('active');
    btn.classList.add('active'); currentGame = btn.dataset.game;
    for (const panel of document.querySelectorAll('.game-panel')) {
      panel.style.display = (panel.dataset.game === currentGame) ? '' : 'none';
    }
    render();
  });

  adminBtn.addEventListener('click', async ()=>{ await requestAdmin(); setAdminUI(); });

  document.getElementById('addDemo').addEventListener('click', async () => {
    try{
      const list = await api.listPlayers();
      const nextId = (list.reduce((m,p)=>Math.max(m, p.id||0), 0) + 1);
      const demo = {
        id: nextId,
        username: `Player${nextId}`,
        email: `player${nextId}@example.com`,
        games: {
          smash: { wins: Math.floor(Math.random()*20), losses: Math.floor(Math.random()*12) },
          mariokart: { wins: Math.floor(Math.random()*20), losses: Math.floor(Math.random()*12) },
          demineur: { difficulty: ['Beginner','Intermediate','Expert'][Math.floor(Math.random()*3)], score: Math.floor(Math.random()*500) },
          minecraft: { kills: Math.floor(Math.random()*60), deaths: Math.floor(Math.random()*40) }
        }
      };
      await api.upsertPlayer(demo);
      await render();
    }catch(e){ alert('Admin required to add demo data.'); }
  });

  document.getElementById('clearAll').addEventListener('click', async () => {
    if (!confirm('Clear ALL players? This cannot be undone.')) return;
    if (!isAdmin()) return alert('Admin required.');
    localStorage.setItem('gamehub_users_v2', '[]');
    await render();
  });

  if (backupBtn) backupBtn.addEventListener('click', async ()=>{
    try{
      const data = await api.exportJson();
      const text = JSON.stringify(data, null, 2);
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const fname = `players-${ts}.json`;
      if ('showDirectoryPicker' in window) {
        try {
          const root = await window.showDirectoryPicker({ mode: 'readwrite' });
          const dir = await root.getDirectoryHandle('joueurs', { create: true });
          const fileHandle = await dir.getFileHandle(fname, { create: true });
          const w = await fileHandle.createWritable();
          await w.write(text); await w.close();
          alert(`Sauvegarde créée dans le dossier “joueurs” : ${fname}`);
          return;
        } catch (err) { console.warn('FS Access failed, fallback to download', err); }
      }
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `joueurs-${fname}`; a.click(); URL.revokeObjectURL(url);
      alert('Le fichier de sauvegarde a été téléchargé.');
    }catch(e){ console.error(e); alert('Backup failed.'); }
  });

  search.addEventListener('input', render);

  window.editPlayer = async (id) => {
    const p = (await api.listPlayers()).find(x => x.id === id); if (!p) return;
    fId.value = p.id; fUser.value = p.username; fEmail.value = p.email || '';
    const g = p.games || {};
    fSmashWins.value = g.smash?.wins ?? 0; fSmashLosses.value = g.smash?.losses ?? 0;
    fMkWins.value = g.mariokart?.wins ?? 0; fMkLosses.value = g.mariokart?.losses ?? 0;
    fDemDiff.value = g.demineur?.difficulty || 'Beginner'; fDemScore.value = g.demineur?.score ?? 0;
    fMcKills.value = g.minecraft?.kills ?? 0; fMcDeaths.value = g.minecraft?.deaths ?? 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.deletePlayer = async (id) => {
    try{ await api.deletePlayer(id); await render(); }catch(e){ alert('Admin required.'); }
  };

  window.addWin = async (id, game) => { try{ await api.addWin(id, game); await render(); }catch(e){ alert('Admin required.'); } };
  window.addLoss = async (id, game) => { try{ await api.addLoss(id, game); await render(); }catch(e){ alert('Admin required.'); } };
  window.addKill = async (id) => { try{ await api.addKill(id); await render(); }catch(e){ alert('Admin required.'); } };
  window.addDeath = async (id) => { try{ await api.addDeath(id); await render(); }catch(e){ alert('Admin required.'); } };

  document.getElementById('saveBtn').addEventListener('click', async () => {
    if (!isAdmin()) return alert('Admin required.');
    const username = fUser.value.trim();
    const email = fEmail.value.trim();
    if (!username || !email) return alert('Username and Email are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Invalid email format.');

    const id = parseInt(fId.value, 10) || undefined;
    const payload = {
      id, username, email,
      games: {
        smash: { wins: Math.max(0, parseInt(fSmashWins.value||'0',10)), losses: Math.max(0, parseInt(fSmashLosses.value||'0',10)) },
        mariokart: { wins: Math.max(0, parseInt(fMkWins.value||'0',10)), losses: Math.max(0, parseInt(fMkLosses.value||'0',10)) },
        demineur: { difficulty: fDemDiff.value, score: Math.max(0, parseInt(fDemScore.value||'0',10)) },
        minecraft: { kills: Math.max(0, parseInt(fMcKills.value||'0',10)), deaths: Math.max(0, parseInt(fMcDeaths.value||'0',10)) }
      }
    };
    try{ await api.upsertPlayer(payload); document.getElementById('playerForm').reset(); await render(); }
    catch(e){ alert('Admin required.'); }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    fId.value=''; fUser.value=''; fEmail.value='';
    fSmashWins.value=0; fSmashLosses.value=0; fMkWins.value=0; fMkLosses.value=0;
    fDemDiff.value='Beginner'; fDemScore.value=0; fMcKills.value=0; fMcDeaths.value=0;
  });

  async function render(){
    const q = (search.value||'').toLowerCase().trim();
    const list = (await api.listPlayers()).filter(p => !q || p.username.toLowerCase().includes(q) || (p.email||'').toLowerCase().includes(q));

    // Table header & row renderer per tab
    let rows='';
    if (currentGame==='smash' || currentGame==='mariokart'){
      headRow.innerHTML = `<th>Id</th><th>Username</th><th>${currentGame==='smash'?'Smash':'Mario Kart'} (W-L)</th><th>Email</th><th>Actions</th>`;
      rows = list.map(p=>{
        const g = p.games?.[currentGame]||{};
        return `<tr>
          <td>${p.id}</td><td>${escapeHtml(p.username)}</td>
          <td>${(g.wins|0)}-${(g.losses|0)}</td>
          <td class="muted">${escapeHtml(p.email||'')}</td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn" data-admin-only onclick='editPlayer(${p.id})'>Edit</button>
            <button class="btn danger" data-admin-only onclick='deletePlayer(${p.id})'>Delete</button>
            <button class="btn success" data-admin-only onclick='addWin(${p.id},"${currentGame}")'>+ Win</button>
            <button class="btn warn" data-admin-only onclick='addLoss(${p.id},"${currentGame}")'>+ Loss</button>
          </td>
        </tr>`;
      }).join('');
    } else if (currentGame==='demineur'){
      headRow.innerHTML = `<th>Id</th><th>Username</th><th>Difficulté</th><th>Score</th><th>Email</th><th>Actions</th>`;
      rows = list.map(p=>{
        const g = p.games?.demineur||{};
        return `<tr>
          <td>${p.id}</td><td>${escapeHtml(p.username)}</td>
          <td>${escapeHtml(g.difficulty||'-')}</td><td>${g.score|0}</td>
          <td class="muted">${escapeHtml(p.email||'')}</td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn" data-admin-only onclick='editPlayer(${p.id})'>Edit</button>
            <button class="btn danger" data-admin-only onclick='deletePlayer(${p.id})'>Delete</button>
          </td>
        </tr>`;
      }).join('');
    } else if (currentGame==='minecraft'){
      headRow.innerHTML = `<th>Id</th><th>Username</th><th>K/D</th><th>Email</th><th>Actions</th>`;
      rows = list.map(p=>{
        const g = p.games?.minecraft||{}; const kd = (g.deaths||0)?(g.kills||0)/(g.deaths||1):(g.kills||0);
        return `<tr>
          <td>${p.id}</td><td>${escapeHtml(p.username)}</td>
          <td>${(g.kills|0)}-${(g.deaths|0)} <span class="muted">(K/D ${(isFinite(kd)?kd.toFixed(2):'-')})</span></td>
          <td class="muted">${escapeHtml(p.email||'')}</td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn" data-admin-only onclick='editPlayer(${p.id})'>Edit</button>
            <button class="btn danger" data-admin-only onclick='deletePlayer(${p.id})'>Delete</button>
            <button class="btn success" data-admin-only onclick='addKill(${p.id})'>+ Kill</button>
            <button class="btn warn" data-admin-only onclick='addDeath(${p.id})'>+ Death</button>
          </td>
        </tr>`;
      }).join('');
    }
    tbody.innerHTML = rows;
    // Reflect admin in row actions
    for (const el of document.querySelectorAll('[data-admin-only]')) {
      el.style.display = isAdmin() ? '' : 'none';
    }
  }

  // Init: show only current game's panel in form
  for (const panel of document.querySelectorAll('.game-panel')) {
    panel.style.display = (panel.dataset.game === currentGame) ? '' : 'none';
  }

  setAdminUI();
  search.addEventListener('input', render);
  render();
})();