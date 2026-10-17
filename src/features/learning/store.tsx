import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { emptyData, validateBatch, normalize, type LearningData, type Question, type Attempt } from './model';
import { toast } from 'sonner';
const LOCAL_KEY='html-master-pro-demo-v1';
type Store = { data:LearningData; loading:boolean; user:User|null; isAdmin:boolean; storage:'local'|'cloud'; error:string; addQuestions:(questions:Question[])=>Promise<void>; updateQuestion:(q:Question)=>Promise<void>; deleteQuestion:(id:string)=>Promise<void>; deleteQuestions:(ids:string[])=>Promise<void>; saveAttempt:(a:Attempt)=>Promise<void>; deleteAttempt:(id:string)=>Promise<void>; bookmark:(id:string)=>Promise<void>; reset:()=>Promise<void> };
const Context=createContext<Store|null>(null);
const toRow=(q:Question,userId:string)=>({id:q.id,owner_id:userId,question:q.question,options:q.options,correct_answer:q.correctAnswer,explanation:q.explanation,topic:q.topic,difficulty:q.difficulty,source_name:q.sourceName,source_url:q.sourceUrl,verification:q.verification,normalized:normalize(q.question),created_at:q.createdAt});
async function loadSharedBank():Promise<Question[]>{
 const rows=[];
 for(let from=0;from<3000;from+=1000){const {data,error}=await supabase.from('html_questions').select('*').order('created_at').order('id').range(from,from+999);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<1000)break;}
 return rows.map(r=>({id:r.id,question:r.question,options:r.options as string[],correctAnswer:r.correct_answer,explanation:r.explanation,topic:r.topic,difficulty:r.difficulty as Question['difficulty'],sourceName:r.source_name,sourceUrl:r.source_url,verification:r.verification,createdAt:r.created_at}));
}
function readLocalProgress():Pick<LearningData,'attempts'|'bookmarks'>{
 const text=localStorage.getItem(LOCAL_KEY);if(!text)return {attempts:[],bookmarks:[]};
 const parsed=JSON.parse(text) as Partial<LearningData>;
 if(!Array.isArray(parsed.attempts)||!Array.isArray(parsed.bookmarks))throw new Error('Saved progress in this browser is malformed. Export a backup before resetting.');
 return {attempts:parsed.attempts,bookmarks:parsed.bookmarks.filter((b):b is string=>typeof b==='string')};
}
export function LearningProvider({children}:{children:ReactNode}) {
 const [data,setData]=useState<LearningData>(emptyData),[user,setUser]=useState<User|null>(null),[isAdmin,setIsAdmin]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const current=useRef(data);current.current=data;
 const loadId=useRef(0);
 const userRef=useRef<User|null>(null);userRef.current=user;
 useEffect(()=>{
  let alive=true;
  async function load(u:User|null){const id=++loadId.current;setLoading(true);setError('');setUser(u);try{
   const questions=await loadSharedBank();let admin=false,progress:Pick<LearningData,'attempts'|'bookmarks'>;
   if(u){const [a,b,role]=await Promise.all([supabase.from('html_attempts').select('*').order('created_at',{ascending:false}),supabase.from('html_bookmarks').select('*'),supabase.rpc('has_role',{_user_id:u.id,_role:'admin'})]);if(a.error||b.error)throw a.error||b.error;admin=role.data===true;progress={attempts:(a.data||[]).map(r=>r.payload as unknown as Attempt),bookmarks:(b.data||[]).map(r=>r.question_id)};}
   else progress=readLocalProgress();
   if(alive&&id===loadId.current){setIsAdmin(admin);setData({questions,...progress});}
  }catch(e){if(alive&&id===loadId.current){setError(e instanceof Error?e.message:'Could not load saved data');setIsAdmin(false);setData(emptyData);}}finally{if(alive&&id===loadId.current)setLoading(false);}}
  void supabase.auth.getSession().then(({data})=>load(data.session?.user??null));
  const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)&&(session?.user?.id??null)!==(userRef.current?.id??null))void load(session?.user??null);});
  return()=>{alive=false;listener.subscription.unsubscribe();};
 },[]);
 function commit(next:LearningData){if(!user){try{localStorage.setItem(LOCAL_KEY,JSON.stringify({questions:[],attempts:next.attempts,bookmarks:next.bookmarks}));}catch{throw new Error('Unable to save: browser storage is full or unavailable. Export a backup.');}}current.current=next;setData(next);}
 function requireAdmin(){if(!user||!isAdmin)throw new Error('Only the admin can change the question bank.');return user;}
 async function addQuestions(questions:Question[]){const admin=requireAdmin();const result=validateBatch(questions,current.current.questions);if(result.rejected.length||result.duplicates.length)throw new Error('Bank changed: re-preview the import before saving.');const {error}=await supabase.from('html_questions').insert(questions.map(q=>toRow(q,admin.id)));if(error)throw new Error(error.message);commit({...current.current,questions:[...current.current.questions,...questions]});}
 async function updateQuestion(q:Question){const admin=requireAdmin();const result=validateBatch([q],current.current.questions.filter(s=>s.id!==q.id));if(!result.accepted.length)throw new Error(result.rejected[0]?.reason||result.duplicates[0]?.reason||'Duplicate question');const {error}=await supabase.from('html_questions').update(toRow(q,admin.id)).eq('id',q.id);if(error)throw new Error(error.message);commit({...current.current,questions:current.current.questions.map(s=>s.id===q.id?q:s)});}
 async function deleteQuestions(ids:string[]){requireAdmin();if(!ids.length)return;for(let i=0;i<ids.length;i+=100){const {error}=await supabase.from('html_questions').delete().in('id',ids.slice(i,i+100));if(error)throw new Error(error.message);}const gone=new Set(ids);commit({...current.current,questions:current.current.questions.filter(q=>!gone.has(q.id)),bookmarks:current.current.bookmarks.filter(b=>!gone.has(b))});}
 async function deleteQuestion(id:string){await deleteQuestions([id]);}
 async function saveAttempt(a:Attempt){if(current.current.attempts.some(s=>s.id===a.id))return;if(user){const {error}=await supabase.from('html_attempts').insert({id:a.id,owner_id:user.id,payload:JSON.parse(JSON.stringify(a))});if(error)throw new Error(error.message);}commit({...current.current,attempts:[a,...current.current.attempts]});}
 async function deleteAttempt(id:string){if(user){const {error}=await supabase.from('html_attempts').delete().eq('id',id);if(error)throw new Error(error.message);}commit({...current.current,attempts:current.current.attempts.filter(a=>a.id!==id)});}
 async function bookmark(id:string){const exists=current.current.bookmarks.includes(id);if(user){const result=exists?await supabase.from('html_bookmarks').delete().eq('question_id',id):await supabase.from('html_bookmarks').insert({owner_id:user.id,question_id:id});if(result.error){toast.error(result.error.message);return;}}try{commit({...current.current,bookmarks:exists?current.current.bookmarks.filter(b=>b!==id):[...current.current.bookmarks,id]});}catch(e){toast.error(String(e));}}
 /** Clears only this person's own progress (attempts and bookmarks); the shared bank is untouched. */
 async function reset(){if(user){for(const table of ['html_bookmarks','html_attempts'] as const){const {error}=await supabase.from(table).delete().eq('owner_id',user.id);if(error)throw new Error(error.message);}}commit({...current.current,attempts:[],bookmarks:[]});}
 return <Context.Provider value={{data,user,isAdmin,loading,error,storage:user?'cloud':'local',addQuestions,updateQuestion,deleteQuestion,deleteQuestions,saveAttempt,deleteAttempt,bookmark,reset}}>{children}</Context.Provider>;
}
export function useLearning(){const value=useContext(Context);if(!value)throw new Error('LearningProvider required');return value;}
