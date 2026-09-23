import test from 'node:test';
import assert from 'node:assert/strict';
import {hebrewWordSense,biographyOriginExcerpt} from './name-gloss.mjs';
import {missingDisplayedNameParts} from './artist-data.mjs';

test('a name that is also a Hebrew word gets a short sourced word meaning',()=>{
  const entry='==שָׁלוֹם==\n# [[שלווה]], [[מנוחה]], [[שקט]].\n#:* דוגמה\n# מצב של [[ידידות]] בין אנשים.\n# שם פרטי לזכר.\n===גיזרון===';
  assert.equal(hebrewWordSense(entry),'שלווה, מנוחה, שקט.');
});

test('a word without a documented name sense is not treated as a name meaning',()=>{
  assert.equal(hebrewWordSense('==מילה==\n# [[חפץ]] המשמש ביום יום.'),null);
});

test('ambiguous or formatted definitions are left for the reader to inspect',()=>{
  assert.equal(hebrewWordSense('==שם==\n# {{פירושונים|מילה}}\n# שם פרטי לזכר.'),null);
  assert.equal(hebrewWordSense('==שם==\n# שם פרטי לזכר.'),null);
});

test('a missing Wikidata family claim leaves the visible component unclassified',()=>{
  const artist={title:'יהודה פוליקר',nameIds:{given:['Qyehuda'],family:[]}};
  const parts=[{id:'Qyehuda',role:'שם פרטי',word:'יהודה',english:'Judah'}];
  assert.deepEqual(missingDisplayedNameParts(artist,parts),[{word:'פוליקר',role:'רכיב נוסף בשם'}]);
  assert.deepEqual(missingDisplayedNameParts({...artist,nameIds:{given:['Qyehuda'],family:['Qother']}},parts),[]);
  assert.deepEqual(missingDisplayedNameParts({...artist,title:'יהודה'},parts),[]);
});

test('a biographical origin is shown only as a qualified excerpt about the same name',()=>{
  const text='יהודה פוליקר.\n== ביוגרפיה ==\nייתכן שמקור שם המשפחה פוליקריס שהפך בישראל ל"פוליקר" הוא ביישוב "פולגר" מצפון קסטיליה. או בשם יווני אחר. יתר חייו ומוזיקתו.';
  assert.match(biographyOriginExcerpt(text,'פוליקר'),/^ייתכן שמקור שם המשפחה/);
  assert.equal(biographyOriginExcerpt(text,'דוכין'),null);
  assert.equal(biographyOriginExcerpt('מקור שם המשפחה פוליקר הוא ביישוב דמיוני.','פוליקר'),null);
});
