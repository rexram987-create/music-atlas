const $=id=>document.getElementById(id);
const state={filter:'all',items:[],controller:null};
const seeds=[['Q254','מוצרט','composer'],['Q303','אלביס פרסלי','singer'],['Q1299','הביטלס','band'],['Q255','בטהובן','composer'],['Q45945','אריק איינשטיין','singer'],['Q15862','קווין','band']];
const typeLabels={singer:'זמר/ת',band:'להקה',composer:'מלחין/ה',all:'אמן/ית'};
const normalize=s=>(s||'').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
const setStatus=message=>{$('status').textContent=message};
const el=(tag,cl,text)=>{const node=document.createElement(tag);if(cl)node.className=cl;if(text!=null)node.textContent=text;return node};
function imgNode(src,alt){if(!src){return el('div','ph','♫')}const img=el('img');img.src=src;img.alt=alt||'';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.replaceWith(el('div','ph','♫'));return img}
function identifyType(desc='',claims={}){const s=normalize(desc);const occupations=(claims.P106||[]).map(x=>x.mainsnak?.datavalue?.value?.id);if(s.includes('band')||s.includes('להקה')||s.includes('musical group')||(claims.P31||[]).some(x=>['Q215380','Q5741069','Q105756498'].includes(x.mainsnak?.datavalue?.value?.id)))return 'band';if(s.includes('composer')||s.includes('מלחין')||occupations.includes('Q36834'))return 'composer';if(s.includes('singer')||s.includes('זמר')||occupations.includes('Q177220'))return 'singer';return 'all'}
async function json(url,signal){const r=await fetch(url,{signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('שגיאת שירות '+r.status);return r.json()}
function wikidataSearch(q,lang,signal){return json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbsearchentities',search:q,language:lang,uselang:'he',type:'item',format:'json',origin:'*',limit:'15'}),signal)}
async function wikiSummary(title,lang,signal){if(!title)return null;try{return await json('https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replaceAll(' ','_')),signal)}catch{return null}}
async function entities(ids,signal){if(!ids.length)return {};const data=await json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'labels|descriptions|sitelinks|claims',languages:'he|en',format:'json',origin:'*'}),signal);return data.entities||{}}
function wikidataDate(entity,key){const time=entity?.claims?.[key]?.[0]?.mainsnak?.datavalue?.value?.time;if(!time)return null;const n=Number(time.match(/^[+-](\d+)/)?.[1]);if(!Number.isFinite(n))return null;return (time[0]==='-'?'−':'')+n}
function itemFromEntity(entity,fallback){return {id:entity.id,title:entity.labels?.he?.value||entity.labels?.en?.value||fallback||entity.id,description:entity.descriptions?.he?.value||entity.descriptions?.en?.value||'',type:identifyType((entity.descriptions?.he?.value||'')+' '+(entity.descriptions?.en?.value||''),entity.claims),wikiTitle:entity.sitelinks?.hewiki?.title||entity.sitelinks?.enwiki?.title,lang:entity.sitelinks?.hewiki?'he':'en',born:wikidataDate(entity,'P569'),died:wikidataDate(entity,'P570'),inception:wikidataDate(entity,'P571'),dissolved:wikidataDate(entity,'P576'),birthNames:claimText(entity,'P1477'),stageNames:claimText(entity,'P742')}}

// Verified band-name stories are kept separate from Wikidata facts; no meaning is guessed.
const nameStories={
  Q254:{text:'מוצרט הוטבל בשם Johannes Chrysostomus Wolfgang Theophilus. הוא השתמש גם בצורה Wolfgang Amadé Mozart. השם Theophilus ביוונית פירושו ״אוהב האל״ או ״אהוב האל״; Amadé היא צורה מקבילה מן הלטינית, ולא שם משפחה נוסף.',source:'קרן מוצרטאום הבינלאומית — ביוגרפיית מוצרט',url:'https://mozarteum.at/en/wolfgang-amade-mozart'},
  Q303:{text:'אלביס נקרא על שם אביו, ורנון אלביס פרסלי, שאלביס היה שמו האמצעי. שמו האמצעי של הזמר נכתב במסמכים מוקדמים גם Aron, בעוד שבאתר גרייסלנד שמו מוצג Elvis Aaron Presley. זהו הסבר לבחירת השם במשפחה, ולא קביעה על משמעותו הלשונית הקדומה.',source:'דברי ורנון פרסלי בריאיון משנת 1978; ביוגרפיה רשמית של גרייסלנד',url:'https://www.graceland.com/biography'},

  Q1299:{text:'The Beatles הוא משחק מילים בין beetles (חיפושיות) לבין beat (קצב מוזיקלי). ג׳ון לנון וסטיוארט סאטקליף נקשרים לבחירת השם; הלהקה השתמשה גם בשם The Silver Beetles בתחילת דרכה.',source:'The Beatles Story — How did The Beatles get their name?',url:'https://www.beatlesstory.com/blog/the-beatles-name/'},
  Q15862:{text:'Queen פירושו באנגלית ״מלכה״. פרדי מרקיורי הציע את השם במקום Smile; לדבריו, הוא ביקש שם שמשדר מלכותיות והדר.',source:'Freddie Mercury — Official Biography',url:'https://freddiemercury.com/bio/'}
};
function claimText(entity,key){return (entity?.claims?.[key]||[]).map(c=>c.mainsnak?.datavalue?.value).filter(v=>typeof v==='string'&&v.trim()).filter((v,i,a)=>a.indexOf(v)===i)}
function nameSection(item){
  const section=el('section','nameSection');
  section.append(el('h3','','מקור השם ושמות נוספים'));
  const story=nameStories[item.id];
  if(story){section.append(el('p','bio',story.text));const a=el('a','sub','מקור: '+story.source+' ↗');a.href=story.url;a.target='_blank';a.rel='noopener noreferrer';section.append(a)}
  if(item.birthNames?.length){section.append(el('p','fact','שם בלידה: '+item.birthNames.join(' · ')))}
  if(item.stageNames?.length){section.append(el('p','fact','שמות במה / כינויים מתועדים: '+item.stageNames.join(' · ')))}
  if(item.birthNames?.length||item.stageNames?.length){const a=el('a','small','מקור לשמות המתועדים: Wikidata ↗');a.href='https://www.wikidata.org/wiki/'+encodeURIComponent(item.id);a.target='_blank';a.rel='noopener noreferrer';section.append(a)}
  if(!story&&!item.birthNames?.length&&!item.stageNames?.length)section.append(el('p','muted','עדיין אין במאגר מקור מאומת לסיפור שמאחורי השם. לא נציג פירוש משוער.'));
  return section
}
function visible(){return state.items.filter(i=>state.filter==='all'||i.type===state.filter)}
function paint(){const results=$('results');results.replaceChildren();$('detail').classList.add('hidden');const list=visible();if(!list.length){results.append(el('div','empty','לא נמצאו תוצאות בסינון זה. אפשר לחזור ל״הכול״ או לנסות חיפוש אחר.'));return}for(const item of list){const b=el('button','tile');b.type='button';b.append(imgNode(item.image,item.title));const box=el('div','content');box.append(el('strong','',item.title));box.append(el('div','muted',(typeLabels[item.type]||'אמן/ית')+(item.description?' · '+item.description:'')));b.append(box);b.addEventListener('click',()=>show(item));results.append(b)}}
async function loadEntities(ids,signal){const map=await entities(ids,signal);const items=ids.map(id=>map[id]).filter(e=>e&&!e.missing).map(e=>itemFromEntity(e));await Promise.all(items.map(async i=>{if(!i.wikiTitle)return;const summary=await wikiSummary(i.wikiTitle,i.lang,signal);i.image=summary?.thumbnail?.source||summary?.originalimage?.source;i.summary=summary?.extract;i.page=summary?.content_urls?.desktop?.page}));return items}
async function search(q){if(state.controller)state.controller.abort();state.controller=new AbortController();const signal=state.controller.signal;setStatus('מחפש אמנים במאגרי הידע…');$('results').replaceChildren();$('detail').classList.add('hidden');try{const [he,en]=await Promise.all([wikidataSearch(q,'he',signal),wikidataSearch(q,'en',signal)]);const found=new Map();for(const result of [...(he.search||[]),...(en.search||[])])if(!found.has(result.id))found.set(result.id,result);const ids=[...found.keys()].slice(0,18);if(!ids.length){state.items=[];setStatus('לא נמצאו תוצאות. נסה כתיב אחר או שם באנגלית.');paint();return}state.items=await loadEntities(ids,signal);setStatus('נמצאו '+state.items.length+' תוצאות. בחר אמן כדי לפתוח כרטיס.');paint()}catch(e){if(e.name==='AbortError')return;setStatus('לא הצלחנו להשלים את החיפוש. בדוק חיבור לאינטרנט ונסה שוב.');console.error(e)}}
async function show(item){$('results').replaceChildren();const detail=$('detail');detail.replaceChildren();detail.classList.remove('hidden');setStatus('מציג את הכרטיס של '+item.title);const back=el('button','sub','← חזרה לתוצאות');back.type='button';back.style.marginBottom='14px';back.addEventListener('click',()=>{detail.classList.add('hidden');paint();setStatus('בחר תוצאה לפתיחת הכרטיס.')});detail.append(back);const wrap=el('article','profile'),top=el('div','profileTop'),info=el('div');top.append(imgNode(item.image,item.title));info.append(el('h2','',item.title));info.append(el('span','badge',typeLabels[item.type]||'אמן/ית'));if(item.born)info.append(el('div','fact','שנות חיים: '+item.born+(item.died?'–'+item.died:'–')));else if(item.inception)info.append(el('div','fact','שנות פעילות/ייסוד: '+item.inception+(item.dissolved?'–'+item.dissolved:'')));if(item.description)info.append(el('p','muted',item.description));const bio=el('p','bio',item.summary||'תקציר ויקיפדיה אינו זמין בשפה שנבחרה. ניתן לעיין במקור.');info.append(bio);top.append(info);wrap.append(top);wrap.append(nameSection(item));const foot=el('div','profileFoot');const links=[['ויקיפדיה',item.page||'https://'+item.lang+'.wikipedia.org/wiki/'+encodeURIComponent(item.wikiTitle||item.title)],['Wikidata','https://www.wikidata.org/wiki/'+item.id]];for(const [label,url] of links){const a=el('a','sub',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';foot.append(a)}wrap.append(foot);detail.append(wrap)}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();const q=$('searchInput').value.trim();if(q.length>=2)search(q)});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;document.querySelectorAll('.tab').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});paint()}));
(async()=>{try{state.items=await loadEntities(seeds.map(x=>x[0]));for(let i=0;i<state.items.length;i++){const seed=seeds.find(s=>s[0]===state.items[i].id);if(seed){state.items[i].type=seed[2];if(!state.items[i].title||state.items[i].title.startsWith('Q'))state.items[i].title=seed[1]}}setStatus('בחר אמן לדוגמה או חפש שם חדש.');paint()}catch(e){console.error(e);setStatus('אפשר לחפש שם אמן גם אם רשימת הדוגמאות לא נטענה.')}})();
let promptInstall=null;
const installButton=$('install');
const installHelp=$('installHelp');
const installMessage=$('installMessage');
function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
function refreshInstallUI(){installButton.classList.remove('hidden');installButton.textContent=promptInstall?'⬇ התקנת היישומון':'⬇ התקנה / הוראות התקנה'}
function showInstallHelp(message){installMessage.textContent=message;installHelp.classList.remove('hidden');installHelp.scrollIntoView({behavior:'smooth',block:'nearest'})}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptInstall=event;refreshInstallUI()});
installButton.addEventListener('click',async()=>{
  // Embedded browsers may report standalone mode even when the app was never installed.
  if(promptInstall){const event=promptInstall;promptInstall=null;event.prompt();try{const choice=await event.userChoice;if(choice?.outcome==='dismissed')showInstallHelp('אפשר להתקין גם דרך תפריט Chrome ⋮ ← התקנת אפליקציה / הוספה למסך הבית.')}catch{showInstallHelp('פתח את תפריט Chrome ⋮ ובחר התקנת אפליקציה או הוספה למסך הבית.')}refreshInstallUI();return}
  showInstallHelp('לפי צילום המסך, האתר פתוח בדפדפן פנימי עם כפתור X. לחץ על ⋮ בחלק העליון ובחר ״פתח ב־Chrome״ או ״פתח בדפדפן״. בתוך Chrome לחץ על ⋮ ובחר ״התקנת אפליקציה״ או ״הוספה למסך הבית״. אם Chrome אינו מציע התקנה, נסה רענון.')
});
window.addEventListener('appinstalled',()=>{promptInstall=null;showInstallHelp('Chrome דיווח שההתקנה הושלמה. חפש את Music Atlas במסך הבית או ברשימת האפליקציות.');refreshInstallUI()});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',refreshInstallUI);
refreshInstallUI();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(console.error));