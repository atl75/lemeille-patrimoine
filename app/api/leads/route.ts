import { NextResponse } from 'next/server';
import { readJSON, writeJSON, uid } from '@/lib/utils';
import { Resend } from 'resend';
import { isAdmin } from '@/lib/adminGuard';

export async function GET(req: Request){
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await readJSON('leads.json');
  return NextResponse.json(data);
}

function formatEstimationEmail(payload: any): string {
  const prop = payload.meta?.property || {};
  const estimation = payload.meta?.estimation || {};
  
  const atouts = [];
  if (prop.parking) atouts.push('Parking');
  if (prop.seaView) atouts.push('Vue mer');
  if (prop.pool) atouts.push('Piscine');
  if (prop.lumineux) atouts.push('Lumineux');
  if (prop.calme) atouts.push('Calme');
  if (prop.cuisineEquipee) atouts.push('Cuisine équipée');
  if (prop.cuisineRecente) atouts.push('Cuisine récente');
  if (prop.parquet) atouts.push('Parquet');
  if (prop.dressing) atouts.push('Dressing');
  if (prop.extTerrasse) atouts.push('Terrasse');
  if (prop.extJardin) atouts.push('Jardin');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1F3B2C; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
        .section-title { font-size: 18px; font-weight: bold; color: #1F3B2C; margin-bottom: 10px; }
        .info-row { margin: 8px 0; }
        .label { font-weight: bold; color: #666; }
        .atouts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .atout { background: #B89C6D; color: white; padding: 4px 12px; border-radius: 15px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Nouvelle demande d'estimation</h1>
        </div>
        
        <div class="section">
          <div class="section-title">👤 Informations de contact</div>
          <div class="info-row"><span class="label">Nom :</span> ${payload.firstName} ${payload.lastName}</div>
          <div class="info-row"><span class="label">Téléphone :</span> ${payload.phone}</div>
          ${payload.email ? `<div class="info-row"><span class="label">Email :</span> ${payload.email}</div>` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">🏡 Informations du bien</div>
          <div class="info-row"><span class="label">Adresse :</span> ${prop.city || 'Non renseignée'}</div>
          <div class="info-row"><span class="label">Type :</span> ${prop.type || 'Non renseigné'}</div>
          <div class="info-row"><span class="label">Surface :</span> ${prop.surface || 0} m²</div>
          <div class="info-row"><span class="label">Nombre de pièces :</span> ${prop.rooms || 0}</div>
          <div class="info-row"><span class="label">État :</span> ${prop.condition || 'Non renseigné'}</div>
          <div class="info-row"><span class="label">DPE :</span> ${prop.dpe || 'Non renseigné'}</div>
          ${prop.type === 'Appartement' && prop.floor ? `<div class="info-row"><span class="label">Étage :</span> ${prop.floor}${prop.elevator ? ' (avec ascenseur)' : ' (sans ascenseur)'}</div>` : ''}
        </div>
        
        ${atouts.length > 0 ? `
        <div class="section">
          <div class="section-title">✨ Atouts du bien</div>
          <div class="atouts">
            ${atouts.map(a => `<span class="atout">${a}</span>`).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <div class="section-title">📊 Informations complémentaires</div>
          <div class="info-row"><span class="label">Date :</span> ${new Date(payload.createdAt).toLocaleString('fr-FR')}</div>
          <div class="info-row"><span class="label">ID Lead :</span> ${payload.id}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatDefiscEmail(payload: any): string {
  const m = payload.meta || {};
  const eur = (n: any) => (Number(n) || 0).toLocaleString('fr-FR') + ' €';
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1F3B2C">
      <h2 style="color:#8A6D3F">💶 Nouvelle simulation de défiscalisation</h2>
      <p><strong>${payload.firstName || ''} ${payload.lastName || ''}</strong></p>
      <p>Email : <a href="mailto:${payload.email || ''}">${payload.email || '—'}</a><br/>
         Téléphone : ${payload.phone || '—'}</p>
      <table style="border-collapse:collapse;width:100%;margin-top:12px">
        <tr><td style="padding:6px;border-bottom:1px solid #eee">Dispositif</td><td style="padding:6px;border-bottom:1px solid #eee"><strong>${m.dispositif || '—'}</strong></td></tr>
        <tr><td style="padding:6px;border-bottom:1px solid #eee">Montant des travaux</td><td style="padding:6px;border-bottom:1px solid #eee">${eur(m.travaux)}</td></tr>
        <tr><td style="padding:6px;border-bottom:1px solid #eee">TMI</td><td style="padding:6px;border-bottom:1px solid #eee">${m.tmi != null ? Math.round(m.tmi * 100) + ' %' : '—'}</td></tr>
        <tr><td style="padding:6px;border-bottom:1px solid #eee">Gain fiscal estimé</td><td style="padding:6px;border-bottom:1px solid #eee"><strong>${eur(m.estimation)}</strong></td></tr>
      </table>
      <p style="font-size:12px;color:#888;margin-top:16px">Lead généré par le simulateur de défiscalisation du site.</p>
    </div>
  `;
}

function formatContactEmail(payload: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1F3B2C; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
        .section-title { font-size: 18px; font-weight: bold; color: #1F3B2C; margin-bottom: 10px; }
        .info-row { margin: 8px 0; }
        .label { font-weight: bold; color: #666; }
        .message-box { background: white; padding: 15px; border-left: 4px solid #B89C6D; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Nouveau message de contact</h1>
        </div>
        
        <div class="section">
          <div class="section-title">👤 Informations de contact</div>
          <div class="info-row"><span class="label">Nom :</span> ${payload.firstName} ${payload.lastName}</div>
          <div class="info-row"><span class="label">Email :</span> ${payload.email || 'Non renseigné'}</div>
          <div class="info-row"><span class="label">Téléphone :</span> ${payload.phone || 'Non renseigné'}</div>
          ${payload.topic ? `<div class="info-row"><span class="label">Sujet :</span> ${payload.topic}</div>` : ''}
        </div>
        
        ${payload.message ? `
        <div class="section">
          <div class="section-title">💬 Message</div>
          <div class="message-box">${payload.message.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}
        
        <div class="section">
          <div class="section-title">📊 Informations complémentaires</div>
          <div class="info-row"><span class="label">Date :</span> ${new Date(payload.createdAt).toLocaleString('fr-FR')}</div>
          <div class="info-row"><span class="label">ID Lead :</span> ${payload.id}</div>
          <div class="info-row"><span class="label">Source :</span> Formulaire de contact</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Déduit le rôle (Acheteur/Vendeur) et la catégorie d'un lead entrant à partir
// de sa source et de son sujet, sauf s'ils sont déjà renseignés (saisie manuelle).
function applyRole(payload: any) {
  if (payload.role) return;
  const t = String(payload.topic || '').toLowerCase();
  const s = String(payload.source || '').toLowerCase();
  if (s === 'estimation-immobilier' || /vente|estimation|vendre|vendeur/.test(t)) {
    payload.role = 'VENDEUR';
    if (!payload.category) payload.category = 'immobilier';
  } else if (/achat|acqu|acheteur/.test(t)) {
    payload.role = 'ACHETEUR';
    if (!payload.category) payload.category = 'immobilier';
  }
}

export async function POST(req: Request){
  const contentType = req.headers.get('content-type') || '';
  
  let payload: any;
  
  if (contentType.includes('application/json')) {
    // JSON from simulator/estimation
    const body = await req.json();
    payload = {
      id: uid('L'),
      createdAt: new Date().toISOString(),
      status: 'new',
      ...body
    };
    applyRole(payload);
    const data = await readJSON('leads.json');
    data.push(payload);
    await writeJSON('leads.json', data);
    
    // Notifier par email selon la source du lead
    const notifySources = ['estimation-immobilier', 'simulateur-defiscalisation', 'guide-defiscalisation'];
    if (notifySources.includes(body.source) && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        let subject: string, html: string;
        if (body.source === 'simulateur-defiscalisation') {
          subject = `💶 Simulation défiscalisation — ${payload.firstName} ${payload.lastName}`;
          html = formatDefiscEmail(payload);
        } else if (body.source === 'guide-defiscalisation') {
          subject = `📥 Téléchargement guide — ${payload.firstName} ${payload.lastName}`;
          html = formatContactEmail(payload);
        } else {
          subject = `📋 Nouvelle estimation — ${payload.firstName} ${payload.lastName}`;
          html = formatEstimationEmail(payload);
        }
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>',
          to: process.env.LEADS_TO_EMAIL || 'arthur.lemeille@lemeillepatrimoine.com',
          subject,
          html,
        });
      } catch (error) {
        console.error('Erreur envoi email:', error);
        // Continue même si l'email échoue
      }
    }
    
    return NextResponse.json({ success: true, id: payload.id });
  } else {
    // FormData from contact form
    const formData = await req.formData();
    payload = {
      id: uid('L'),
      createdAt: new Date().toISOString(),
      status: 'new',
      firstName: formData.get('firstName') || '',
      lastName: formData.get('lastName') || '',
      email: formData.get('email') || '',
      phone: formData.get('phone') || '',
      topic: formData.get('topic') || '',
      message: formData.get('message') || '',
      consent: !!formData.get('consent'),
      source: 'contact-form'
    };
    applyRole(payload);
    const data = await readJSON('leads.json');
    data.push(payload);
    await writeJSON('leads.json', data);
    
    // Envoyer l'email pour le formulaire de contact
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>',
          to: process.env.LEADS_TO_EMAIL || 'arthur.lemeille@lemeillepatrimoine.com',
          subject: `📧 Nouveau contact — ${payload.firstName} ${payload.lastName}${payload.topic ? ` — ${payload.topic}` : ''}`,
          html: formatContactEmail(payload)
        });
      } catch (error) {
        console.error('Erreur envoi email contact:', error);
        // Continue même si l'email échoue
      }
    }
    
    return NextResponse.redirect(new URL('/contact?ok=1', req.url));
  }
}
