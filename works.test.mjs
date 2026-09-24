import test from 'node:test';
import assert from 'node:assert/strict';
import {songCategories,selectSongCategory,songExamples} from './works.mjs';

test('artist song categories use the Hebrew article name and distinguish performance from writing',()=>{
  assert.deepEqual(songCategories({title:'יהודה פוליקר',wikiTitle:'יהודה פוליקר',lang:'he'}),[
    {title:'קטגוריה:שירי יהודה פוליקר',role:'שירים המשויכים לאמן',lang:'he'},
    {title:'קטגוריה:שירים שבוצעו על ידי יהודה פוליקר',role:'שירים בביצוע האמן',lang:'he'},
    {title:'קטגוריה:שירים שנכתבו על ידי יהודה פוליקר',role:'שירים שכתב האמן',lang:'he'},
    {title:'קטגוריה:שירים שהולחנו על ידי יהודה פוליקר',role:'שירים שהלחין האמן',lang:'he'}
  ]);
  assert.equal(songCategories({wikiTitle:'מייקל ג׳קסון',englishTitle:'Michael Jackson',lang:'he'}).some(category=>category.title==='Category:Songs recorded by Michael Jackson'&&category.lang==='en'),true);
  assert.equal(songCategories({title:'לא ידוע',lang:'en'}).length,0);
});

test('selects an existing category with pages and preserves its role',()=>{
  const categories=songCategories({title:'ארקדי דוכין',wikiTitle:'ארקדי דוכין',lang:'he'});
  const response={query:{pages:{a:{title:categories[0].title,missing:true,categoryinfo:{size:0}},b:{title:categories[2].title,categoryinfo:{pages:6,size:6}}}}};
  assert.deepEqual(selectSongCategory(response,categories),categories[2]);
  assert.equal(selectSongCategory({query:{pages:{a:{title:categories[0].title,missing:true}}}},categories),null);
});

test('shows five unique article titles with article and YouTube search links',()=>{
  const members=[{ns:0,title:'אני רוצה גם'},{ns:0,title:'יורם (שיר)'},{ns:0,title:'יורם (שיר)'},{ns:14,title:'קטגוריה:שירים'},{ns:0,title:'חלון לים התיכון'},{ns:0,title:'דברים שרציתי לומר'},{ns:0,title:'פרח (שיר)'},{ns:0,title:'שיר שישי'}];
  const songs=songExamples(members,'יהודה פוליקר');
  assert.deepEqual(songs.map(song=>song.title),['אני רוצה גם','יורם','חלון לים התיכון','דברים שרציתי לומר','פרח']);
  assert.equal(songs[1].source,'https://he.wikipedia.org/wiki/'+encodeURIComponent('יורם (שיר)'));
  assert.equal(songs[1].youtube,'https://www.youtube.com/results?search_query='+encodeURIComponent('יהודה פוליקר יורם'));
  assert.equal(songExamples([{ns:0,title:'Beat It'}],'Michael Jackson','en')[0].source,'https://en.wikipedia.org/wiki/Beat%20It');
});
