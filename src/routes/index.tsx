import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/features/learning/dashboard';
export const Route = createFileRoute('/')({
 head:()=>({meta:[{title:'Dashboard — HTML Master Pro'},{name:'description',content:'Your HTML question bank, progress, recent attempts, and next practice session.'},{property:'og:title',content:'Dashboard — HTML Master Pro'},{property:'og:description',content:'Your HTML question bank, progress, recent attempts, and next practice session.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=><Dashboard/>,
});
