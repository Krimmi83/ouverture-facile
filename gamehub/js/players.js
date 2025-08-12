
(async function(){
  const tbody = document.querySelector('#plTable tbody');
  const search = document.getElementById('search');

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

  document.getElementById('addDemo').addEventListener('click', async () => {
    const list = await api.listPlayers();
    const nextId = (list.reduce((m,p)=>Math.max(m, p.id||0), 0) + 1);
    const demo = {
      id: nextId, username: `Player${nextId}`, email: `player${nextId}@example.com`,
      games: {
        smash: { wins: Math.floor(Math.random()*20), losses: Math.floor(Math.random()*12) },
        mariokart: { wins: Math.floor(Math.random()*20), losses: Math.floor(Math.random()*12) },
        demineur: { difficulty: ['Beginner','Intermediate','Expert'][Math.floor(Math.random()*3)], score: Math.floor(Math.random()*500) },
        minecraft: { kills: Math.floor(Math.random()*60), deaths: Math.floor(Math.random()*40) }
      }
    };
    await api.upsertPlayer(demo); await render();
  });

  document.getElementById('clearAll').addEventListener('click', async () => {
    if (!confirm('Clear ALL players? This cannot be undone.')) return;
    localStorage.setItem('gamehub_users_v2', '[]'); await render();
  });

  const backupBtn = document.getElementById('backupFolder');
  if (backupBtn) backupBtn.addEventListener('click', backupToFolder);
  async function backupToFolder(){
    try{
      const data=await api.exportJson(); const text=JSON.stringify(data,null,2);
      const ts=new Date().toISOString().replace(/[:.]/g,'-'); const fname=`players-${ts}.json`;
      if('showDirectoryPicker' in window){ try{
        const root=await window.showDirectoryPicker({mode:'readwrite'});
        const dir=await root.getDirectoryHandle('joueurs',{create:true});
        const fh=await dir.getFileHandle(fname,{create:true});
        const w=await fh.createWritable(); await w.write(text); await w.close();
        alert(`Sauvegarde créée dans le dossier “joueurs” : ${fname}`); return;
      }catch(err){ console.warn('FS Access failed',err);} }
      const blob=new Blob([text],{type:'application/json'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a');
      a.href=url; a.download=`joueurs-${fname}`; a.click(); URL.revokeObjectURL(url);
      alert('Le fichier de sauvegarde a été téléchargé.');
    }catch(e){ console.error(e); alert('Backup failed.'); }
  }

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

  window.deletePlayer = async (id) => { if (!confirm('Delete this player?')) return; await api.deletePlayer(id); await render(); };
  window.addWin = async (id, game) => { await api.addWin(id, game); await render(); };
  window.addLoss = async (id, game) => { await api.addLoss(id, game); await render(); };
  window.addKill = async (id) => { await api.addKill(id); await render(); };
  window.addDeath = async (id) => { await api.addDeath(id); await render(); };

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const username = fUser.value.trim(); const email = fEmail.value.trim();
    if (!username || !email) return alert('Username and Email are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Invalid email format.');
    const id = parseInt(fId.value, 10) || undefined;
    const payload = { id, username, email, games: {
      smash: { wins: Math.max(0,parseInt(fSmashWins.value||'0',10)), losses: Math.max(0,parseInt(fSmashLosses.value||'0',10)) },
      mariokart: { wins: Math.max(0,parseInt(fMkWins.value||'0',10)), losses: Math.max(0,parseInt(fMkLosses.value||'0',10)) },
      demineur: { difficulty: fDemDiff.value, score: Math.max(0,parseInt(fDemScore.value||'0',10)) },
      minecraft: { kills: Math.max(0,parseInt(fMcKills.value||'0',10)), deaths: Math.max(0,parseInt(fMcDeaths.value||'0',10)) }
    }};
    await api.upsertPlayer(payload); document.getElementById('playerForm').reset(); await render();
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    fId.value=''; fUser.value=''; fEmail.value='';
    fSmashWins.value=0; fSmashLosses.value=0; fMkWins.value=0; fMkLosses.value=0;
    fDemDiff.value='Beginner'; fDemScore.value=0; fMcKills.value=0; fMcDeaths.value=0;
  });

  async function render(){
    const q=(search.value||'').toLowerCase().trim();
    const list=(await api.listPlayers()).filter(p=>!q||p.username.toLowerCase().includes(q)||(p.email||'').toLowerCase().includes(q));
    tbody.innerHTML = list.map(p => {
      const g=p.games||{}; const s=g.smash||{}, mk=g.mariokart||{}, dm=g.demineur||{}, mc=g.minecraft||{};
      const kd=(mc.deaths||0)?(mc.kills||0)/(mc.deaths||1):(mc.kills||0);
      return `<tr>
        <td>${p.id}</td>
        <td>${escapeHtml(p.username)}</td>
        <td>${(s.wins|0)}-${(s.losses|0)}</td>
        <td>${(mk.wins|0)}-${(mk.losses|0)}</td>
        <td>${escapeHtml(dm.difficulty||'-')}/${dm.score|0}</td>
        <td>${(mc.kills|0)}-${(mc.deaths|0)} <span class="muted">(K/D ${(isFinite(kd)?kd.toFixed(2):'-')})</span></td>
        <td class="muted">${escapeHtml(p.email||'')}</td>
        <td style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn" onclick='editPlayer(${p.id})'>Edit</button>
          <button class="btn danger" onclick='deletePlayer(${p.id})'>Delete</button>
          <button class="btn success" onclick='addWin(${p.id},"smash")'>+ Smash Win</button>
          <button class="btn warn" onclick='addLoss(${p.id},"smash")'>+ Smash Loss</button>
          <button class="btn success" onclick='addWin(${p.id},"mariokart")'>+ MK Win</button>
          <button class="btn warn" onclick='addLoss(${p.id},"mariokart")'>+ MK Loss</button>
          <button class="btn success" onclick='addKill(${p.id})'>+ MC Kill</button>
          <button class="btn warn" onclick='addDeath(${p.id})'>+ MC Death</button>
        </td>
      </tr>`;
    }).join('');
  }
  render();
})();