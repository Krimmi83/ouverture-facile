
/** @typedef {{id:number, username:string, wins:number, losses:number, email:string}} Player */
const KEY='gamehub_users_v1';
function loadUsers(){ try{ return JSON.parse(localStorage.getItem(KEY))||[] }catch{ return [] } }
function saveUsers(list){ localStorage.setItem(KEY, JSON.stringify(list)); }
function uid(list){ return (list.reduce((m,p)=>Math.max(m,p.id||0),0)+1); }
// Seed first time
if(!localStorage.getItem(KEY)){
  saveUsers([
    { id: 1, username: 'Nova',    wins: 18, losses: 5,  email: 'nova@example.com' },
    { id: 2, username: 'Kitsune', wins: 12, losses: 8,  email: 'kitsune@example.com' },
    { id: 3, username: 'Atlas',   wins: 22, losses: 9,  email: 'atlas@example.com' },
    { id: 4, username: 'Pixel',   wins: 9,  losses: 3,  email: 'pixel@example.com' },
    { id: 5, username: 'Rogue',   wins: 7,  losses: 10, email: 'rogue@example.com' }
  ]);
}
// Facade (local only)
const api = {
  async listPlayers(){ return loadUsers(); },
  async upsertPlayer(p){
    const list=loadUsers(); let id=p.id||uid(list);
    const i=list.findIndex(x=>x.id===id);
    const rec={ id, username:p.username, wins:p.wins|0, losses:p.losses|0, email:p.email };
    if(i>=0) list[i]=rec; else list.push(rec);
    saveUsers(list); return rec;
  },
  async deletePlayer(id){ const list=loadUsers().filter(x=>x.id!==id); saveUsers(list); return {ok:true}; },
  async addWin(id){ const list=loadUsers().map(p=>p.id===id?{...p,wins:p.wins+1}:p); saveUsers(list); return {ok:true}; },
  async addLoss(id){ const list=loadUsers().map(p=>p.id===id?{...p,losses:p.losses+1}:p); saveUsers(list); return {ok:true}; },
  async importJson(list){ saveUsers(list); return {ok:true}; },
  async exportJson(){ return loadUsers(); }
};
// Utils
const fmtPercent = n => isNaN(n)?'-':(n*100).toFixed(0)+'%';
const winRate = p => { const t=p.wins+p.losses; return t?(p.wins/t):0; };
function escapeHtml(s){ return String(s).replace(/[&<>\"]/g,''); }
