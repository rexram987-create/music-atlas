import test from 'node:test';
import assert from 'node:assert/strict';
import {biographyExcerpt} from './biography.mjs';

test('uses five complete biographical sentences and does not copy later sections',()=>{
  const article='יהודה פוליקר הוא זמר ישראלי. הוא הוביל את להקת בנזין. בהמשך פתח בקריירת סולו. יצירתו משלבת רוק ומוזיקה יוונית. הוא הלחין גם לאמנים אחרים.\n== ביוגרפיה ==\nפרט מאוחר שלא צריך להיכלל.';
  assert.equal(biographyExcerpt(article,'','יהודה פוליקר','he'),'יהודה פוליקר הוא זמר ישראלי. הוא הוביל את להקת בנזין. בהמשך פתח בקריירת סולו. יצירתו משלבת רוק ומוזיקה יוונית. הוא הלחין גם לאמנים אחרים.');
});

test('short introduction may be completed by the first biography paragraph, without a caption',()=>{
  const article='ארקדי דוכין הוא זמר ישראלי. היה סולן החברים של נטאשה. הוא הלחין שירים רבים.\n== ביוגרפיה ==\nארקדי דוכין, 2003\n\nארקדי דוכין נולד בבוברויסק למשפחה מוזיקלית. בילדותו למד לנגן בגיטרה. הוא עלה לישראל עם משפחתו.\n== דיסקוגרפיה ==\nאלבום אולפן.';
  assert.equal(biographyExcerpt(article,'','ארקדי דוכין','he'),'ארקדי דוכין הוא זמר ישראלי. היה סולן החברים של נטאשה. הוא הלחין שירים רבים. ארקדי דוכין נולד בבוברויסק למשפחה מוזיקלית. בילדותו למד לנגן בגיטרה.');
});

test('a short source stays short instead of inventing sentences, and summary is a fallback',()=>{
  assert.equal(biographyExcerpt('אמן הוא מלחין. פרסם יצירה אחת.','','אמן','he'),'אמן הוא מלחין. פרסם יצירה אחת.');
  assert.equal(biographyExcerpt('', 'אמן הוא מלחין.', 'אמן','he'),'אמן הוא מלחין.');
  assert.equal(biographyExcerpt('', '', 'אמן','he'),null);
});

test('does not treat an English title abbreviation as a separate sentence',()=>{
  const article='Dr. Dre is an American rapper. He produced records. He founded Aftermath. He worked with Eminem. He won awards. Later work is omitted.';
  assert.equal(biographyExcerpt(article,'','Dr. Dre','en'),'Dr. Dre is an American rapper. He produced records. He founded Aftermath. He worked with Eminem. He won awards.');
});
