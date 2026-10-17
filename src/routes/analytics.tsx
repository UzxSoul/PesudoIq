import { createFileRoute } from '@tanstack/react-router';
import { AnalyticsPage } from '@/features/learning/progress-pages';
export const Route = createFileRoute('/analytics')({
 head:()=>({meta:[{title:'Learning Analytics — HTML Master Pro'},{name:'description',content:'Explore actual HTML score trends and topic-level performance.'},{property:'og:title',content:'Learning Analytics — HTML Master Pro'},{property:'og:description',content:'Explore actual HTML score trends and topic-level performance.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=><AnalyticsPage/>,
});
