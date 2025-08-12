
(async function(){
  const gameSel = document.getElementById('lbGame');
  const sortSel = document.getElementById('lbSort');
  const headRow = document.getElementById('lbHeadRow');
  const tbody = document.querySelector('#lbTable tbody');

  const sortsByGame = {
    smash: [['wins','Wins (desc)'],['losses','Losses (asc)'],['rate','Win rate (desc)'],['username','Username (A→Z)']],
    mariokart: [['wins','Wins (desc)'],['losses','Losses (asc)'],['rate','Win rate (desc)'],['username','Username (A→Z)']],
    demineur: [['score','Score (desc)'],['difficulty','Difficulty (Expert→Beginner)'],['username','Username (A→Z)']],
    minecraft: [['kills','Kills (desc)'],['deaths','Deaths (asc)'],['kdr','K/D ratio (desc)'],['username','Username (A→Z)']]
  };

  function setSortOptions(game){
    const opts = sortsByGame[game] || [];
    sortSel.innerHTML = opts.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  }

  gameSel.addEventListener('change', () => { setSortOptions(gameSel.value); render(); });
  sortSel.addEventListener('change', render);
  setSortOptions(gameSel.value);
  render();

  document.getElementById('lbExport').addEventListener('click', async ()=>{
    const data=JSON.stringify(await api.exportJson(),null,2);
    const blob=new Blob([data],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='players.json'; a.click(); URL.revokeObjectURL(url);
  });
  document.getElementById('lbImportFile').addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return; const r=new FileReader();
    r.onload=async()=>{ try{ const list=JSON.parse(r.result); if(Array.isArray(list)){ await api.importJson(list); await render(); alert('Import successful'); } else alert('Invalid JSON structure'); } catch{ alert('Invalid JSON'); } e.target.value=''; };
    r.readAsText(f);
  });

  async function render(){
    const game = gameSel.value;
    const mode = sortSel.value;
    const list = [...await api.listPlayers()];

    list.sort((a,b)=>{
      const ga=a.games?.[game]||{}, gb=b.games?.[game]||{};
      if (game==='smash' || game==='mariokart'){
        if (mode==='wins') return (gb.wins|0)-(ga.wins|0) || (ga.losses|0)-(gb.losses|0) || a.username.localeCompare(b.username);
        if (mode==='losses') return (ga.losses|0)-(gb.losses|0) || (gb.wins|0)-(ga.wins|0) || a.username.localeCompare(b.username);
        if (mode==='rate') return (winRate(gb)-winRate(ga)) || ((gb.wins|0)-(ga.wins|0));
      } else if (game==='demineur'){
        if (mode==='score') return (gb.score|0)-(ga.score|0) || (diffRank(gb.difficulty)-diffRank(ga.difficulty));
        if (mode==='difficulty') return (diffRank(gb.difficulty)-diffRank(ga.difficulty)) || ((gb.score|0)-(ga.score|0));
      } else if (game==='minecraft'){
        if (mode==='kills') return (gb.kills|0)-(ga.kills|0) || (ga.deaths|0)-(gb.deaths|0);
        if (mode==='deaths') return (ga.deaths|0)-(gb.deaths|0) || (gb.kills|0)-(ga.kills|0);
        if (mode==='kdr') return (kdRatio(gb)-kdRatio(ga)) || ((gb.kills|0)-(ga.kills|0));
      }
      return a.username.localeCompare(b.username);
    });

    if (game==='smash' || game==='mariokart'){
      headRow.innerHTML = `<th>#</th><th>Username</th><th>Wins</th><th>Losses</th><th>Win rate</th><th>Email</th>`;
      tbody.innerHTML = list.map((p,i)=>{
        const g = p.games?.[game]||{};
        return `<tr><td>${i+1}</td><td>${escapeHtml(p.username)}</td>
          <td><span class="pill win">${g.wins|0}</span></td>
          <td><span class="pill loss">${g.losses|0}</span></td>
          <td><span class="pill rate">${fmtPercent(winRate(g))}</span></td>
          <td class="muted">${escapeHtml(p.email)}</td></tr>`;
      }).join('');
    } else if (game==='demineur'){
      headRow.innerHTML = `<th>#</th><th>Username</th><th>Difficulty</th><th>Score</th><th>Email</th>`;
      tbody.innerHTML = list.map((p,i)=>{
        const g = p.games?.demineur||{};
        return `<tr><td>${i+1}</td><td>${escapeHtml(p.username)}</td><td>${escapeHtml(g.difficulty||'-')}</td><td>${g.score|0}</td><td class="muted">${escapeHtml(p.email)}</td></tr>`;
      }).join('');
    } else if (game==='minecraft'){
      headRow.innerHTML = `<th>#</th><th>Username</th><th>Kills</th><th>Deaths</th><th>K/D</th><th>Email</th>`;
      tbody.innerHTML = list.map((p,i)=>{
        const g = p.games?.minecraft||{}; const kdr = kdRatio(g);
        return `<tr><td>${i+1}</td><td>${escapeHtml(p.username)}</td>
          <td><span class="pill">${g.kills|0}</span></td>
          <td><span class="pill">${g.deaths|0}</span></td>
          <td><span class="pill kd">${(isFinite(kdr)?kdr.toFixed(2):'-')}</span></td>
          <td class="muted">${escapeHtml(p.email)}</td></tr>`;
      }).join('');
    }
  }
})();