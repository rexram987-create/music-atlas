const normalize=text=>(text||'').toLocaleLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const excluded=/\b(cover|karaoke|reaction|tutorial|tribute|instrumental)\b|קאבר|קריוקי|גרסת כיסוי/iu;
const annotation=/\s*[([](?:official\s+)?(?:music\s+)?video[)\]]|\s*[([](?:official\s+)?(?:audio|lyrics?|remaster(?:ed)?(?:\s+\d{4})?)[)\]]/giu;

function songTitle(title,artist){
  let clean=title.replace(annotation,'').trim();
  const parts=clean.split(/\s+[-–—|]\s+/);
  if(parts.length>1&&normalize(parts[0])===normalize(artist))clean=parts.slice(1).join(' - ');
  return clean.trim();
}

export async function findTopVideos({artist,localName='',channelId='',apiKey,fetcher=fetch}){
  const search=new URL('https://www.googleapis.com/youtube/v3/search');
  search.search=new URLSearchParams({part:'snippet',type:'video',order:'viewCount',videoCategoryId:'10',maxResults:'50',key:apiKey}).toString();
  if(channelId)search.searchParams.set('channelId',channelId);
  else search.searchParams.set('q',artist);
  const load=async url=>{
    const response=await fetcher(url,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('YouTube API request failed');
    return response.json();
  };
  const found=await load(search);
  const ids=[...new Set((found.items||[]).map(item=>item.id?.videoId).filter(id=>/^[\w-]{1,30}$/.test(id)))];
  if(!ids.length)return [];
  const details=new URL('https://www.googleapis.com/youtube/v3/videos');
  details.search=new URLSearchParams({part:'snippet,statistics',id:ids.join(','),key:apiKey}).toString();
  const videos=await load(details);
  const distinct=new Map();
  for(const video of videos.items||[]){
    const snippet=video.snippet||{};
    const title=snippet.title||'';
    if(snippet.categoryId!=='10'||excluded.test(title))continue;
    const channelMatches=channelId?snippet.channelId===channelId:[artist,localName].filter(Boolean).some(name=>normalize(snippet.channelTitle).includes(normalize(name)));
    if(!channelMatches)continue;
    const name=songTitle(title,artist);
    const views=Number(video.statistics?.viewCount);
    if(!name||!Number.isSafeInteger(views)||views<0)continue;
    const entry={title:name,views,url:'https://www.youtube.com/watch?v='+encodeURIComponent(video.id),channel:snippet.channelTitle};
    const key=normalize(name.replace(/\s*[([](?:remaster(?:ed)?|official|live)[^)]*[)\]]/giu,''));
    if(!distinct.has(key)||distinct.get(key).views<views)distinct.set(key,entry);
  }
  return [...distinct.values()].sort((a,b)=>b.views-a.views).slice(0,5);
}
