import { describe, it, expect } from 'vitest';
import { checkPdfFile, pdfInputSchema, preparePdfQuestions } from '../features/learning/pdf-model';
const question={question:'Which HTML element represents a paragraph?',options:['<p>','<h1>','<img>','<br>'],correctAnswer:0,explanation:'The p element represents a paragraph.',topic:'Text',difficulty:'Easy'};
describe('PDF question conversion',()=>{
 it('accepts both existing MCQ extraction and notes generation',()=>{for(const mode of ['extract','generate'])expect(pdfInputSchema.parse({text:'HTML paragraphs use the p element. Headings use h1 through h6.',filename:'notes.pdf',mode,difficulty:'Easy',count:10}).mode).toBe(mode);});
 it('attributes converted questions to the uploaded PDF without source-verification claims',()=>{const result=preparePdfQuestions({questions:[question]},'chapter.pdf',[],'batch');expect(result.accepted[0]?.sourceName).toBe('Uploaded PDF: chapter.pdf');expect(result.accepted[0]?.verification).toBe('PDF · AI-processed, needs review');});
 it('rejects incomplete MCQs instead of saving them',()=>expect(preparePdfQuestions({questions:[{...question,options:['<p>','<h1>']}]},'notes.pdf',[],'batch').accepted).toHaveLength(0));
 it('skips PDF questions already present in the bank',()=>{const first=preparePdfQuestions({questions:[question]},'a.pdf',[],'a');expect(preparePdfQuestions({questions:[question]},'b.pdf',first.accepted,'b').duplicates).toHaveLength(1);});
 it('rejects non-PDF files',()=>expect(()=>checkPdfFile({name:'notes.txt',size:100})).toThrow('Choose a PDF'));
});