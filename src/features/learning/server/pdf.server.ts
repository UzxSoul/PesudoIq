import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, Output, APICallError, NoObjectGeneratedError } from 'ai';
import { pdfInputSchema, pdfOutputSchema, preparePdfQuestions, pdfInstructions } from '../pdf-model';
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, getLovableAiGatewayResponseHeaders } from './run-id';
export async function convertPdf(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return Response.json({error:'Sign in to convert a PDF into MCQs.'},{status:401});
 const url=process.env['SUPABASE_URL'],pub=process.env['SUPABASE_PUBLISHABLE_KEY'],key=process.env['LOVABLE_API_KEY'];
 if(!url||!pub||!key)return Response.json({error:'PDF conversion is not configured.'},{status:503});
 const db=createClient<Database>(url,pub,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:(input,init)=>{const headers=new Headers(init?.headers);headers.set('apikey',pub);return fetch(input,{...init,headers});}}});
 const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth.user)return Response.json({error:'Your session expired. Sign in again.'},{status:401});
  const userId=auth.user.id;
  const {data:isAdmin,error:roleError}=await db.rpc('has_role',{_user_id:userId,_role:'admin'});
  if(roleError)return Response.json({error:'Could not check admin access.'},{status:503});
  if(isAdmin!==true)return Response.json({error:'Only the admin can convert PDFs into questions.'},{status:403});
  const {data:state,error:stateError}=await db.from('html_ai_state').select('*').eq('owner_id',userId).maybeSingle();
 if(stateError)return Response.json({error:'Could not check AI access.'},{status:503});
 if(state?.blocked)return Response.json({error:state.message},{status:state.status||403});
 let input;
 try{if(Number(request.headers.get('content-length')||0)>400000)throw new Error();input=pdfInputSchema.parse(await request.json());}catch{return Response.json({error:'Choose a readable PDF and valid conversion settings.'},{status:400});}
 const gateway=createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
 let upstreamStatus=200,upstreamMessage='',settleHeaders:()=>void=()=>{};
 const ready=new Promise<void>(resolve=>{settleHeaders=resolve;});
 const provider=createOpenAI({baseURL:'https://ai.gateway.lovable.dev/v1',apiKey:key,headers:{'Lovable-API-Key':key,'X-Lovable-AIG-SDK':'vercel-ai-sdk'},fetch:async(i,init)=>{try{const response=await gateway.fetch(i,init);upstreamStatus=response.status;if(!response.ok){try{const b=await response.clone().json() as {message?:string;error?:{message?:string}};upstreamMessage=b.message||b.error?.message||'PDF conversion failed.';}catch{upstreamMessage='PDF conversion failed.';}}return response;}finally{settleHeaders();}}});
 const encoder=new TextEncoder();let failure:unknown;const batchId=crypto.randomUUID();const cancellation=new AbortController();request.signal.addEventListener('abort',()=>cancellation.abort(),{once:true});
 const result=streamText({model:provider.responses('openai/gpt-6-astra'),maxRetries:0,abortSignal:cancellation.signal,output:Output.object({schema:pdfOutputSchema}),providerOptions:{openai:{forceReasoning:true,reasoningEffort:'medium',reasoningSummary:'auto',store:false,include:['reasoning.encrypted_content']}},instructions:pdfInstructions(input),messages:[{role:'user',content:`PDF file: ${input.filename}\n\n<pdf_text>\n${input.text}\n</pdf_text>`}],onError:({error})=>{failure=error;settleHeaders();}});
 const body=new ReadableStream<Uint8Array>({async start(controller){const send=(event:unknown)=>controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));try{
  for await(const partial of result.partialOutputStream)send({type:'preview',questions:partial.questions||[]});
  if(failure)throw failure;
  if(await result.finishReason==='content-filter')throw new Error('The provider declined this PDF conversion.');
  let output:unknown;
  try{output=await result.output;}catch(e){if(NoObjectGeneratedError.isInstance(e)){try{output=JSON.parse(e.text??'');}catch{throw new Error('The PDF could not be converted into valid MCQs. Nothing saved.');}}else throw e;}
  const parsed=pdfOutputSchema.parse(output);parsed.questions=parsed.questions.slice(0,input.count);
  const valid=preparePdfQuestions(parsed,input.filename,[],batchId,input.difficulty);
  await db.from('html_ai_jobs').insert({owner_id:userId,status:'completed',difficulty:input.difficulty==='Auto'?'Mixed':input.difficulty,requested:input.count,accepted:0,rejected:valid.rejected.length,duplicates:valid.duplicates.length,message:`PDF preview: ${valid.accepted.length} ready for review; not saved`});
  send({type:'done',...valid});
  }catch(e){const status=APICallError.isInstance(e)?e.statusCode||500:upstreamStatus>=400?upstreamStatus:500;const message=upstreamMessage|| (e instanceof Error?e.message:'PDF conversion failed.');if(status===402||status===403)await db.from('html_ai_state').upsert({owner_id:userId,blocked:true,message,status});if(!cancellation.signal.aborted)send({type:'error',error:message,status});}finally{settleHeaders();if(!cancellation.signal.aborted)controller.close();}},cancel(){cancellation.abort();}});
 await ready;
 return new Response(body,{status:request.signal.aborted?499:upstreamStatus,headers:getLovableAiGatewayResponseHeaders(gateway.getRunId()?{'X-Lovable-AIG-Run-ID':gateway.getRunId()??''}:undefined,{'Content-Type':'application/x-ndjson','Cache-Control':'no-cache, no-transform'})});
}