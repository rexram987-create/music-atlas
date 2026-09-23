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
