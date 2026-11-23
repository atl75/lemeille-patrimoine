import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { isAdmin } from "@/lib/adminGuard";
import { readJSON } from "@/lib/utils";

export async function GET(req: NextRequest) {
 if (!isAdmin(req)) return NextResponse.json({error:"Non autorisé"}, {status:401});
 const id = req.nextUrl.searchParams.get("id");
 if (!id) return NextResponse.json({error:"Identifiant manquant"}, {status:400});
 const delegations = await readJSON("delegations-mandats.json");
 const d = (Array.isArray(delegations) ? delegations : []).find((x:any)=>x.id===id);
 if(!d) return NextResponse.json({error:"Délégation introuvable"},{status:404});
 const mandats = await readJSON("mandats.json");
 const mandate = (Array.isArray(mandats) ? mandats : []).find((x:any)=>x.id===d.mandatId);
 const pdf = await PDFDocument.create();
 const page = pdf.addPage([595,842]);
 const font = await pdf.embedFont(StandardFonts.Helvetica);
 const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
 const clean = (v: unknown) => String(v ?? "—").normalize("NFC").replace(/[\u2018\u2019]/g,"'").replace(/[\u2013\u2014]/g,"-").replace(/[^\u0020-\u00FF]/g," ");
 let y=790;
 const line = (value:string,strong=false,size=11) => {
   const f=strong?bold:font;
   const words=value.split(/\s+/);
   let current="";
   for(const word of words) {
     const candidate=current?current+" "+word:word;
     if(f.widthOfTextAtSize(candidate,size)>495 && current) {page.drawText(clean(current),{x:50,y,size,font:f,color:rgb(.13,.23,.18)});y-=18;current=word;}
     else current=candidate;
   }
   if(current) {page.drawText(clean(current),{x:50,y,size,font:f,color:rgb(.13,.23,.18)});y-=18;}
 };
 line("LEMEILLE PATRIMOINE — PROJET DE DÉLÉGATION",true,16);y-=10;
 line("DOCUMENT DE TRAVAIL - NON SIGNÉ - À VÉRIFIER AVANT UTILISATION",true,10);y-=20;
 line("Mandat d'origine : "+(mandate?.mandateNumber||d.mandateNumber),true);
 line("Bien : "+(mandate?.designation||mandate?.title||d.propertyTitle));
 line("Mandant(s) : "+(mandate?.owners||[]).map((o:any)=>o.type==="COMPANY"?o.name:[o.firstName,o.lastName].filter(Boolean).join(" ")).join(", "));
 y-=16;line("Partenaire délégataire",true,13);
 line("Raison sociale : "+d.partnerName);
 line("SIREN : "+d.partnerSiren+" - Carte professionnelle : "+d.partnerCard);
 line("Représentant : "+d.representative);
 line("Adresse : "+d.partnerAddress);
 line("Contact : "+d.partnerEmail+" / "+d.partnerPhone);
 y-=16;line("Conditions envisagées",true,13);
 line("Périmètre : "+d.scope);
 line("Territoire : "+d.territory);
 line("Du "+(d.startDate||"à préciser")+" au "+(d.endDate||"à préciser"));
 line("Part des honoraires au délégataire : "+d.feeSharePercent+" %");
 line("Conditions complémentaires : "+d.feeNotes);
 y-=20;line("Ce projet ne constitue pas une délégation signée ni une preuve d'habilitation.",false,9);
 line("Vérifier le mandat initial, les habilitations et la rédaction contractuelle.",false,9);
 const bytes=await pdf.save();
 return new NextResponse(bytes as any, { headers: {"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="projet-delegation.pdf"',"Cache-Control":"private, no-store"}});
}
