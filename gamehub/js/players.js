
(async function(){
  const tbody=document.querySelector('#plTable tbody');
  const search=document.getElementById('search');
  const fId=document.getElementById('fId'), fUser=document.getElementById('fUser'), fWins=document.getElementById('fWins'), fLosses=document.getElementById('fLosses'), fEmail=document.getElementById('fEmail');

  document.getElementById('addDemo').addEventListener('click', async ()=>{
    const list=await api.listPlayers();
    const nextId=(list.reduce((m,p)=>Math.max(m,p.id||0),0)+1);
    await api.upsertPlayer({ id: nextId, username: `Player${nextId}`, wins: Math.floor(Math.random()*20), losses: Math.floor(Math.random()*12), email: `player${nextId}@example.com` });
    await render();
  });
  document.getElementById('clearAll').addEventListener('click', async ()=>{
    if(!confirm('Clear ALL players? This cannot be undone.')) return;
    localStorage.setItem('gamehub_users_v1', '[]');
    await render();
  });
  search.addEventListener('input', render);

  window.editPlayer=async(id)=>{
    const p=(await api.listPlayers()).find(x=>x.id===id); if(!p) return;
    fId.value=p.id; fUser.value=p.username; fWins.value=p.wins; fLosses.value=p.losses; fEmail.value=p.email;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  window.deletePlayer=async(id)=>{ if(!confirm('Delete this player?')) return; await api.deletePlayer(id); await render(); };
  window.addWin=async(id)=>{ await api.addWin(id); await render(); };
  window.addLoss=async(id)=>{ await api.addLoss(id); await render(); };

  document.getElementById('saveBtn').addEventListener('click', async ()=>{
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

  document.getElementById('resetBtn').addEventListener('click', ()=>{
    fId.value=''; fUser.value=''; fWins.value=0; fLosses.value=0; fEmail.value='';
  });

  async function render(){
    const q=(search.value||'').toLowerCase().trim();
    const list=(await api.listPlayers()).filter(p=>!q||p.username.toLowerCase().includes(q)||p.email.toLowerCase().includes(q));
    tbody.innerHTML=list.map(p=>`
      <tr>
        <td>${p.id}</td>
        <td>${escapeHtml(p.username)}</td>
        <td>${p.wins}</td>
        <td>${p.losses}</td>
        <td class="muted">${escapeHtml(p.email)}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn" onclick='editPlayer(${p.id})'>Edit</button>
          <button class="btn danger" onclick='deletePlayer(${p.id})'>Delete</button>
          <button class="btn success" onclick='addWin(${p.id})'>+ Win</button>
          <button class="btn warn" onclick='addLoss(${p.id})'>+ Loss</button>
        </td>
      </tr>
    `).join('');
  }
  render();
})();