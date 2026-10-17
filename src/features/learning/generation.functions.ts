import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const generateBatch=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({difficulty:z.enum(['Easy','Medium','Advanced']),topic:z.string().min(1).max(100),batchSize:z.number().int().min(1).max(50)})).handler(async({data,context})=>{const {generate}=await import('./server/generate.server');return generate(data,context.supabase,context.userId);});
