import test from 'node:test';
import assert from 'node:assert/strict';
import {hebrewWordSense} from './name-gloss.mjs';

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
