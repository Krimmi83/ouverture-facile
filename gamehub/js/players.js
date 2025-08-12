
(async function(){
  const tbody=document.querySelector('#plTable tbody');
  const search=document.getElementById('search');
  const fId=document.getElementById('fId'), fUser=document.getElementById('fUser'), fWins=document.getElementById('fWins'), fLosses=document.getElementById('fLosses'), fEmail=document.getElementById('fEmail');
  const saveBtn=document.getElementById('saveBtn'), resetBtn=document.getElementById('resetBtn');
  const addDemoBtn=document.getElementById('addDemo'), clearAllBtn=document.getElementById('clearAll');
  const backupBtn=document.getElementById('backupFolder');

  function applyReadOnlyUI(){
    const ro = (typeof isReadOnly === 'function') ? isReadOnly() : false;
    // Disable form controls
    for (const el of [fId,fUser,fWins,fLosses,fEmail,saveBtn,resetBtn,addDemoBtn,clearAllBtn]) {
      if (!el) continue;
      if (ro) el.setAttribute('disabled','true'); else el.removeAttribute('disabled');
    }
  }

  addEventListener('admin-change', async () => { applyReadOnlyUI(); await render(); });

  addDemoBtn.addEventListener('click', async ()=>{
    if (isReadOnly && isReadOnly()) { alert('Lecture seule. Déverrouillez en Admin.'); return; }
    const list=await api.listPlayers(); const nextId=(list.reduce((m,p)=>Math.max(m,p.id||0),0)+1);
    await api.upsertPlayer({ id: nextId, username: `Player${nextId}`, wins: Math.floor(Math.random()*20), losses: Math.floor(Math.random()*12), email: `player${nextId}@example.com` });
    await render();
  });
  clearAllBtn.addEventListener('click', async ()=>{
    if (isReadOnly && isReadOnly()) { alert('Lecture seule. Déverrouillez en Admin.'); return; }
    if(!confirm('Clear ALL players? This cannot be undone.')) return;
    localStorage.setItem('gamehub_users_v1', '[]'); await render();
  });
  search.addEventListener('input', render);

  window.editPlayer=async(id)=>{
    if (isReadOnly && isReadOnly()) { alert('Lecture seule. Déverrouillez en Admin.'); return; }
    const p=(await api.listPlayers()).find(x=>x.id===id); if (!p) return;
    fId.value=p.id; fUser.value=p.username; fWins.value=p.wins; fLosses.value=p.losses; fEmail.value=p.email;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  window.deletePlayer=async(id)=>{
    if (isReadOnly && isReadOnly()) { alert('Lecture seule. Déverrouillez en Admin.'); return; }
    if(!confirm('Delete this player?')) return;
    await api.deletePlayer(id); await render();
  };
  window.addWin=async(id)=>{ if (isReadOnly && isReadOnly()) { alert('Lecture seule.'); return; } await api.addWin(id); await render(); };
  window.addLoss=async(id)=>{ if (isReadOnly && isReadOnly()) { alert('Lecture seule.'); return; } await api.addLoss(id); await render(); };

  saveBtn.addEventListener('click', async ()=>{
    if (isReadOnly && isReadOnly()) { alert('Lecture seule. Déverrouillez en Admin.'); return; }
    const username=fUser.value.trim();
    const wins=Math.max(0, parseInt(fWins.value||'0',10));
    const losses=Math.max(0, parseInt(fLosses.value||'0',10));
    const email=fEmail.value.trim();
    if(!username||!email) return alert('Username and Email are required.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Invalid email format.');
    const id=parseInt(fId.value,10) || undefined;
    await api.upsertPlayer({ id, username, wins, losses, email });
    document.getElementById('playerForm').reset();
    await render();
  });

  resetBtn.addEventListener('click', ()=>{
    if (isReadOnly && isReadOnly()) return;
    fId.value=''; fUser.value=''; fWins.value=0; fLosses.value=0; fEmail.value='';
  });

  // --- Backup to folder 'joueurs' --- (safe in read-only)
  if (backupBtn) backupBtn.addEventListener('click', backupToFolder);
  async function backupToFolder(){
    try {
      const data=await api.exportJson();
      const text=JSON.stringify(data,null,2);
      const ts=new Date().toISOString().replace(/[:.]/g,'-');
      const fname=`players-${ts}.json`;
      if ('showDirectoryPicker' in window) {
        try{
          const root=await window.showDirectoryPicker({ mode: 'readwrite' });
          const dir=await root.getDirectoryHandle('joueurs', { create: true });
          const fh=await dir.getFileHandle(fname, { create: true });
          const w=await fh.createWritable(); await w.write(text); await w.close();
          alert(`Sauvegarde créée dans le dossier “joueurs” : ${fname}`);
          return;
        }catch(err){ console.warn('FS Access failed, fallback to download',err); }
      }
      const blob=new Blob([text],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`joueurs-${fname}`; a.click(); URL.revokeObjectURL(url);
      alert('Le fichier de sauvegarde a été téléchargé. Déplace-le vers “joueurs” si nécessaire.');
    } catch(e){ console.error(e); alert('Impossible de créer la sauvegarde.'); }
  }

  async function render(){
    const q=(search.value||'').toLowerCase().trim();
    const list=(await api.listPlayers()).filter(p=>!q||p.username.toLowerCase().includes(q)||p.email.toLowerCase().includes(q));
    const ro = (typeof isReadOnly === 'function') ? isReadOnly() : false;
    tbody.innerHTML=list.map(p=>`
      <tr>
        <td>${p.id}</td>
        <td>${escapeHtml(p.username)}</td>
        <td>${p.wins}</td>
        <td>${p.losses}</td>
        <td class="muted">${escapeHtml(p.email)}</td>
        <td style="display:flex; gap:6px;">
          ${ro ? '' : `
            <button class="btn" onclick='editPlayer(${p.id})'>Edit</button>
            <button class="btn danger" onclick='deletePlayer(${p.id})'>Delete</button>
            <button class="btn success" onclick='addWin(${p.id})'>+ Win</button>
            <button class="btn warn" onclick='addLoss(${p.id})'>+ Loss</button>
          `}
        </td>
      </tr>
    `).join('');
  }

  applyReadOnlyUI();
  render();
})();
