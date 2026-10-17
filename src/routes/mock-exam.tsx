import { createFileRoute } from '@tanstack/react-router';
import { QuizPage } from '@/features/learning/quiz';
export const Route = createFileRoute('/mock-exam')({
 head:()=>({meta:[{title:'Mock Exam — HTML Master Pro'},{name:'description',content:'Take timed HTML exams and review your results after submission.'},{property:'og:title',content:'Mock Exam — HTML Master Pro'},{property:'og:description',content:'Take timed HTML exams and review your results after submission.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:()=><QuizPage exam/>,
});
