import { createFileRoute } from '@tanstack/react-router';
import { convertPdf } from '@/features/learning/server/pdf.server';
export const Route=createFileRoute('/api/pdf-mcq')({server:{handlers:{POST:({request})=>convertPdf(request)}}});