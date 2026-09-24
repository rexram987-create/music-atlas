export function songCategories(item){
  const categories=[];
  if(item?.lang==='he'&&item.wikiTitle){
    const name=item.wikiTitle.trim();
    categories.push(
      {title:'קטגוריה:שירי '+name,role:'שירים המשויכים לאמן',lang:'he'},
      {title:'קטגוריה:שירים שבוצעו על ידי '+name,role:'שירים בביצוע האמן',lang:'he'},
      {title:'קטגוריה:שירים שנכתבו על ידי '+name,role:'שירים שכתב האמן',lang:'he'},
      {title:'קטגוריה:שירים שהולחנו על ידי '+name,role:'שירים שהלחין האמן',lang:'he'}
    );
  }
  const english=item?.englishTitle||item?.lang==='en'&&item.wikiTitle;
  if(english){
    categories.push(
      {title:'Category:Songs recorded by '+english,role:'שירים שהוקלטו בידי האמן',lang:'en'},
      {title:'Category:'+english+' songs',role:'שירים המשויכים לאמן',lang:'en'},
      {title:'Category:Songs written by '+english,role:'שירים שכתב האמן',lang:'en'},
      {title:'Category:Compositions by '+english,role:'יצירות שהלחין האמן',lang:'en'}
    );
  }
  return categories;
}

export function selectSongCategory(response,categories){
  const pages=Object.values(response?.query?.pages||{});
  return categories.find(category=>pages.some(page=>page.title===category.title&&page.missing===undefined&&page.categoryinfo?.pages>0))||null;
}

export function songExamples(members,artist,lang='he',role='שירים בביצוע האמן'){
  const seen=new Set();
  const songs=[];
  for(const member of members||[]){
    if(member.ns!==0||!member.title)continue;
    const title=member.title.replace(/\s*\(שיר(?: של [^)]+)?\)$/u,'').trim();
    if(!title||seen.has(title))continue;
    seen.add(title);
    const performer=/\(שיר של ([^)]+)\)$/u.exec(member.title)?.[1];
    const query=/שכתב|שהלחין|written|Compositions/u.test(role)?title+(performer?' '+performer:''):artist+' '+title;
    songs.push({title,source:'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(member.title),youtube:'https://www.youtube.com/results?search_query='+encodeURIComponent(query)});
    if(songs.length===5)break;
  }
  return songs;
}
