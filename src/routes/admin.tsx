import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '@/features/learning/admin';
export const Route = createFileRoute('/admin')({
 head:()=>({meta:[{title:'Admin & Settings — HTML Master Pro'},{name:'description',content:'Manage HTML question generation, curriculum sources, and workspace backups.'},{property:'og:title',content:'Admin & Settings — HTML Master Pro'},{property:'og:description',content:'Manage HTML question generation, curriculum sources, and workspace backups.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=><AdminPage/>,
});
