import { describe, it, expect } from 'vitest';
import { validateBatch, findDuplicateIds, pickQuestions, similar, type Question, type Attempt } from '@/features/learning/model';
import { cleanOption, pdfInputSchema, preparePdfQuestions } from '@/features/learning/pdf-model';
const base:Question={id:'q1',question:'Which HTML tag is used to create a hyperlink?',options:['<a>','<link>','<href>','<nav>'],correctAnswer:0,explanation:'The a element creates hyperlinks.',topic:'Links',difficulty:'Easy',sourceName:'Test',sourceUrl:'',verification:'manually-imported',createdAt:'2026-10-01T00:00:00Z'};
const make=(i:number,question:string):Question=>({...base,id:`q${i}`,question,options:[`opt${i}a`,`opt${i}b`,`opt${i}c`,`opt${i}d`]});
describe('No repeated questions',()=>{
 it('treats a reworded copy of a bank question as a repeat',()=>{expect(validateBatch([{...base,id:'q2',question:'Which tag in HTML is used for creating a hyperlink?'}],[base]).duplicates).toHaveLength(1);});
 it('keeps genuinely different questions',()=>{expect(validateBatch([{...base,id:'q2',question:'Which HTML tag is used to create a table row?',options:['<tr>','<td>','<th>','<table>']}],[base]).accepted).toHaveLength(1);});
 it('never matches empty text',()=>expect(similar('','')).toBe(false));
 it('finds later repeats and keeps the first copy',()=>{expect(findDuplicateIds([base,{...base,id:'copy',question:'Which HTML tag is used to create hyperlink?'},make(3,'What does the alt attribute describe on images?')])).toEqual(['copy']);});
 it('builds a session with no repeated question',()=>{const pool=[base,{...base,id:'copy'},make(3,'What does the alt attribute describe on images?')];const picked=pickQuestions(pool,[],10,{random:true,fresh:true});expect(picked).toHaveLength(2);});
 it('shows unseen questions before ones already attempted',()=>{const pool=[make(1,'Which element defines a paragraph of text?'),make(2,'Which attribute opens a link in a new tab?'),make(3,'Which element groups form controls together?')];const seen:Attempt={id:'a',createdAt:'2026-10-10T00:00:00Z',mode:'Practice',difficulty:'All',questions:[pool[0]!,pool[1]!],answers:{},correct:0,incorrect:0,unanswered:2,score:0,seconds:1};expect(pickQuestions(pool,[seen],1,{random:true,fresh:true})[0]?.id).toBe('q3');});
});
describe('PDF conversion settings',()=>{
 it('accepts auto mode with per-question difficulty and up to 100 questions',()=>{expect(pdfInputSchema.parse({text:'1. Which tag makes a link? A) a B) p C) b D) i Ans: A',filename:'paper.pdf',mode:'auto',difficulty:'Auto',count:100}).count).toBe(100);expect(()=>pdfInputSchema.parse({text:'x'.repeat(40),filename:'p.pdf',mode:'auto',difficulty:'Auto',count:101})).toThrow();});
 it('keeps the difficulty judged per question when Auto is chosen',()=>{const r=preparePdfQuestions({questions:[{question:'Which element represents a paragraph?',options:['A) <p>','B) <h1>','C) <img>','D) <br>'],correctAnswer:0,explanation:'p is a paragraph.',topic:'Text',difficulty:'Medium'}]},'x.pdf',[],'b','Auto');expect(r.accepted[0]?.difficulty).toBe('Medium');expect(r.accepted[0]?.options[0]).toBe('<p>');});
 it('strips option labels left over from the PDF',()=>{expect(cleanOption('(b) <section>')).toBe('<section>');expect(cleanOption('C. Inline')).toBe('Inline');});
});
