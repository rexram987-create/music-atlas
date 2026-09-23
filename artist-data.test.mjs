import test from 'node:test';
import assert from 'node:assert/strict';
import * as artistData from './artist-data.mjs';
const {artistTypes, matchesFilter, namePartRole, readSavedArtists, saveArtist, findSavedArtists}=artistData;

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

test('translated Arabic label does not turn a native Hebrew name into an Arabic dictionary lookup', () => {
  const nameDictionaryLanguage=artistData.nameDictionaryLanguage;
  assert.equal(typeof nameDictionaryLanguage,'function');
  assert.equal(nameDictionaryLanguage({id:'Q509660',arabicTitle:'أريك أينشتاين',nativeNames:['אריק איינשטיין']}),'he');
  assert.equal(nameDictionaryLanguage({id:'Q1391669',arabicTitle:'فريد الأطرش',nativeNames:['فريد الأطرش']}),'ar');
  assert.equal(nameDictionaryLanguage({id:'Q1631',frenchTitle:'Édith Piaf',nativeNames:[]}),'fr');
});

test('Wikidata monolingual native names are read before choosing the dictionary', () => {
  const claimNames=artistData.claimNames;
  assert.equal(typeof claimNames,'function');
  const arik={claims:{P1559:[{mainsnak:{datavalue:{value:{text:'אריק איינשטיין',language:'he'}}}}]}};
  const farid={claims:{P1559:[{mainsnak:{datavalue:{value:{text:'فريد الأطرش',language:'ar'}}}}]}};
  assert.deepEqual(claimNames(arik,'P1559'),['אריק איינשטיין']);
  assert.equal(artistData.nameDictionaryLanguage({arabicTitle:'أريك أينشتاين',nativeNames:claimNames(arik,'P1559')}),'he');
  assert.equal(artistData.nameDictionaryLanguage({arabicTitle:'فريد الأطرش',nativeNames:claimNames(farid,'P1559')}),'ar');
});

test('French native name metadata enables the French dictionary without artist-specific rules', () => {
  const native={claims:{P1559:[{mainsnak:{datavalue:{value:{text:'Charles Aznavour',language:'fr'}}}}]}};
  assert.deepEqual(artistData.nativeNameLanguages(native),['fr']);
  assert.equal(artistData.nameDictionaryLanguage({nativeNames:['Charles Aznavour'],nativeNameLanguages:['fr'],frenchTitle:'Charles Aznavour',arabicTitle:'شارل أزنافور'}),'fr');
});

test('structured given and family names are matched to the displayed artist, not an old surname', () => {
  const extract=artistData.nameClaimIds;
  const match=artistData.matchNameParts;
  assert.equal(typeof extract,'function');
  assert.equal(typeof match,'function');
  const claims={P735:[claim('Qedith'),claim('Qgiovanna')],P734:[claim('Qgassion')]};
  const nameIds=extract({claims});
  const labels={
    Qedith:{labels:{en:{value:'Edith'},fr:{value:'Édith'}}},
    Qgiovanna:{labels:{fr:{value:'Giovanna'}}},
    Qgassion:{labels:{fr:{value:'Gassion'}}}
  };
  assert.deepEqual(match({title:'אדית פיאף',frenchTitle:'Édith Piaf',nameIds},labels),[
    {id:'Qedith',role:'שם פרטי',word:'Édith',english:'Edith'}
  ]);
});

test('Arabic original spelling and Hebrew name components match their Wikidata identities', () => {
  const match=artistData.matchNameParts;
  const farid={title:'פריד אל-אטרש',arabicTitle:'فريد الأطرش',nativeNames:['فريد الأطرش'],nameIds:{given:['Qfarid'],family:['Qatrash']}};
  assert.deepEqual(match(farid,{Qfarid:{labels:{ar:{value:'فريد'}}},Qatrash:{labels:{ar:{value:'الأطرش'}}}}).map(x=>x.role),['שם פרטי','שם משפחה']);
  const arik={title:'אריק איינשטיין',nativeNames:['אריק איינשטיין'],nameIds:{given:['Qarik'],family:['Qeinstein']}};
  assert.deepEqual(match(arik,{Qarik:{labels:{he:{value:'אריק'}}},Qeinstein:{labels:{he:{value:'איינשטיין'}}}}).map(x=>x.word),['אריק','איינשטיין']);
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
