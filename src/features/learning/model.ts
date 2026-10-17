export const difficulties = ['Easy', 'Medium', 'Advanced'] as const;
export type Difficulty = typeof difficulties[number];
export const TARGET = 500;
export interface Question { id: string; question: string; options: string[]; correctAnswer: number; explanation: string; topic: string; difficulty: Difficulty; sourceName: string; sourceUrl: string; verification: string; createdAt: string }
export interface Attempt { id: string; createdAt: string; mode: 'Practice' | 'Exam'; difficulty: string; questions: Question[]; answers: Record<string, number>; correct: number; incorrect: number; unanswered: number; score: number; seconds: number }
export interface LearningData { questions: Question[]; attempts: Attempt[]; bookmarks: string[] }
export const emptyData: LearningData = { questions: [], attempts: [], bookmarks: [] };
export const normalize = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const STOP_WORDS=new Set('a an the of to in on for is are was were which what whats does do did with and or by as be that this it its from at into following correct true about used use using you your can will would should'.split(' '));
const tokenSet=(normalized:string)=>new Set(normalized.split(' ').filter(t=>t&&!STOP_WORDS.has(t)));
function overlap(a:string,b:string){const x=tokenSet(a),y=tokenSet(b);if(!x.size||!y.size)return 0;const common=[...x].filter(t=>y.has(t)).length;return common/new Set([...x,...y]).size;}
/** Near-duplicate check on normalized question text (ignores filler words). */
export function similar(a: string,b: string) { if (!a||!b) return false; if (a===b) return true; return overlap(a,b) >= .8; }
/** True when two questions ask the same thing: same/near-same text, or very similar text with the same correct answer. */
export function sameQuestion(a:Pick<Question,'question'|'options'|'correctAnswer'>,b:Pick<Question,'question'|'options'|'correctAnswer'>){const x=normalize(a.question),y=normalize(b.question);if(similar(x,y))return true;const ax=normalize(a.options[a.correctAnswer]??''),bx=normalize(b.options[b.correctAnswer]??'');return !!ax&&ax===bx&&overlap(x,y)>=.6;}
/** IDs of later questions that repeat an earlier one (keeps the first copy). */
export function findDuplicateIds(questions:Question[]){const kept:Question[]=[],dupes:string[]=[];for(const q of questions){if(kept.some(k=>sameQuestion(k,q)))dupes.push(q.id);else kept.push(q);}return dupes;}
/** Pick session questions without repeats: unique texts only, never-seen questions first, then the ones seen longest ago. */
export function pickQuestions(available:Question[],attempts:Attempt[],count:number,options:{random:boolean;fresh:boolean}){
 const unique:Question[]=[];for(const q of available){if(!unique.some(u=>u.id===q.id||sameQuestion(u,q)))unique.push(q);}
 const ordered=options.random?shuffle(unique):unique;
 if(!options.fresh)return ordered.slice(0,count);
 const lastSeen=new Map<string,number>();for(const a of attempts){const t=Date.parse(a.createdAt)||0;for(const q of a.questions){const key=normalize(q.question);lastSeen.set(q.id,Math.max(lastSeen.get(q.id)??0,t));lastSeen.set(key,Math.max(lastSeen.get(key)??0,t));}}
 const seenAt=(q:Question)=>Math.max(lastSeen.get(q.id)??0,lastSeen.get(normalize(q.question))??0);
 return ordered.map((q,i)=>({q,i,t:seenAt(q)})).sort((a,b)=>a.t-b.t||a.i-b.i).slice(0,count).map(x=>x.q);
}
export function validateBatch(raw: unknown, existing: Question[]) {
 const rows=Array.isArray(raw)?raw: raw && typeof raw==='object' && 'questions' in raw ? (raw as {questions:unknown}).questions : null;
 if (!Array.isArray(rows)) throw new Error('Expected a question array or { schemaVersion: 1, questions: [...] }.');
 const accepted: Question[]=[], rejected:{index:number;reason:string}[]=[], duplicates:{index:number;reason:string}[]=[];
 const seen=[...existing];
 rows.forEach((item,index)=>{
  if(!item || typeof item!=='object') {rejected.push({index,reason:'Not a question object'});return;}
  const q=item as Question;
  const required=['id','question','explanation','topic','sourceName','verification','createdAt'] as const;
  if(required.some(k=>typeof q[k]!=='string'||!q[k].trim())){rejected.push({index,reason:'Missing ID, question, explanation, topic, source, verification or timestamp'});return;}
  if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(o=>typeof o!=='string'||!o.trim())||new Set(q.options.map(o=>o.trim())).size!==4){rejected.push({index,reason:'Exactly four distinct non-empty options required'});return;}
  if(!Number.isInteger(q.correctAnswer)||q.correctAnswer<0||q.correctAnswer>3){rejected.push({index,reason:'Correct answer index must be 0–3'});return;}
  if(!difficulties.includes(q.difficulty)||!Number.isFinite(Date.parse(q.createdAt))){rejected.push({index,reason:'Invalid difficulty or creation timestamp'});return;}
  if(q.sourceUrl && !/^https?:\/\//.test(q.sourceUrl)){rejected.push({index,reason:'Source URL must use HTTP or HTTPS'});return;}
  if(seen.some(s=>s.id===q.id||sameQuestion(s,q))){duplicates.push({index,reason:'Repeats a question already in the bank (same or near-same question)'});return;}
  if(seen.filter(s=>s.difficulty===q.difficulty).length>=TARGET){rejected.push({index,reason:`${q.difficulty} target of 500 reached`});return;}
  const safe={id:q.id,question:q.question.trim(),options:q.options.map(o=>o.trim()),correctAnswer:q.correctAnswer,explanation:q.explanation.trim(),topic:q.topic.trim(),difficulty:q.difficulty,sourceName:q.sourceName.trim(),sourceUrl:q.sourceUrl||'',verification:q.verification,createdAt:q.createdAt};
  accepted.push(safe);seen.push(safe);
 });
 return { accepted,rejected,duplicates,total:rows.length };
}
export function scoreQuestions(questions:Question[],answers:Record<string,number>) {
 const correct=questions.filter(q=>answers[q.id]===q.correctAnswer).length;
 const unanswered=questions.filter(q=>answers[q.id]===undefined).length;
 return {correct,unanswered,incorrect:questions.length-correct-unanswered,score:questions.length?Math.round(correct/questions.length*10000)/100:0};
}
export function queueIds(data: LearningData,queue:'bookmarked'|'incorrect'|'unanswered') {
 if(queue==='bookmarked') return new Set(data.bookmarks);
 return new Set(data.attempts.flatMap(a=>a.questions.filter(q=>queue==='unanswered'?a.answers[q.id]===undefined:a.answers[q.id]!==undefined&&a.answers[q.id]!==q.correctAnswer).map(q=>q.id)));
}
export function shuffle<T>(items:T[]) { const result=[...items]; for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const a=result[i],b=result[j];if(a!==undefined&&b!==undefined){result[i]=b;result[j]=a;}}return result; }
export function shuffleOptions(q:Question):Question {const indices=shuffle([0,1,2,3]);return {...q,options:indices.map(i=>q.options[i]??''),correctAnswer:indices.indexOf(q.correctAnswer)};}
export function topicStats(attempts:Attempt[]) {const stats:Record<string,{correct:number;total:number}>={}; attempts.forEach(a=>a.questions.forEach(q=>{const entry=stats[q.topic]??{correct:0,total:0};entry.total++;if(a.answers[q.id]===q.correctAnswer)entry.correct++;stats[q.topic]=entry;}));return Object.entries(stats).map(([topic,s])=>({topic,...s,accuracy:Math.round(s.correct/s.total*100)}));}
export function downloadJSON(filename:string,value:unknown) {const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function bankExport(questions:Question[]) { return {schemaVersion:1,exportedAt:new Date().toISOString(),questions}; }
