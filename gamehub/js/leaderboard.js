
(async function(){
  const lbSort=document.getElementById('lbSort');
  const tbody=document.querySelector('#lbTable tbody');
  const importInput=document.getElementById('lbImportFile');
  const importLabel=document.getElementById('lbImportLabel');

  function applyReadOnlyUI(){
    const ro = (typeof isReadOnly === 'function') ? isReadOnly() : false;
    if (ro) {
      importInput.setAttribute('disabled','true');
      importLabel && (importLabel.style.display='none');
    } else {
      importInput.removeAttribute('disabled');
      importLabel && (importLabel.style.display='');
    }
  }

  addEventListener('admin-change', () => { applyReadOnlyUI(); render(); });

  lbSort.addEventListener('change', render);
  document.getElementById('lbExport').addEventListener('click', async ()=>{
    const data=JSON.stringify(await api.exportJson(), null, 2);
    const blob=new Blob([data], {type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='players.json'; a.click(); URL.revokeObjectURL(url);
  });
  importInput.addEventListener('change', async e=>{
    const ro = (typeof isReadOnly === 'function') ? isReadOnly() : false;
    if (ro) { alert('Lecture seule : import indisponible. Déverrouillez en Admin.'); e.target.value=''; return; }
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=async()=>{
      try{ const list=JSON.parse(reader.result); if(Array.isArray(list)){ await api.importJson(list); await render(); alert('Import successful'); } else alert('Invalid JSON structure'); }
      catch{ alert('Invalid JSON'); }
      e.target.value='';
    };
    reader.readAsText(file);
  });

  async function render(){
    const list=[...(await api.listPlayers())];
    const mode=lbSort.value;
    list.sort((a,b)=>{
      if(mode==='wins') return (b.wins-a.wins)||(a.losses-b.losses)||a.username.localeCompare(b.username);
      if(mode==='losses') return (a.losses-b.losses)||(b.wins-a.wins)||a.username.localeCompare(b.username);
      if(mode==='rate') return (winRate(b)-winRate(a))||(b.wins-a.wins);
      if(mode==='username') return a.username.localeCompare(b.username);
      return 0;
    });
    tbody.innerHTML=list.map((p,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${escapeHtml(p.username)}</td>
        <td><span class="pill win">${p.wins}</span></td>
        <td><span class="pill loss">${p.losses}</span></td>
        <td><span class="pill rate">${fmtPercent(winRate(p))}</span></td>
        <td class="muted">${escapeHtml(p.email)}</td>
      </tr>
    `).join('');
  }

  applyReadOnlyUI();
  render();
})();
