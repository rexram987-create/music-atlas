const groupKinds=new Set(['Q215380','Q5741069','Q2088357']);
const singerJobs=new Set(['Q177220']);
const composerJobs=new Set(['Q36834']);
const musicianJobs=new Set(['Q639669']);
const savedKey='music-atlas-artists-v1';

const claimIds=(entity,property)=>(entity.claims?.[property]||[])
  .map(claim=>claim.mainsnak?.datavalue?.value?.id).filter(Boolean);

export function claimNames(entity,property){
  return [...new Set((entity?.claims?.[property]||[])
    .map(claim=>claim.mainsnak?.datavalue?.value)
    .map(value=>typeof value==='string'?value:value?.text)
    .filter(value=>typeof value==='string'&&value.trim()))];
}

export function artistTypes(entity){
  const instances=claimIds(entity,'P31');
  if(instances.some(id=>groupKinds.has(id)))return ['band'];
  if(!instances.includes('Q5'))return [];
  const jobs=claimIds(entity,'P106');
  const description=Object.values(entity.descriptions||{}).map(value=>value.value||'').join(' ').toLowerCase();
  const singer=jobs.some(id=>singerJobs.has(id))||/\b(singer|vocalist|rapper)\b|זמר|זמרת|ראפר|مغن|مطرب/.test(description);
  const composer=jobs.some(id=>composerJobs.has(id))||/\bcomposer\b|מלחינ|מלחין|ملحن/.test(description);
  const types=[];
  if(singer)types.push('singer');
  if(composer)types.push('composer');
  if(types.length)return types;
  if(jobs.some(id=>musicianJobs.has(id))||/\b(musician|songwriter|guitarist|pianist|conductor|instrumentalist)\b|מוזיקאי|מוזיקאית|נגן|נגנית|פסנתרן|גיטריסט/.test(description))return ['all'];
  return [];
}

export function matchesFilter(item,filter){
  return filter==='all'||item.types?.includes(filter)===true;
}

export function namePartRole(word,lang,index,total){
  if(lang==='fr'&&word.toLowerCase()==='piaf')return 'שם במה / כינוי';
  if(total<2)return 'רכיב השם';
  if(index===0)return 'שם פרטי';
  if(index===total-1)return 'שם משפחה';
  return 'רכיב השם';
}

export function nameDictionaryLanguage(item){
  const native=item.nativeNames||[];
  const hebrew=native.some(name=>/[\u0590-\u05ff]/.test(name));
  const arabic=native.some(name=>/[\u0600-\u06ff]/.test(name));
  if(hebrew)return 'he';
  if(arabic&&/[\u0600-\u06ff]/.test(item.arabicTitle||''))return 'ar';
  if(item.id==='Q1631'||/^(georges brassens)$/i.test(item.frenchTitle||''))return 'fr';
  return 'en';
}

export function readSavedArtists(storage){
  try{
    const items=JSON.parse(storage.getItem(savedKey)||'[]');
    return Array.isArray(items)?items.filter(item=>item&&typeof item.id==='string'&&Array.isArray(item.types)):[];
  }catch{return []}
}

export function saveArtist(storage,item){
  try{
    const existing=readSavedArtists(storage);
    const old=existing.find(artist=>artist.id===item.id);
    const searchTerms=[...new Set([...(old?.searchTerms||[]),...(item.searchTerms||[])].filter(Boolean))];
    const saved=existing.filter(artist=>artist.id!==item.id);
    storage.setItem(savedKey,JSON.stringify([{...item,searchTerms,savedAt:Date.now()},...saved].slice(0,20)));
  }catch{/* Storage may be disabled or full; online profiles still work. */}
}

const normalized=value=>(value||'').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
export function findSavedArtists(query,saved){
  const needle=normalized(query);
  if(!needle)return saved;
  return saved.filter(item=>[item.title,item.englishTitle,item.frenchTitle,item.arabicTitle,...(item.searchTerms||[])].some(label=>normalized(label).includes(needle)));
}
