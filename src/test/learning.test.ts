import { describe,it,expect } from 'vitest';
import { validateBatch, scoreQuestions, queueIds, shuffleOptions, bankExport, TARGET, type Question, type Attempt } from '@/features/learning/model';
import starter from '@/features/learning/starter.json';
const questions=starter as Question[];
function getQuestion(index:number):Question {const value=questions[index];if(!value)throw new Error("Starter question missing");return value;}
const q=getQuestion(0);
function attempt(answers:Record<string,number>):Attempt{return {id:'attempt-1',createdAt:'2026-10-09',mode:'Exam',difficulty:'All',questions:questions.slice(0,3),answers,...scoreQuestions(questions.slice(0,3),answers),seconds:10};}
describe('HTML learning rules',()=>{
 it('sets 500 per difficulty and accepts the built-in HTML question set',()=>{expect(TARGET).toBe(500);const v=validateBatch(questions,[]);expect(v.rejected).toHaveLength(0);expect(v.accepted).toHaveLength(496);expect(v.accepted.filter(q=>q.difficulty==='Easy')).toHaveLength(157);expect(v.accepted.filter(q=>q.difficulty==='Medium')).toHaveLength(163);expect(v.accepted.filter(q=>q.difficulty==='Advanced')).toHaveLength(176);});
 it('rejects duplicate IDs',()=>{expect(validateBatch([{...q,question:'A different unique HTML question'}],[q]).duplicates).toHaveLength(1);});
 it('rejects normalized duplicate question text',()=>{expect(validateBatch([{...q,id:'new',question:q.question.toUpperCase()+'!!!'}],[q]).duplicates).toHaveLength(1);});
 it('detects near duplicate text',()=>{expect(validateBatch([{...q,id:'new',question:q.question+' now'}],[q]).duplicates).toHaveLength(1);});
 it('requires exactly four nonempty options',()=>{expect(validateBatch([{...q,options:['a','b','c']}],[]).rejected).toHaveLength(1);expect(validateBatch([{...q,options:['a','b','c','']}],[]).rejected).toHaveLength(1);});
 it('rejects correct indices outside 0–3',()=>{expect(validateBatch([{...q,correctAnswer:4}],[]).rejected).toHaveLength(1);});
 it('requires explanations',()=>{expect(validateBatch([{...q,explanation:''}],[]).rejected).toHaveLength(1);});
 it('requires topics',()=>{expect(validateBatch([{...q,topic:''}],[]).rejected).toHaveLength(1);});
 it('requires valid difficulties',()=>{expect(validateBatch([{...q,difficulty:'Hard'}],[]).rejected).toHaveLength(1);});
 it('prevents exceeding 500 questions per difficulty',()=>{const existing=Array.from({length:500},(_,i)=>({...q,id:`id-${i}`,question:`Distinct bank row ${i}`}));expect(validateBatch([q],existing).rejected[0]?.reason).toBe('Easy target of 500 reached');});
 it('scores correct, incorrect, unanswered independently',()=>{const qs=[getQuestion(0),getQuestion(1),getQuestion(2)] as [Question,Question,Question];expect(scoreQuestions(qs,{[qs[0].id]:qs[0].correctAnswer,[qs[1].id]:(qs[1].correctAnswer+1)%4})).toEqual({correct:1,incorrect:1,unanswered:1,score:33.33});});
 it('answer changes replace earlier selection',()=>{const answers={[q.id]:(q.correctAnswer+1)%4};answers[q.id]=q.correctAnswer;expect(scoreQuestions([q],answers).score).toBe(100);});
 it('bookmarked queue excludes incorrect and unanswered categories',()=>{const data={questions,bookmarks:[q.id],attempts:[attempt({})]};expect([...queueIds(data,'bookmarked')]).toEqual([q.id]);});
 it('incorrect queue excludes unanswered questions',()=>{const a=attempt({[q.id]:(q.correctAnswer+1)%4});expect([...queueIds({questions,bookmarks:[],attempts:[a]},'incorrect')]).toEqual([q.id]);});
 it('unanswered queue excludes incorrect and correct answers',()=>{const a=attempt({[q.id]:(q.correctAnswer+1)%4});expect([...queueIds({questions,bookmarks:[],attempts:[a]},'unanswered')]).toEqual([getQuestion(1).id,getQuestion(2).id]);});
 it('shuffled options preserve the correct answer identity',()=>{const s=shuffleOptions(q);expect(s.options[s.correctAnswer]).toBe(q.options[q.correctAnswer]);});
 it('exports a stable versioned schema that validates again',()=>{const result=bankExport(questions);expect(result.schemaVersion).toBe(1);expect(validateBatch(JSON.parse(JSON.stringify(result)),[]).accepted).toHaveLength(30);});
});
