import { checkPdfFile } from './pdf-model';
export async function readPdf(file:File,onProgress:(page:number,total:number)=>void){
 checkPdfFile(file);
 const pdfjs=await import('pdfjs-dist');
 const {default:worker}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
 pdfjs.GlobalWorkerOptions.workerSrc=worker;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
 const pdf=await task.promise;
 try{
  if(pdf.numPages>50)throw new Error('Choose a PDF with up to 50 pages, or split the document first.');
  const pages:string[]=[];
  for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();pages.push(`Page ${n}\n`+content.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join(''));onProgress(n,pdf.numPages);}
  const text=pages.join('\n\n');
  if(text.replace(/Page \d+/g,'').trim().length<30)throw new Error('No readable text found. Scanned/image-only PDFs need text recognition first.');
  if(text.length>80000)throw new Error('This PDF contains too much text. Split it into smaller PDFs.');
  return text;
 }finally{await task.destroy();}
}