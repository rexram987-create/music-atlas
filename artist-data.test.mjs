import test from 'node:test';
import assert from 'node:assert/strict';
import {artistTypes, matchesFilter, namePartRole, readSavedArtists, saveArtist, findSavedArtists} from './artist-data.mjs';

const claim = id => ({mainsnak:{datavalue:{value:{id}}}});
const entity = (id, instances, occupations=[], description='') => ({
  id,
  claims:{P31:instances.map(claim),P106:occupations.map(claim)},
  descriptions:{en:{value:description}}
});

test('a singer who composes appears in both filters', () => {
  const types=artistTypes(entity('Q449',['Q5'],['Q177220','Q36834'],'French singer and composer'));
  assert.deepEqual(types,['singer','composer']);
  assert.equal(matchesFilter({types},'singer'),true);
  assert.equal(matchesFilter({types},'composer'),true);
});

test('books, albums and parks named for an artist are excluded', () => {
  for(const kind of ['Q571','Q482994','Q22698']){
    assert.deepEqual(artistTypes(entity('Qother',[kind],[],'work about a French singer')),[]);
  }
  assert.deepEqual(artistTypes(entity('Q2491498',['Q105756498'],[],'type of pop band')),[]);
});

test('a musical group and a musician without singer occupation remain discoverable', () => {
  assert.deepEqual(artistTypes(entity('Q1299',['Q215380'],[],'English rock band')),['band']);
  assert.deepEqual(artistTypes(entity('Q2874790',['Q2088357'],[],'musical ensemble')),['band']);
  assert.deepEqual(artistTypes(entity('Qmusician',['Q5'],['Q639669'],'jazz musician')),['all']);
});

test('French surname and Arabic family name are not labelled given names', () => {
  assert.equal(namePartRole('Georges','fr',0,2),'שם פרטי');
  assert.equal(namePartRole('Brassens','fr',1,2),'שם משפחה');
  assert.equal(namePartRole('Piaf','fr',1,2),'שם במה / כינוי');
  assert.equal(namePartRole('فريد','ar',0,2),'שם פרטי');
  assert.equal(namePartRole('الأطرش','ar',1,2),'שם משפחה');
});

test('saved artists can be found offline by an alternate language label', () => {
  const values=new Map();
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  saveArtist(storage,{id:'Q509660',title:'אריק איינשטיין',englishTitle:'Arik Einstein',types:['singer']});
  const saved=readSavedArtists(storage);
  assert.equal(findSavedArtists('Arik',saved)[0].id,'Q509660');
  assert.equal(saved[0].savedAt>0,true);
  assert.deepEqual(findSavedArtists('Mozart',saved),[]);
});

test('an artist opened from a Hebrew spelling remains searchable offline by that spelling', () => {
  const saved=[{id:'Q449',title:"ז'ורז' ברסנס",englishTitle:'Georges Brassens',searchTerms:['ג׳ורג׳ ברסאנס']}];
  assert.equal(findSavedArtists('ג׳ורג׳ ברסאנס',saved)[0].id,'Q449');
});

test('corrupt offline storage does not prevent the app from loading', () => {
  const storage={getItem:()=>'{bad json'};
  assert.deepEqual(readSavedArtists(storage),[]);
});
