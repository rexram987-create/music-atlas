function completeSentences(text,lang){
  const segments=[...new Intl.Segmenter(lang,{granularity:'sentence'}).segment(text)].map(segment=>segment.segment.trim()).filter(Boolean);
  const sentences=[];
  let pending='';
  for(const segment of segments){
    pending=(pending+' '+segment).trim();
    // Segmenter can split after an abbreviation such as "Dr.".
    if(/^(?:Dr|Mr|Mrs|Ms|Prof|St)\.$/iu.test(pending))continue;
    if(/[.!?]["'״”]?$/u.test(pending))sentences.push(pending);
    pending='';
  }
  return sentences;
}

// Use Wikipedia's own prose, without inventing facts or completing truncated sentences.
export function biographyExcerpt(extract,summary,title,lang='he'){
  const source=typeof extract==='string'?extract:'';
  const intro=source.split(/\n\s*==/u)[0];
  const sentences=completeSentences(intro,lang);
  if(sentences.length<4&&source&&title){
    const biography=source.match(/(?:^|\n)==\s*(?:ביוגרפיה|Biography)\s*==\s*\n([\s\S]*?)(?=\n==[^=]|$)/iu)?.[1];
    const paragraphs=biography?.split(/\n\s*\n/u).map(p=>p.trim()).filter(Boolean)||[];
    const first=paragraphs.find(p=>p.length>=70&&p.includes(title)&&!p.startsWith('״'));
    if(first)sentences.push(...completeSentences(first,lang));
  }
  if(!sentences.length)sentences.push(...completeSentences(typeof summary==='string'?summary:'',lang));
  return sentences.length?sentences.slice(0,5).join(' '):null;
}
