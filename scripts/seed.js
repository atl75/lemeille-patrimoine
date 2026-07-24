const fs = require('fs'); const path = require('path');
const dataDir = path.join(process.cwd(), 'data'); if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const w = (name, data) => fs.writeFileSync(path.join(dataDir, name), JSON.stringify(data, null, 2), 'utf-8');

w('properties.json', [
  {
    id:"b1",
    title:"Appartement haussmannien",
    city:"Paris 7e",
    region:"PARIS",
    price:1410000,
    surface:98,
    rooms:4,
    description:"Volumes, moulures, parquet point de Hongrie.",
    images:["/uploads/haussmann-1.jpg","/uploads/haussmann-2.jpg"],
    features:["Ascenseur","Parquet","Cheminées","Balcon"],
    map: { precision: "AREA", query: "Paris 7e", zoom: 15 },
    dpe:{ classEnergy:"D", classGES:"E", consumptionKwh:215, emissionsKg:48, date:"2024-11-20", ref:"DPE-PA7-001" }
  }
]);
w('programs.json', [
  { id:"p1", title:"Rue des Carmes", city:"Rouen", dispositif:"MALRAUX", summary:"Réhabilitation de caractère au cœur historique.", externalUrl:"", visible:true }
]);
w('reviews.json', [
  { id:"r1", author:"J. Martin", rating:5, source:"Google", text:"Accompagnement remarquable et grande discrétion.", date:"2025-01-12", published:true }
]);
w('leads.json', []);
console.log('✅ Seed OK');
