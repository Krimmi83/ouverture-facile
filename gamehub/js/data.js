
/** @typedef {{wins:number, losses:number}} WL */
/** @typedef {{difficulty:string, score:number}} Demineur */
/** @typedef {{kills:number, deaths:number}} KD */
/** @typedef {{id:number, username:string, games:{smash:WL, mariokart:WL, demineur:Demineur, minecraft:KD}} Player */

const KEY = 'gamehub_users_v3';         // <-- no emails
const V2_KEY = 'gamehub_users_v2';      // migrate from here if present
const V1_KEY = 'gamehub_users_v1';      // oldest

const ADMIN_PIN_KEY = 'gamehub_admin_pin';
const ADMIN_MODE_KEY = 'gamehub_admin_mode';

function defaultGames() {
  return {
    smash: { wins: 0, losses: 0 },
    mariokart: { wins: 0, losses: 0 },
    demineur: { difficulty: 'Beginner', score: 0 },
    minecraft: { kills: 0, deaths: 0 }
  };
}

function migrateIfNeeded(){
  if (localStorage.getItem(KEY)) return;
  // v2 -> v3 (drop email)
  const v2 = localStorage.getItem(V2_KEY);
  if (v2) {
    try{
      const arr = JSON.parse(v2) || [];
      const conv = arr.map(p => ({ id: p.id, username: p.username, games: p.games || defaultGames() }));
      localStorage.setItem(KEY, JSON.stringify(conv));
      return;
    }catch{}
  }
  // v1 -> v3 (wins/losses to Smash)
  const v1 = localStorage.getItem(V1_KEY);
  if (v1) {
    try{
      const arr = JSON.parse(v1) || [];
      const conv = arr.map(p => {
        const g = defaultGames();
        if (typeof p.wins === 'number' || typeof p.losses === 'number') {
          g.smash.wins = p.wins|0; g.smash.losses = p.losses|0;
        }
        return { id: p.id, username: p.username, games: g };
      });
      localStorage.setItem(KEY, JSON.stringify(conv));
      return;
    }catch{}
  }
  // Seed fresh
  const seed = [
    { id:1, username:'Nova',    games:{ smash:{wins:18,losses:5},  mariokart:{wins:9,losses:7},  demineur:{difficulty:'Expert',score:420},       minecraft:{kills:34,deaths:11} } },
    { id:2, username:'Kitsune', games:{ smash:{wins:12,losses:8},  mariokart:{wins:15,losses:12},demineur:{difficulty:'Intermediate',score:260},  minecraft:{kills:21,deaths:19} } },
    { id:3, username:'Atlas',   games:{ smash:{wins:22,losses:9},  mariokart:{wins:7,losses:5},  demineur:{difficulty:'Beginner',score:180},      minecraft:{kills:56,deaths:22} } },
    { id:4, username:'Pixel',   games:{ smash:{wins:9,losses:3},   mariokart:{wins:3,losses:6},  demineur:{difficulty:'Intermediate',score:205}, minecraft:{kills:14,deaths:7} } },
    { id:5, username:'Rogue',   games:{ smash:{wins:7,losses:10},  mariokart:{wins:11,losses:14},demineur:{difficulty:'Expert',score:380},        minecraft:{kills:28,deaths:33} } }
  ];
  localStorage.setItem(KEY, JSON.stringify(seed));
}

function loadUsers(){ migrateIfNeeded(); try{ return JSON.parse(localStorage.getItem(KEY))||[] }catch{ return [] } }
function saveUsers(list){ localStorage.setItem(KEY, JSON.stringify(list)); }
function uid(list){ return (list.reduce((m,p)=>Math.max(m,p.id||0),0)+1); }

// Admin helpers
function isAdmin(){ return localStorage.getItem(ADMIN_MODE_KEY)==='1'; }
function setAdmin(on){ localStorage.setItem(ADMIN_MODE_KEY, on?'1':'0'); }
async function requestAdmin(){
  if (isAdmin()) { setAdmin(false); return true; }
  let pin = localStorage.getItem(ADMIN_PIN_KEY);
  if (!pin) {
    const newPin = prompt('Définis un PIN admin (4–12 caractères) :');
    if (!newPin || newPin.length < 4) return false;
    localStorage.setItem(ADMIN_PIN_KEY, newPin); pin = newPin;
    alert('PIN enregistré. Ne l\'oublie pas !');
  }
  const entry = prompt('Entre le PIN admin :');
  if (entry === pin) { setAdmin(true); return true; }
  alert('PIN incorrect.'); return false;
}

// API (local only)
const api = {
  async listPlayers(){ return loadUsers(); },
  async upsertPlayer(p){
    if (!isAdmin()) throw new Error('Admin required');
    const list=loadUsers(); let id=p.id||uid(list);
    const i=list.findIndex(x=>x.id===id);
    const current=i>=0?list[i]:{id,username:'',games:defaultGames()};
    const merged={
      id, username: p.username ?? current.username,
      games:{
        smash:{ wins: p.games?.smash?.wins ?? current.games.smash.wins, losses: p.games?.smash?.losses ?? current.games.smash.losses },
        mariokart:{ wins: p.games?.mariokart?.wins ?? current.games.mariokart.wins, losses: p.games?.mariokart?.losses ?? current.games.mariokart.losses },
        demineur:{ difficulty: p.games?.demineur?.difficulty ?? current.games.demineur.difficulty, score: p.games?.demineur?.score ?? current.games.demineur.score },
        minecraft:{ kills: p.games?.minecraft?.kills ?? current.games.minecraft.kills, deaths: p.games?.minecraft?.deaths ?? current.games.minecraft.deaths }
      }
    };
    if(i>=0) list[i]=merged; else list.push(merged);
    saveUsers(list); return merged;
  },
  async deletePlayer(id){ if(!isAdmin()) throw new Error('Admin required'); const l=loadUsers().filter(x=>x.id!==id); saveUsers(l); return {ok:true}; },
  async addWin(id,game){ if(!isAdmin()) throw new Error('Admin required'); const l=loadUsers().map(p=>p.id===id?(p.games?.[game]?.wins!==undefined?(p.games[game].wins++,p):p):p); saveUsers(l); return {ok:true}; },
  async addLoss(id,game){ if(!isAdmin()) throw new Error('Admin required'); const l=loadUsers().map(p=>p.id===id?(p.games?.[game]?.losses!==undefined?(p.games[game].losses++,p):p):p); saveUsers(l); return {ok:true}; },
  async addKill(id){ if(!isAdmin()) throw new Error('Admin required'); const l=loadUsers().map(p=>p.id===id?(p.games.minecraft.kills++,p):p); saveUsers(l); return {ok:true}; },
  async addDeath(id){ if(!isAdmin()) throw new Error('Admin required'); const l=loadUsers().map(p=>p.id===id?(p.games.minecraft.deaths++,p):p); saveUsers(l); return {ok:true}; },
  async importJson(list){
    if(!isAdmin()) throw new Error('Admin required');
    const norm=(list||[]).map(p=>{
      if(p.games) return { id:p.id, username:p.username, games:p.games };
      const g=defaultGames(); if(typeof p.wins==='number'||typeof p.losses==='number'){ g.smash.wins=p.wins|0; g.smash.losses=p.losses|0; }
      return { id:p.id, username:p.username, games:g };
    });
    saveUsers(norm); return {ok:true};
  },
  async exportJson(){ return loadUsers(); }
};

// Utils
const fmtPercent=n=>isNaN(n)?'-':(n*100).toFixed(0)+'%';
const winRate=wl=>{const t=(wl?.wins|0)+(wl?.losses|0);return t?((wl.wins|0)/t):0;};
const kdRatio=kd=>{const d=(kd?.deaths|0)||1;return (kd?.kills|0)/d;};
const diffRank=d=>({'Beginner':1,'Intermediate':2,'Expert':3}[d]||0);
function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,'');}
