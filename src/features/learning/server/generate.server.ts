import { streamText, Output, NoObjectGeneratedError, APICallError } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { createLovableAiGatewayProvider } from './gateway-helpers.server';
import { normalize, validateBatch, type Difficulty, type Question } from '../model';
export async function generate(input:{difficulty:Difficulty;topic:string;batchSize:number},db:SupabaseClient<Database>,userId:string){
 const {data:isAdmin,error:roleError}=await db.rpc('has_role',{_user_id:userId,_role:'admin'});if(roleError||isAdmin!==true)return {error:'Only the admin can generate questions.',questions:[],rejected:0,duplicates:0};
 const {data:state,error:stateError}=await db.from('html_ai_state').select('*').eq('owner_id',userId).maybeSingle();if(stateError)return {error:stateError.message,questions:[],rejected:0,duplicates:0};if(state?.blocked)return {error:state.message,questions:[],rejected:0,duplicates:0};
 const key=process.env['LOVABLE_API_KEY'];if(!key)return {error:'AI generation is not configured. JSON import remains available.',questions:[],rejected:0,duplicates:0};
 const {data:existing,error}=await db.from('html_questions').select('*').range(0,1999);if(error)return {error:error.message,questions:[],rejected:0,duplicates:0};
 const bank:Question[]=(existing||[]).map(r=>({id:r.id,question:r.question,options:r.options as string[],correctAnswer:r.correct_answer,explanation:r.explanation,topic:r.topic,difficulty:r.difficulty as Difficulty,sourceName:r.source_name,sourceUrl:r.source_url,verification:r.verification,createdAt:r.created_at}));
 const size=Math.min(input.batchSize,500-bank.filter(q=>q.difficulty===input.difficulty).length);if(size<=0)return {error:'Difficulty target reached: 500 valid questions.',questions:[],rejected:0,duplicates:0};
  const provider=createLovableAiGatewayProvider(key,undefined,{baseURL:'https://ai.gateway.lovable.dev/v1',structuredOutputs:true});
 const schema=z.object({questions:z.array(z.object({question:z.string(),options:z.array(z.string()),correctAnswer:z.number(),explanation:z.string(),topic:z.string()}))});
 try{
  const result=streamText({model:provider('google/gemini-3.8-flash'),maxRetries:0,output:Output.object({schema}),prompt:`Create exactly ${size} original, factually precise ${input.difficulty} HTML MCQs about ${input.topic}. Each must test a different concept or angle; never repeat or reword the same question. Each needs exactly four distinct nonempty options without A)/B) labels, correctAnswer integer 0-3, and topic. The explanation must teach in simple English in 3-5 sentences: why the correct answer is right, then briefly why each other option is wrong, with a tiny HTML example when helpful. Include realistic debugging/code snippets when relevant. Based on standard HTML concepts covered by W3Schools HTML curriculum; no claim of browsing or source verification. Output JSON. Avoid these existing question texts: ${bank.map(q=>q.question).join('\n')}.`});
  let output:unknown;
  try{output=await result.output;}catch(e){if(NoObjectGeneratedError.isInstance(e)){try{output=JSON.parse(e.text??'');}catch{return {error:'Gemini returned malformed JSON. No questions saved; import remains available.',questions:[],rejected:size,duplicates:0};}}else throw e;}
  const parsed=schema.safeParse(output);if(!parsed.success)return {error:'Generated batch did not match the question schema. Nothing saved.',questions:[],rejected:size,duplicates:0};
  const candidates=parsed.data.questions.slice(0,size).map(q=>({...q,id:crypto.randomUUID(),difficulty:input.difficulty,sourceName:'Gemini-generated · W3Schools curriculum alignment',sourceUrl:'https://www.w3schools.com/html/default.asp',verification:'AI-generated',createdAt:new Date().toISOString()}));
  const valid=validateBatch(candidates,bank);
  if(valid.accepted.length){const {error:saveError}=await db.from('html_questions').insert(valid.accepted.map(q=>({id:q.id,owner_id:userId,question:q.question,options:q.options,correct_answer:q.correctAnswer,explanation:q.explanation,topic:q.topic,difficulty:q.difficulty,source_name:q.sourceName,source_url:q.sourceUrl,verification:q.verification,normalized:normalize(q.question),created_at:q.createdAt})));if(saveError)throw new Error(saveError.message);}
  await db.from('html_ai_jobs').insert({owner_id:userId,status:'completed',difficulty:input.difficulty,requested:size,accepted:valid.accepted.length,rejected:valid.rejected.length,duplicates:valid.duplicates.length});
  return {error:'',questions:valid.accepted,rejected:valid.rejected.length,duplicates:valid.duplicates.length};
 }catch(e){let status=500,message=e instanceof Error?e.message:'Generation failed';if(APICallError.isInstance(e)){status=e.statusCode||500;try{const body=JSON.parse(e.responseBody||'{}');message=body.message||body.error?.message||message;}catch{}}
  if(status===402||status===403)await db.from('html_ai_state').upsert({owner_id:userId,blocked:true,message,status});
  await db.from('html_ai_jobs').insert({owner_id:userId,status:'failed',difficulty:input.difficulty,requested:size,message});
  return {error:message,questions:[],rejected:0,duplicates:0};
 }
}
