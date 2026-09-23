import {artistTypes,matchesFilter,namePartRole,nameDictionaryLanguage,readSavedArtists,saveArtist,findSavedArtists} from './artist-data.mjs';

const $=id=>document.getElementById(id);
const state={filter:'all',items:[],controller:null,lastSearch:'',generation:0};
const seeds=[['Q254','מוצרט'],['Q303','אלביס פרסלי'],['Q1299','הביטלס'],['Q255','בטהובן'],['Q509660','אריק איינשטיין'],['Q15862','קווין']];
const typeLabels={singer:'זמר/ת',band:'להקה',composer:'מלחין/ה',all:'מוזיקאי/ת'};
const typeLabel=item=>item.types.map(type=>typeLabels[type]).join(' · ');
const normalize=s=>(s||'').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
const setStatus=message=>{$('status').textContent=message};
const el=(tag,cl,text)=>{const node=document.createElement(tag);if(cl)node.className=cl;if(text!=null)node.textContent=text;return node};
function imgNode(src,alt){if(!src){return el('div','ph','♫')}const img=el('img');img.src=src;img.alt=alt||'';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.replaceWith(el('div','ph','♫'));return img}
async function json(url,signal){const r=await fetch(url,{signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('שגיאת שירות '+r.status);return r.json()}
function wikidataSearch(q,lang,signal){return json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbsearchentities',search:q,language:lang,uselang:'he',type:'item',format:'json',origin:'*',limit:'15'}),signal)}
async function wikiSummary(title,lang,signal){if(!title)return null;try{return await json('https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replaceAll(' ','_')),signal)}catch{return null}}
async function entities(ids,signal){if(!ids.length)return {};const data=await json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'labels|descriptions|sitelinks|claims',languages:'he|en|fr|ar',format:'json',origin:'*'}),signal);return data.entities||{}}
function wikidataDate(entity,key){const time=entity?.claims?.[key]?.[0]?.mainsnak?.datavalue?.value?.time;if(!time)return null;const n=Number(time.match(/^[+-](\d+)/)?.[1]);if(!Number.isFinite(n))return null;return (time[0]==='-'?'−':'')+n}
function itemFromEntity(entity,fallback){return {id:entity.id,title:entity.labels?.he?.value||entity.labels?.en?.value||fallback||entity.id,description:entity.descriptions?.he?.value||entity.descriptions?.en?.value||'',englishTitle:entity.labels?.en?.value||'',frenchTitle:entity.labels?.fr?.value||'',arabicTitle:entity.labels?.ar?.value||'',types:artistTypes(entity),wikiTitle:entity.sitelinks?.hewiki?.title||entity.sitelinks?.enwiki?.title,lang:entity.sitelinks?.hewiki?'he':'en',born:wikidataDate(entity,'P569'),died:wikidataDate(entity,'P570'),inception:wikidataDate(entity,'P571'),dissolved:wikidataDate(entity,'P576'),birthNames:claimText(entity,'P1477'),stageNames:claimText(entity,'P742'),nicknames:claimText(entity,'P1449'),nativeNames:claimText(entity,'P1559')}}

// Verified band-name stories are kept separate from Wikidata facts; no meaning is guessed.
const nameStories={
  Q254:{text:'מוצרט הוטבל בשם Johannes Chrysostomus Wolfgang Theophilus. הוא השתמש גם בצורה Wolfgang Amadé Mozart. השם Theophilus ביוונית פירושו ״אוהב האל״ או ״אהוב האל״; Amadé היא צורה מקבילה מן הלטינית, ולא שם משפחה נוסף.',source:'קרן מוצרטאום הבינלאומית — ביוגרפיית מוצרט',url:'https://mozarteum.at/en/wolfgang-amade-mozart'},
  Q303:{text:'אלביס נקרא על שם אביו, ורנון אלביס פרסלי, שאלביס היה שמו האמצעי. שמו האמצעי של הזמר נכתב במסמכים מוקדמים גם Aron, בעוד שבאתר גרייסלנד שמו מוצג Elvis Aaron Presley. זהו הסבר לבחירת השם במשפחה, ולא קביעה על משמעותו הלשונית הקדומה.',source:'דברי ורנון פרסלי בריאיון משנת 1978; ביוגרפיה רשמית של גרייסלנד',url:'https://www.graceland.com/biography'},

  Q215359:{text:'דין מרטין נולד בשם Dino Paul Crocetti. בתחילת הקריירה הופיע בשם Dino Martini, ובהמשך אימץ את שם הבמה Dean Martin. הסיפור ההיסטורי של בחירת שם הבמה נפרד מהמשמעות הלשונית של המילים Dean ו־Martin.',source:'AllMusic — Dean Martin Biography',url:'https://www.allmusic.com/artist/dean-martin-mn0000813392'},
    Q5383:{text:'דייוויד בואי נולד בשם David Robert Jones. בשנת 1965 אימץ את שם הבמה David Bowie, בין היתר כדי להבדיל את עצמו מאמנים אחרים שנקראו דייוויד ג׳ונס. לדבריו, שם המשפחה Bowie נבחר בהשראת סכין הבואי (Bowie knife).',source:'האתר הרשמי של דייוויד בואי — Happy 50th Birthday David Bowie',url:'https://www.davidbowie.com/2015/2015/09/16/happy-50th-birthday-david-bowie'},
  Q19848:{text:'ליידי גאגא נולדה בשם Stefani Joanne Angelina Germanotta. שם הבמה Gaga קשור לשיר Radio Ga Ga של להקת Queen. בראיונות סיפרה שהמפיק רוב פוסארי נהג לכנות אותה Gaga; את הצירוף Lady Gaga בחרה כשביקשה זהות בימתית חדשה. יש גרסאות שונות לפרטים המדויקים של היווצרות הכינוי.',source:'Dictionary.com — Origin Stories Behind Musicians’ Names',url:'https://www.dictionary.com/articles/origin-stories-behind-musicians-names'},
    Q1299:{text:'The Beatles הוא משחק מילים בין beetles (חיפושיות) לבין beat (קצב מוזיקלי). ג׳ון לנון וסטיוארט סאטקליף נקשרים לבחירת השם; הלהקה השתמשה גם בשם The Silver Beetles בתחילת דרכה.',source:'The Beatles Story — How did The Beatles get their name?',url:'https://www.beatlesstory.com/blog/the-beatles-name/'},
  Q15862:{text:'Queen פירושו באנגלית ״מלכה״. פרדי מרקיורי הציע את השם במקום Smile; לדבריו, הוא ביקש שם שמשדר מלכותיות והדר.',source:'Freddie Mercury — Official Biography',url:'https://freddiemercury.com/bio/'}
};
// Etymology is linked to a verified artist ID: never infer name meanings from arbitrary search results.
const verifiedNameMeanings={
  Q509660:[
    {label:'אריק — שם פרטי',text:'אריק הוא צורת חיבה עברית של השם אריה, שפירושו בעל החיים אריה. זהו מקור לשוני של השם, ולא הסבר מאומת לשאלה מדוע נקרא כך הזמר.',source:'Behind the Name — Arieh',url:'https://www.behindthename.com/name/arieh'},
    {label:'איינשטיין — שם משפחה',text:'זהו שם משפחה שמקורו בגרמנית. במילון מתועדים שני מקורות אפשריים: שם שנגזר משמו של מקום מוקף אבן, או שם המורכב מן המילים ״אחת״ ו״אבן״. אין בכך קביעה איזה מקור חל על משפחתו של הזמר.',source:'ויקימילון — Einstein',url:'https://en.wiktionary.org/wiki/Einstein#German'}
  ],
  Q5383:[
    {label:'David — דייוויד',text:'דָּוִד הוא שם עברי, שמקובל לפרשו ״אהוב״ או ״ידיד״. זהו שמו הפרטי של בואי גם מלידה, לא שם במה שהומצא עבורו.',source:'Behind the Name — David',url:'https://www.behindthename.com/name/david'},
    {label:'Bowie — בואי',text:'בשם הבמה של הזמר, Bowie מתייחס לסכין הבואי, שנקראה על שם ג׳ים בואי. אין לפרש את Bowie אוטומטית כמשמעות של שם משפחה תורשתי במקרה שלו.',source:'האתר הרשמי של דייוויד בואי',url:'https://www.davidbowie.com/2015/2015/09/16/happy-50th-birthday-david-bowie'}
  ],
  Q19848:[
    {label:'Lady — ליידי',text:'באנגלית Lady היא צורת פנייה לאישה, ובין היתר תואר אצולה או כינוי לגברת. כאן זהו חלק משם במה.',source:'Cambridge Dictionary — lady',url:'https://dictionary.cambridge.org/dictionary/english/lady'},
    {label:'Gaga — גאגא',text:'בהקשר של שם הבמה, Gaga לקוח מכותרת השיר Radio Ga Ga של Queen. אין להסיק שהזמרת בחרה בו בגלל משמעות מילונית אחרת של המילה.',source:'Dictionary.com — Origin Stories Behind Musicians’ Names',url:'https://www.dictionary.com/articles/origin-stories-behind-musicians-names'}
  ],
    Q215359:[
    {label:'Dean — דין',text:'לשם Dean יש כמה מקורות אפשריים באנגלית: denu באנגלית עתיקה פירושו ״עמק״; והמילה dean כתואר היא ״דיקן״, במקור מן הלטינית decanus — ממונה על עשרה. אין בכך קביעה מדוע נבחר דווקא השם כשם הבמה.',source:'FamilySearch — Dean surname; Online Etymology Dictionary — dean',url:'https://www.familysearch.org/en/surname?surname=dean'},
    {label:'Martin — מרטין',text:'מקור השם בלטינית Martinus, שנגזר משמו של מארס, אל המלחמה הרומי. מקובל להסבירו כ״שייך למארס״ או ״של מארס״. כאן זהו רכיב בשם הבמה, ולא שם משפחתו המקורי של הזמר.',source:'Behind the Name — Martin',url:'https://www.behindthename.com/name/martin'}
  ]
};
function nameMeaningsSection(item){
  const meanings=verifiedNameMeanings[item.id];if(!meanings?.length)return null;
  const section=el('section','nameSection');section.append(el('h3','','פירוש רכיבי השם'));
  for(const meaning of meanings){section.append(el('h4','',meaning.label));section.append(el('p','bio',meaning.text));const a=el('a','sub','מקור: '+meaning.source+' ↗');a.href=meaning.url;a.target='_blank';a.rel='noopener noreferrer';section.append(a)}
  return section
}
// Live, conservative dictionary fallback. Cache in this session; never equate a word's meaning with an artist's name.
const wiktionaryCache=new Map();
async function wiktionaryNameLookup(word){
  if(wiktionaryCache.has(word))return wiktionaryCache.get(word);
  const promise=(async()=>{
    const url='https://en.wiktionary.org/w/api.php?'+new URLSearchParams({action:'query',titles:word,prop:'categories',cllimit:'max',format:'json',origin:'*',redirects:'1'});
    const data=await json(url);const page=Object.values(data.query?.pages||{})[0];
    if(!page||page.missing!==undefined)return null;
    const categories=(page.categories||[]).map(c=>c.title.toLowerCase());
    const isName=categories.some(c=>/given names|surnames|proper nouns/.test(c));
    if(!isName)return null;
    return {word,title:page.title,url:'https://en.wiktionary.org/wiki/'+encodeURIComponent(page.title),kind:categories.some(c=>/given names/.test(c))?'שם פרטי':categories.some(c=>/surnames/.test(c))?'שם משפחה':'שם עצם פרטי'};
  })().catch(()=>null);
  wiktionaryCache.set(word,promise);return promise
}
// Hebrew summaries are curated; the remote dictionary is never machine-translated by guesswork.
const hebrewNameGlossary={
  david:{text:'דוד הוא שם עברי, שמקובל לפרשו ״אהוב״ או ״ידיד״.',url:'https://en.wiktionary.org/wiki/David'},
  martin:{text:'מרטין נגזר מן השם הלטיני Martinus, הקשור לשמו של מארס, אל המלחמה הרומי.',url:'https://en.wiktionary.org/wiki/Martin'},
  dean:{text:'לשם דין יש יותר ממקור אפשרי, ובהם המילה האנגלית dean (דיקן) ושם משפחה שמקורו במילה העתיקה denu (עמק).',url:'https://en.wiktionary.org/wiki/Dean'},
  jackson:{text:'ג׳קסון הוא שם משפחה אנגלי שנוצר מן Jack + son, כלומר ״בנו של ג׳ק״. ג׳ק הוא בין היתר צורת חיבה של ג׳ון. זהו פירוש שם המשפחה, לא קביעה על אילן היוחסין של האמן.',url:'https://en.wiktionary.org/wiki/Jackson'},
  johnson:{text:'ג׳ונסון הוא שם משפחה פטרונימי מן John + son — ״בנו של ג׳ון״. זהו מקור לשוני של שם המשפחה, ולא מידע על אביו של אמן מסוים.',url:'https://en.wiktionary.org/wiki/Johnson'},
  harrison:{text:'האריסון הוא שם משפחה אנגלי פטרונימי שפירושו ״בנו של הארי״; הארי הוא צורה של השם הנרי.',url:'https://en.wiktionary.org/wiki/Harrison'},
  anderson:{text:'אנדרסון הוא שם משפחה פטרונימי שמשמעותו ״בנו של אנדרו״ או ״בנו של אנדרס״, בהתאם למסורת הלשונית.',url:'https://en.wiktionary.org/wiki/Anderson'},
  jones:{text:'ג׳ונס הוא שם משפחה שמקורו בוויילס, צורת ייחוס לשם ג׳ון — בקירוב ״בנו של ג׳ון״.',url:'https://en.wiktionary.org/wiki/Jones'},
    john:{text:'ג׳ון הוא צורה אנגלית של יוחנן, שם עברי שפירושו המקובל ״ה׳ חנן״.',url:'https://en.wiktionary.org/wiki/John'},
  paul:{text:'פול מקורו בשם הלטיני Paulus, שפירושו ״קטן״ או ״צנוע״.',url:'https://en.wiktionary.org/wiki/Paul'},
  george:{text:'ג׳ורג׳ מקורו ביוונית Georgios, הקשור ל־georgos — ״עובד אדמה״ או ״איכר״.',url:'https://en.wiktionary.org/wiki/George'},
  michael:{text:'מייקל הוא צורה אנגלית של מיכאל, שם עברי שפירושו ״מי כאל?״.',url:'https://en.wiktionary.org/wiki/Michael'},
  mary:{text:'מרי היא צורה אנגלית של מרים. מקורו המדויק של השם מרים שנוי במחלוקת, ולכן אין לו פירוש מוסכם אחד.',url:'https://en.wiktionary.org/wiki/Mary'},
  elvis:{text:'לשם אלביס הוצעו הסברים שונים למקורו, ואין פירוש אטימולוגי מוסכם אחד. אין לבלבל בין מקור השם לבין הסיבה שהזמר נקרא על שם אביו.',url:'https://en.wiktionary.org/wiki/Elvis'},
    lady:{text:'Lady פירושו באנגלית גברת או תואר פנייה לאישה; משמעות מילונית אינה בהכרח הסיבה לבחירת שם הבמה.',url:'https://en.wiktionary.org/wiki/lady'}
};
// Multilingual pilot: check original-script dictionary pages; never present an unverified translation as etymology.
// Original-script dictionary discovery: Arabic definite article and French case variants.
const verifiedMultilingualGlosses={
  fr:{piaf:'בצרפתית מדוברת: דרור, ובהרחבה ציפור קטנה. זהו פירוש המילה; שם הבמה אינו שם משפחתה המקורי של הזמרת.'},
  ar:{'فريد':'בערבית: יחיד במינו, ייחודי או שאין שני לו. זהו פירוש השם, ולא תיאור ביוגרפי של הזמר.','أطرش':'בערבית: חירש. זהו פירוש לשוני של שם המשפחה, ולא תיאור שמיעתו של האמן.'}
};
function dictionaryVariants(word,lang){
  const variants=[word];
  if(lang==='ar'&&word.startsWith('ال')&&word.length>3)variants.push(word.slice(2));
  if(lang==='fr'&&word.toLowerCase()!==word)variants.push(word.toLowerCase());
  return [...new Set(variants)]
}
async function multilingualDictionaryLookup(word,lang){
  const key=lang+':'+word;
  if(wiktionaryCache.has(key))return wiktionaryCache.get(key);
  const promise=(async()=>{
    for(const variant of dictionaryVariants(word,lang)){
      // English Wiktionary also indexes original-script Arabic words missing from Arabic Wiktionary.
      for(const site of lang==='ar'?['ar','en']:[lang]){
        try{
          const url='https://'+site+'.wiktionary.org/w/api.php?'+new URLSearchParams({action:'query',titles:variant,format:'json',origin:'*',redirects:'1'});
          const data=await json(url);const page=Object.values(data.query?.pages||{})[0];
          if(page&&page.missing===undefined)return {word,matched:page.title,lang,site,url:'https://'+site+'.wiktionary.org/wiki/'+encodeURIComponent(page.title)};
        }catch(e){console.warn('Dictionary lookup failed',site,variant,e)}
      }
    }
    return null
  })().catch(()=>null);
  wiktionaryCache.set(key,promise);return promise
}
// Experimental automatic gloss extraction from the English Wiktionary's original-script entry.
// A dictionary definition is not necessarily the historical origin of a person's name.
const definitionCache=new Map();
async function automaticDictionaryGloss(entry){
  const key='definition:'+entry.lang+':'+entry.matched;
  if(definitionCache.has(key))return definitionCache.get(key);
  const promise=(async()=>{
    const wanted=entry.lang==='ar'?'Arabic':'French';
    const url='https://en.wiktionary.org/w/api.php?'+new URLSearchParams({action:'parse',page:entry.matched,prop:'text',format:'json',origin:'*',redirects:'1'});
    const data=await json(url);
    const html=data.parse?.text?.['*'];if(!html)return null;
    const doc=new DOMParser().parseFromString(html,'text/html');
    const heading=[...doc.querySelectorAll('h2')].find(h=>h.textContent.trim().replace(/\[edit\]/gi,'').includes(wanted));
    if(!heading)return null;
    let node=heading.nextElementSibling;
    while(node&&node.tagName!=='H2'){
      const sections=node.matches?.('ol')?[node]:[...node.querySelectorAll?.('ol')||[]];
      for(const ol of sections){
        const li=[...ol.children].find(n=>n.tagName==='LI');
        if(!li)continue;
        const copy=li.cloneNode(true);
        copy.querySelectorAll('ul,ol,dl,.reference,.mw-cite-backlink,.HQToggle,.nyms-toggle').forEach(n=>n.remove());
        const definition=copy.textContent.replace(/\s+/g,' ').trim();
        if(definition.length>=4&&definition.length<=260)return {definition,url:'https://en.wiktionary.org/wiki/'+encodeURIComponent(entry.matched)+'#'+wanted};
      }
      node=node.nextElementSibling;
    }
    return null
  })().catch(()=>null);
  definitionCache.set(key,promise);return promise
}
function originalLanguageSection(item){
  const choices=[];
  const language=nameDictionaryLanguage(item);
  if(language==='fr'){
    const words=(item.frenchTitle||'').split(/\s+/).filter(Boolean).slice(0,3);
    words.forEach((word,index)=>choices.push({word,lang:'fr',index,total:words.length}));
  }
  const arabic=(item.arabicTitle||'').trim();
  if(!choices.length&&language==='ar'&&/[\u0600-\u06ff]/.test(arabic)){
    const words=arabic.split(/\s+/).filter(word=>word&&!['ال','آل'].includes(word)).slice(0,4);
    words.forEach((word,index)=>choices.push({word,lang:'ar',index,total:words.length}));
  }
  if(!choices.length)return null;
  const section=el('section','nameSection');
  section.append(el('h3','','מילון בשפת המקור'));
  const message=el('p','muted','בודק ערכים בוויקימילון הצרפתי או הערבי…');section.append(message);
  Promise.all(choices.map(x=>multilingualDictionaryLookup(x.word,x.lang))).then(results=>{
    if(!section.isConnected)return;
    const entries=results.map((entry,index)=>entry&&({...entry,role:namePartRole(entry.word,entry.lang,choices[index].index,choices[index].total)})).filter(Boolean);
    const isFarid=/فريد/.test(arabic)&&/طرش/.test(arabic);
    message.textContent=entries.length?'רכיבי השם לפי הסדר שבו הם מופיעים בשם האמן. פירוש בעברית יופיע רק אם אומת:':'לא נמצאו ערכים תואמים בשפת המקור בבדיקה זו.';
    if(isFarid){
      const intro=el('p','bio','שמו של האמן מורכב משם פרטי — פריד — ומשם משפחה — אל־אטרש. אלה פירושים לשוניים של השמות, ולא תיאור של תכונותיו או מצבו הרפואי.');
      section.append(intro);
    }
    for(const entry of entries){
      const block=el('div','dictionaryEntry');
      const isSurname=entry.role==='שם משפחה';
      const isGiven=entry.role==='שם פרטי';
      const heading=el('h4','',entry.role+': '+entry.word);heading.dir='auto';block.append(heading);
      const key=entry.lang==='ar'?entry.matched.replace(/^ال/,''):entry.matched.toLowerCase();
      const gloss=verifiedMultilingualGlosses[entry.lang]?.[key]||verifiedMultilingualGlosses[entry.lang]?.[entry.matched.toLowerCase()];
      if(gloss){
        const lead=isSurname?'פירוש שם המשפחה: ':isGiven?'פירוש השם הפרטי: ':'פירוש המילה: ';
        block.append(el('p','bio',lead+gloss));
      }else{
        const pending=el('p','muted','מחפש הגדרה מילונית אוטומטית…');block.append(pending);
        automaticDictionaryGloss(entry).then(result=>{
          if(!pending.isConnected)return;
          if(!result){pending.textContent='לא נמצאה הגדרה שניתן לחלץ בביטחון. אפשר לעיין בערך המילוני.';return}
          pending.textContent='הגדרה מילונית באנגלית (חולצה מן המקור אוטומטית; עדיין לא תורגמה לעברית): '+result.definition;
          const source=el('a','sub','מקור ההגדרה באנגלית ↗');source.href=result.url;source.target='_blank';source.rel='noopener noreferrer';block.append(source);
        });
      }
      if(entry.matched!==entry.word)block.append(el('p','muted','לצורך הבדיקה המילונית חיפשנו גם את הצורה '+entry.matched+' ללא ה״א הידיעה הערבית „אל־”.'));
      if(entry.site!==entry.lang)block.append(el('p','muted','הערך נמצא בוויקימילון האנגלי בכתיב הערבי המקורי.'));
      const a=el('a','sub',gloss?'מקור לפירוש: ויקימילון ↗':'פתיחת הערך בוויקימילון ↗');a.href=entry.url;a.target='_blank';a.rel='noopener noreferrer';block.append(a);section.append(block)
    }
  });
  return section
}
function liveEtymologySection(item){
  const section=el('section','nameSection');section.append(el('h3','','בדיקה במילון השמות המקוון'));
  const message=el('p','muted','מחפש ערכי שמות מתאימים בוויקימילון…');section.append(message);
  const english=(item.englishTitle||'').trim();
  const parts=english.split(/\s+/).filter(w=>/^[A-Za-z][A-Za-z'-]*$/.test(w)).slice(0,4);
  if(!parts.length){message.textContent='אין שם באותיות לטיניות לחיפוש מדויק. אפשר לעיין בשמות המתועדים לעיל.';return section}
  Promise.all([...new Set(parts)].map(wiktionaryNameLookup)).then(found=>{
    if(!section.isConnected)return;
    const entries=found.filter(Boolean);
    if(!entries.length){message.textContent='לא נמצא ערך שניתן לזהות בביטחון כשם פרטי או שם משפחה. לא נציג פירוש משוער.';return}
    message.textContent='פירוש בעברית מוצג רק כשיש הסבר שנבדק. משמעות השם אינה בהכרח הסיבה לבחירתו.';
    for(const entry of entries){
      const block=el('div','dictionaryEntry');
      const heading=el('h4','',entry.word+' — '+entry.kind);heading.dir='auto';block.append(heading);
      const known=hebrewNameGlossary[entry.word.toLowerCase()];
      if(known&&entry.kind!=='שם עצם פרטי')block.append(el('p','bio',known.text));
      else block.append(el('p','muted','פירוש השם בעברית טרם אומת. אפשר לעיין בערך המקורי.'));
      const a=el('a','sub','פתיחת הערך בוויקימילון ↗');a.href=entry.url;a.target='_blank';a.rel='noopener noreferrer';block.append(a);
      section.append(block)
    }
    section.append(el('p','muted','מקור: Wiktionary · תוכן המילון ברישיון CC BY-SA. קישורים לערכים, ללא העתקת פירושים.'));
  });
  return section
}
function claimText(entity,key){return (entity?.claims?.[key]||[]).map(c=>c.mainsnak?.datavalue?.value).filter(v=>typeof v==='string'&&v.trim()).filter((v,i,a)=>a.indexOf(v)===i)}
function nameSection(item){
  const story=nameStories[item.id];
  const nativeNames=(item.nativeNames||[]).filter(name=>normalize(name)!==normalize(item.title));
  if(!story&&!item.birthNames?.length&&!item.stageNames?.length&&!item.nicknames?.length&&!nativeNames.length)return null;
  const section=el('section','nameSection');
  section.append(el('h3','',story?'מקור השם ושמות נוספים':'שמות נוספים'));
  if(story){section.append(el('p','bio',story.text));const a=el('a','sub','מקור: '+story.source+' ↗');a.href=story.url;a.target='_blank';a.rel='noopener noreferrer';section.append(a)}
  if(item.birthNames?.length){section.append(el('p','fact','שם בלידה: '+item.birthNames.join(' · ')))}
  if(item.stageNames?.length){section.append(el('p','fact','שמות במה מתועדים: '+item.stageNames.join(' · ')))}
  if(item.nicknames?.length){section.append(el('p','fact','כינויים מתועדים: '+item.nicknames.join(' · ')))}
  if(nativeNames.length){section.append(el('p','fact','שם בשפת המקור: '+nativeNames.join(' · ')))}
  if(item.birthNames?.length||item.stageNames?.length||item.nicknames?.length||nativeNames.length){const a=el('a','small','מקור לשמות המתועדים: Wikidata ↗');a.href='https://www.wikidata.org/wiki/'+encodeURIComponent(item.id);a.target='_blank';a.rel='noopener noreferrer';section.append(a)}
  return section
}
function visible(){return state.items.filter(item=>matchesFilter(item,state.filter))}
function paint(){
  const results=$('results');results.replaceChildren();$('detail').classList.add('hidden');
  const list=visible();
  if(!list.length){results.append(el('div','empty','לא נמצאו תוצאות בסינון זה. אפשר לחזור ל״הכול״ או לנסות חיפוש אחר.'));return}
  for(const item of list){
    const b=el('button','tile');b.type='button';b.append(imgNode(item.image,item.title));
    const box=el('div','content');box.append(el('strong','',item.title));
    box.append(el('div','muted',typeLabel(item)+(item.savedAt?' · כרטיס שמור, ייתכן שאינו עדכני':'')+(item.description?' · '+item.description:'')));
    b.append(box);b.addEventListener('click',()=>show(item));results.append(b)
  }
}
async function loadEntities(ids,signal){
  const batches=[];for(let i=0;i<ids.length;i+=25)batches.push(ids.slice(i,i+25));
  const maps=await Promise.all(batches.map(batch=>entities(batch,signal)));
  const map=Object.assign({},...maps);
  const items=ids.map(id=>map[id]).filter(entity=>entity&&!entity.missing&&artistTypes(entity).length).map(entity=>itemFromEntity(entity));
  await Promise.all(items.map(async item=>{
    if(!item.wikiTitle)return;
    const summary=await wikiSummary(item.wikiTitle,item.lang,signal);
    item.image=summary?.thumbnail?.source||summary?.originalimage?.source;
    item.summary=summary?.extract;item.page=summary?.content_urls?.desktop?.page
  }));
  return items
}
function showSavedArtists(query=''){
  const saved=findSavedArtists(query,readSavedArtists(localStorage));
  state.items=saved;paint();
  const shown=visible().length;
  setStatus(shown?'אין חיבור למאגר. מוצגים '+shown+' כרטיסים שנשמרו בביקור קודם; ייתכן שהמידע בהם השתנה.':saved.length?'יש כרטיסים שמורים, אך אין תוצאות בסינון זה. בחר ״הכול״ כדי לראותם.':'אין חיבור למאגר. לא נשמרו כרטיסים תואמים במכשיר הזה. התחבר לאינטרנט ונסה שוב.');
}
async function search(q){if(state.controller)state.controller.abort();const generation=++state.generation;if(!navigator.onLine){showSavedArtists(q);return}state.lastSearch=q;state.controller=new AbortController();const signal=state.controller.signal;setStatus('מחפש אמנים במאגרי הידע…');$('results').replaceChildren();$('detail').classList.add('hidden');try{const aliases={
  'מייקל גקסון':'Michael Jackson',
  'מייקל גקסן':'Michael Jackson',
  'פול מקרטני':'Paul McCartney',
  'דייוויד בואי':'David Bowie',
  'דיוויד בואי':'David Bowie',
  'דין מרטין':'Dean Martin',
  'ליידי גאגא':'Lady Gaga',
  'אדית פיאף':'Édith Piaf',
  'אידית פיאף':'Édith Piaf',
  'אדיט פיאף':'Édith Piaf',
  'פריד אל עטרש':'Farid al-Atrash',
  'פריד אלאטרש':'Farid al-Atrash',
  'פריד אל אטרש':'Farid al-Atrash',
  'גורג ברסנס':'Georges Brassens',
  'גורג ברסאנס':'Georges Brassens',
  'גורג ברסאן':'Georges Brassens',
  'גורג ברסנסס':'Georges Brassens',
  'גאורג ברסנס':'Georges Brassens'
};
const canonical=s=>normalize(s).replace(/[׳'‘’`״"\u200e\u200f]/g,'').replace(/[־\-]/g,' ').replace(/\s+/g,' ');
const alias=aliases[canonical(q)]||null;
const variants=[q];
if(alias)variants.push(alias);
const queries=variants.flatMap(term=>[wikidataSearch(term,'he',signal),wikidataSearch(term,'en',signal)]);
const responses=await Promise.allSettled(queries);
if(generation!==state.generation)return;
const found=new Map();
for(const response of responses)if(response.status==='fulfilled')for(const result of response.value.search||[])if(!found.has(result.id))found.set(result.id,result);
if(!found.size&&responses.every(response=>response.status==='rejected'))throw Error('שירות החיפוש אינו זמין');
const ids=[...found.keys()].slice(0,50);
if(!ids.length){state.items=[];setStatus('לא נמצאו תוצאות. נסה כתיב אחר או שם באנגלית.');paint();return}
const items=await loadEntities(ids,signal);
if(generation!==state.generation)return;
state.items=items;
setStatus(state.items.length===1?'נמצא אמן אחד. בחר בו כדי לפתוח כרטיס.':state.items.length?'נמצאו '+state.items.length+' אמנים. בחר אמן כדי לפתוח כרטיס.':'לא נמצאו אמנים בשם הזה. נסה כתיב אחר או שם באנגלית.');
paint()
}catch(e){if(e.name==='AbortError'||generation!==state.generation)return;console.error(e);showSavedArtists(q)}}
async function show(item){
  if(!item.savedAt)saveArtist(localStorage,{...item,searchTerms:state.lastSearch?[state.lastSearch]:[]});
  $('results').replaceChildren();const detail=$('detail');detail.replaceChildren();detail.classList.remove('hidden');
  setStatus('מציג את הכרטיס של '+item.title);
  const back=el('button','sub','← חזרה לתוצאות');back.type='button';back.style.marginBottom='14px';
  back.addEventListener('click',()=>{detail.classList.add('hidden');paint();setStatus(item.savedAt?'מוצגים כרטיסים שמורים מביקור קודם; ייתכן שהמידע השתנה.':'בחר תוצאה לפתיחת הכרטיס.')});detail.append(back);
  const wrap=el('article','profile'),top=el('div','profileTop'),info=el('div');
  top.append(imgNode(item.image,item.title));info.append(el('h2','',item.title));
  info.append(el('span','badge',typeLabel(item)));
  if(item.savedAt)info.append(el('p','muted','כרטיס שמור מביקור קודם · נשמר ב־'+new Date(item.savedAt).toLocaleDateString('he-IL')+'. ייתכן שהמידע השתנה מאז.'));
  if(item.born)info.append(el('div','fact','שנות חיים: '+item.born+(item.died?'–'+item.died:'–')));
  else if(item.inception)info.append(el('div','fact','שנות פעילות/ייסוד: '+item.inception+(item.dissolved?'–'+item.dissolved:'')));
  if(item.description)info.append(el('p','muted',item.description));
  info.append(el('p','bio',item.summary||'תקציר ויקיפדיה אינו זמין. ניתן לעיין במקור כשיש חיבור לאינטרנט.'));
  top.append(info);wrap.append(top);const names=nameSection(item);if(names)wrap.append(names);
  const meanings=nameMeaningsSection(item);if(meanings)wrap.append(meanings);
  if(item.savedAt&&!navigator.onLine)wrap.append(el('p','nameSection muted','בדיקת מילוני שמות דורשת חיבור לאינטרנט.'));
  else{const original=originalLanguageSection(item);if(original)wrap.append(original);else if(nameDictionaryLanguage(item)==='en')wrap.append(liveEtymologySection(item))}
  const foot=el('div','profileFoot');
  const links=[['ויקיפדיה',item.page||'https://'+item.lang+'.wikipedia.org/wiki/'+encodeURIComponent(item.wikiTitle||item.title)],['Wikidata','https://www.wikidata.org/wiki/'+item.id]];
  for(const [label,url] of links){const a=el('a','sub',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';foot.append(a)}
  wrap.append(foot);detail.append(wrap)
}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();const q=$('searchInput').value.trim();if(q.length>=2)search(q)});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;document.querySelectorAll('.tab').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});paint()}));
(async()=>{
  const generation=state.generation;
  if(!navigator.onLine){showSavedArtists();return}
  try{
    const items=await loadEntities(seeds.map(seed=>seed[0]));
    if(generation!==state.generation)return;
    state.items=items;
    for(const item of state.items){const seed=seeds.find(row=>row[0]===item.id);if(seed&&(!item.title||item.title.startsWith('Q')))item.title=seed[1]}
    setStatus('בחר אמן לדוגמה או חפש שם חדש.');paint()
  }catch(e){if(generation!==state.generation)return;console.error(e);showSavedArtists()}
})();
window.addEventListener('offline',()=>{++state.generation;if(state.controller)state.controller.abort();showSavedArtists()});
window.addEventListener('online',()=>setStatus('החיבור חזר. אפשר לחפש אמנים ולעדכן כרטיסים.'));
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
