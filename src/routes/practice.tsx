import { createFileRoute } from '@tanstack/react-router';
import { QuizPage } from '@/features/learning/quiz';
export const Route = createFileRoute('/practice')({
 head:()=>({meta:[{title:'Practice — HTML Master Pro'},{name:'description',content:'Practice HTML questions with instant explanations and a flexible study pace.'},{property:'og:title',content:'Practice — HTML Master Pro'},{property:'og:description',content:'Practice HTML questions with instant explanations and a flexible study pace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=><QuizPage/>,
});
