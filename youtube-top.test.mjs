import test from 'node:test';
import assert from 'node:assert/strict';
import {findTopVideos} from './youtube-top.mjs';
import handler from './api/youtube-top.mjs';

function mockFetch(responses,requests){
  return async url=>{
    requests.push(new URL(url));
    const data=responses.shift();
    return {ok:true,json:async()=>data};
  };
}

test('ranks distinct music videos by current views and excludes unrelated channels and covers',async()=>{
  const requests=[];
  const search={items:[
    {id:{videoId:'one'}},{id:{videoId:'two'}},{id:{videoId:'three'}},
    {id:{videoId:'four'}},{id:{videoId:'five'}}
  ]};
  const videos={items:[
    {id:'one',snippet:{title:'Queen - Bohemian Rhapsody (Official Video)',channelTitle:'Queen Official',categoryId:'10'},statistics:{viewCount:'100'}},
    {id:'two',snippet:{title:'Queen - Bohemian Rhapsody (Remastered)',channelTitle:'Queen Official',categoryId:'10'},statistics:{viewCount:'110'}},
    {id:'three',snippet:{title:'Queen - We Will Rock You (Official Video)',channelTitle:'Queen Official',categoryId:'10'},statistics:{viewCount:'500'}},
    {id:'four',snippet:{title:'Queen - We Are The Champions (Cover)',channelTitle:'Other',categoryId:'10'},statistics:{viewCount:'900'}},
    {id:'five',snippet:{title:'Queen interview',channelTitle:'Queen Official',categoryId:'25'},statistics:{viewCount:'800'}}
  ]};
  const songs=await findTopVideos({artist:'Queen',apiKey:'secret',fetcher:mockFetch([search,videos],requests)});
  assert.deepEqual(songs.map(song=>[song.title,song.views,song.url]),[
    ['We Will Rock You',500,'https://www.youtube.com/watch?v=three'],
    ['Bohemian Rhapsody',110,'https://www.youtube.com/watch?v=two']
  ]);
  assert.equal(requests[0].searchParams.get('order'),'viewCount');
  assert.equal(requests[0].searchParams.get('videoCategoryId'),'10');
  assert.equal(requests[0].searchParams.get('maxResults'),'50');
  assert.equal(requests[1].searchParams.get('part'),'snippet,statistics');
});

test('restricts a search to a known artist channel when present',async()=>{
  const requests=[];
  const songs=await findTopVideos({artist:'ארקדי דוכין',channelId:'UC3cLa9M1i6yyidHTt3n0bCg',apiKey:'secret',fetcher:mockFetch([
    {items:[{id:{videoId:'first'}}]},
    {items:[{id:'first',snippet:{title:'חדר משלי',channelId:'UC3cLa9M1i6yyidHTt3n0bCg',channelTitle:'Music Label',categoryId:'10'},statistics:{viewCount:'90'}}]}
  ],requests)});
  assert.equal(requests[0].searchParams.get('channelId'),'UC3cLa9M1i6yyidHTt3n0bCg');
  assert.equal(requests[0].searchParams.has('q'),false);
  assert.equal(songs.length,1);
  assert.equal(songs[0].title,'חדר משלי');
});

test('API rejects invalid inputs and reports missing credentials without revealing a key',async()=>{
  const old=process.env.YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_KEY;
  const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(value){this.body=value;return this}});
  try{
    let res=response();await handler({method:'POST',query:{}},res);assert.equal(res.statusCode,405);
    res=response();await handler({method:'GET',query:{artist:'x'}},res);assert.equal(res.statusCode,400);
    res=response();await handler({method:'GET',query:{artist:'Queen'}},res);assert.equal(res.statusCode,503);
    assert.ok(!JSON.stringify(res.body).includes('YOUTUBE_API_KEY'));
  }finally{if(old!==undefined)process.env.YOUTUBE_API_KEY=old}
});
