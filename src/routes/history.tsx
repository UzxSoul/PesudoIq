import { createFileRoute } from '@tanstack/react-router';
import { HistoryPage } from '@/features/learning/progress-pages';
export const Route = createFileRoute('/history')({
 head:()=>({meta:[{title:'Test History — HTML Master Pro'},{name:'description',content:'Review your saved HTML test attempts and retake a session.'},{property:'og:title',content:'Test History — HTML Master Pro'},{property:'og:description',content:'Review your saved HTML test attempts and retake a session.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=><HistoryPage/>,
});
