import {createHash} from 'node:crypto';

// Empreinte du contenu métier, pas une signature cryptographique qualifiée du PDF.
export function versionDocumentSignature(record:any, avenant?:any):string {
  const {signers,mandate,mandateSignature,mandateSignStatus,mandateSignToken,mandateSignerName,mandateSignerEmail,avenants,...document}=record;
  const nettoie=(value:any):any=>Array.isArray(value)?value.map(nettoie):value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,nettoie(value[k])])):value;
  const annexe=avenant ? (({signers,signStatus,...rest}:any)=>rest)(avenant):null;
  // Le rendu historique emploie le jour courant quand une date n'est pas fixée.
  const jour=new Date().toISOString().slice(0,10);
  return 'v1:'+createHash('sha256').update(JSON.stringify(nettoie({document,annexe,jour}))).digest('hex');
}

export function versionSignatureValide(body:any,record:any,avenant?:any):boolean {
  return typeof body?.documentVersion==='string' && body.documentVersion===versionDocumentSignature(record,avenant);
}

/** Décodage borné et contrôle du tracé : aucun simple préfixe base64 accepté. */
export async function erreurImageSignature(dataUrl:unknown):Promise<string|null> {
  if(typeof dataUrl!=='string' || dataUrl.length>800000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl))return 'Signature PNG invalide ou trop volumineuse.';
  const bytes=Buffer.from(dataUrl.slice('data:image/png;base64,'.length),'base64');
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'Signature PNG invalide.';
  try {
    const sharp=(await import('sharp')).default;
    const {data,info}=await sharp(bytes,{limitInputPixels:2000000}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if(info.width<50 || info.height<25 || info.width>2400 || info.height>1200)return 'Dimensions de signature invalides.';
    let marks=0,minX=info.width,maxX=0,minY=info.height,maxY=0;
    for(let i=0;i<data.length;i+=4)if(data[i+3]>40 && Math.min(data[i],data[i+1],data[i+2])<180){const pixel=i/4,x=pixel%info.width,y=Math.floor(pixel/info.width);marks++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    if(marks<20 || maxX-minX<5 || maxY-minY<5)return 'Le cadre est vide ou le tracé est trop court. Veuillez tracer votre signature.';
    return null;
  } catch {return 'Signature illisible. Effacez le cadre et recommencez.';}
}
