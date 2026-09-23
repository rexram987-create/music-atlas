// A word's ordinary sense is shown separately from the historical origin of a person's name.
export function hebrewWordSense(wikitext){
  if(typeof wikitext!=='string')return null;
  const sections=wikitext.split(/(?=^==[^=\n]+==\s*$)/m);
  for(const section of sections){
    const definitions=section.split('\n').filter(line=>/^#\s/.test(line));
    if(!definitions.some(line=>/#\s(?:\[\[)?שם פרטי/.test(line)))continue;
    for(const line of definitions){
      if(/שם פרטי|שם משפחה|\{\{/.test(line))continue;
      const meaning=line.slice(2)
        .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g,'$1')
        .replace(/'{2,}/g,'')
        .replace(/\s+/g,' ').trim();
      if(meaning.length>=4&&meaning.length<=130&&/[א-ת]/.test(meaning)&&!/[\[\]{}<>]/.test(meaning))return meaning;
    }
  }
  return null;
}

// Keep the source's uncertainty: this is a short excerpt, never a generated etymology.
export function biographyOriginExcerpt(extract,word){
  if(typeof extract!=='string'||typeof word!=='string'||word.length<2)return null;
  const plain=extract.replace(/\s+/g,' ').trim();
  const start=plain.search(/ייתכן שמקור שם המשפחה/u);
  if(start<0)return null;
  const tail=plain.slice(start);
  const name=word.replace(/[^\p{L}\p{N}]/gu,'');
  if(!tail.slice(0,170).replace(/[^\p{L}\p{N}]/gu,'').includes(name))return null;
  const first=tail.match(/^.{20,220}?\./u)?.[0];
  if(!first)return null;
  const second=tail.slice(first.length).trim().match(/^או [^.]{5,120}\./u)?.[0];
  return second&&first.length+second.length<310?first+' '+second:first;
}
