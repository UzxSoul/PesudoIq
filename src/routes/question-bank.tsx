import { createFileRoute } from '@tanstack/react-router';
import { BankPage } from '@/features/learning/bank';
export const Route = createFileRoute('/question-bank')({
 head:()=>({meta:[{title:'Question Bank — HTML Master Pro'},{name:'description',content:'Search, validate, import, export, and manage your HTML question collection.'},{property:'og:title',content:'Question Bank — HTML Master Pro'},{property:'og:description',content:'Search, validate, import, export, and manage your HTML question collection.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=><BankPage/>,
});
