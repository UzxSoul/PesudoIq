import { createFileRoute } from '@tanstack/react-router';
import { RevisionPage } from '@/features/learning/progress-pages';
export const Route = createFileRoute('/revision')({
 head:()=>({meta:[{title:'Revision Centre — HTML Master Pro'},{name:'description',content:'Revisit bookmarked, incorrect, and unanswered HTML questions.'},{property:'og:title',content:'Revision Centre — HTML Master Pro'},{property:'og:description',content:'Revisit bookmarked, incorrect, and unanswered HTML questions.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=><RevisionPage/>,
});
