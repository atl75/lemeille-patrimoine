import { z } from "zod";
import { pgTable, text, varchar, integer, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// DPE (Diagnostic de Performance Énergétique) type
export const dpeSchema = z.object({
  classEnergy: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  classGES: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  consumptionKwh: z.number(),
  emissionsKg: z.number(),
  date: z.string(),
  ref: z.string()
});

// Google Maps configuration
export const mapConfigSchema = z.object({
  precision: z.enum(['EXACT', 'AREA']),
  query: z.string(),
  zoom: z.number()
});

// Owner (Propriétaire) type
export const ownerSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'COMPANY']),
  // Pour les particuliers
  firstName: z.string().optional(), // Prénom
  lastName: z.string().optional(), // Nom
  // Pour les sociétés
  name: z.string().optional(), // Raison sociale
  siren: z.string().optional(),
  managerFirstName: z.string().optional(), // Prénom du gérant
  managerLastName: z.string().optional(), // Nom du gérant
  // Commun
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional()
}).refine(
  (data) => data.type !== 'COMPANY' || (data.siren && data.siren.length > 0),
  {
    message: "Le SIREN est requis pour les sociétés",
    path: ["siren"]
  }
);

// Notary (Notaire) type
export const notarySchema = z.object({
  officeName: z.string().optional(), // Nom de l'office (ex: "Office Notarial Dupont & Associés")
  notaryName: z.string().optional(), // Nom du notaire (ex: "Maître Jean Dupont")
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal(''))
});

// Property (Bien immobilier)
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default('APPARTEMENT'), // APPARTEMENT ou MAISON
  city: text("city").notNull(),
  region: text("region").notNull(), // PARIS, NORMANDIE, COTE_D_AZUR
  price: integer("price").notNull(), // Prix FAI (Frais d'Agence Inclus)
  // Informations financières
  netSellerAmount: integer("net_seller_amount"), // Montant net vendeur
  commissionAmount: integer("commission_amount"), // Commission en € (valeur absolue)
  commissionPercentage: real("commission_percentage"), // Commission en %
  finalSalePrice: integer("final_sale_price"), // Prix FAI final de vente (après négociation)
  negotiatedCommission: integer("negotiated_commission"), // Commission négociée
  // Informations acquéreur
  buyerFirstName: text("buyer_first_name"), // Prénom de l'acquéreur
  buyerLastName: text("buyer_last_name"), // Nom de l'acquéreur
  buyerEmail: text("buyer_email"), // Email de l'acquéreur
  buyerPhone: text("buyer_phone"), // Téléphone de l'acquéreur
  buyerAddress: text("buyer_address"), // Adresse de l'acquéreur
  surface: integer("surface").notNull(),
  rooms: integer("rooms").notNull(),
  landSize: integer("land_size"), // Taille du terrain en m² (optionnel, pour les maisons)
  annexSurface: integer("annex_surface"), // Surface annexe (caves, parkings, terrasses, etc.)
  // Charges & fiscalité
  propertyTaxAmount: integer("property_tax_amount"), // Taxe foncière (€/an)
  coproChargesMonthly: integer("copro_charges_monthly"), // Charges de copropriété (€/mois)
  description: text("description").notNull(),
  images: jsonb("images").$type<string[]>().notNull(),
  features: jsonb("features").$type<string[]>().notNull(),
  map: jsonb("map").$type<{precision: string, query: string, zoom: number}>().notNull(),
  dpe: jsonb("dpe").$type<{classEnergy: string, classGES: string, consumptionKwh: number, emissionsKg: number, date: string, ref: string}>().notNull(),
  featured: boolean("featured").default(false),
  visible: boolean("visible").default(true),
  sold: boolean("sold").default(false),
  status: text("status").default('AVAILABLE'), // AVAILABLE, UNDER_OFFER, SOLD
  soldDate: text("sold_date"), // Date de vente (format YYYY-MM-DD)
  // Informations cadastrales
  cadastralReference: text("cadastral_reference"), // Référence cadastrale (ex: AB 0123)
  // Propriétaires
  owners: jsonb("owners").$type<Array<{type: string, firstName?: string, lastName?: string, name?: string, siren?: string, managerFirstName?: string, managerLastName?: string, email?: string, phone?: string, address?: string}>>(),
  // Notaires
  sellerNotary: jsonb("seller_notary").$type<{officeName?: string, notaryName?: string, address?: string, city?: string, postalCode?: string, phone?: string, email?: string}>(),
  buyerNotary: jsonb("buyer_notary").$type<{officeName?: string, notaryName?: string, address?: string, city?: string, postalCode?: string, phone?: string, email?: string}>(),
  // Documents administratifs
  titleDeed: text("title_deed"), // Titre de propriété
  dpeDocument: text("dpe_document"), // Document DPE
  propertyTax: text("property_tax"), // Taxe foncière
  mandate: text("mandate"), // Mandat
  estimation: text("estimation"), // Estimation
  // Plan et vidéo
  floorPlan: text("floor_plan"), // Plan du bien (image ou PDF, base64)
  videoUrl: text("video_url"), // Lien vidéo (YouTube / Vimeo)
  // Documents spécifiques aux appartements
  propertyRules: text("property_rules"), // Règlement de propriété
  agMinutes: jsonb("ag_minutes").$type<string[]>(), // PV d'AG (3 derniers)
  chargesStatement: text("charges_statement"), // Relevé de charges
});

export const insertPropertySchema = createInsertSchema(properties, {
  type: z.enum(['APPARTEMENT', 'MAISON']).default('APPARTEMENT'),
  images: z.array(z.string()),
  features: z.array(z.string()),
  map: mapConfigSchema,
  dpe: dpeSchema,
  status: z.enum(['AVAILABLE', 'UNDER_OFFER', 'SOLD']).default('AVAILABLE'),
  soldDate: z.string().optional(),
  cadastralReference: z.string().optional(),
  annexSurface: z.number().optional(),
  propertyTaxAmount: z.number().optional(),
  coproChargesMonthly: z.number().optional(),
  netSellerAmount: z.number().optional(),
  commissionAmount: z.number().optional(),
  commissionPercentage: z.number().optional(),
  finalSalePrice: z.number().optional(),
  negotiatedCommission: z.number().optional(),
  buyerFirstName: z.string().optional(),
  buyerLastName: z.string().optional(),
  buyerEmail: z.string().email().optional().or(z.literal('')),
  buyerPhone: z.string().optional(),
  buyerAddress: z.string().optional(),
  owners: z.array(ownerSchema).optional(),
  sellerNotary: notarySchema.optional(),
  buyerNotary: notarySchema.optional(),
  titleDeed: z.string().optional(),
  dpeDocument: z.string().optional(),
  propertyTax: z.string().optional(),
  mandate: z.string().optional(),
  estimation: z.string().optional(),
  floorPlan: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  propertyRules: z.string().optional(),
  agMinutes: z.array(z.string()).optional(),
  chargesStatement: z.string().optional()
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Tax optimization program (Programme de défiscalisation)
export const programs = pgTable("programs", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  city: text("city").notNull(),
  dispositif: text("dispositif").notNull(), // MALRAUX, MONUMENT_HISTORIQUE, DEFICIT_FONCIER
  summary: text("summary").notNull(),
  externalUrl: text("external_url"),
  visible: boolean("visible").default(true),
});

export const insertProgramSchema = createInsertSchema(programs);
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programs.$inferSelect;

// Client review (Avis client)
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey(),
  author: text("author").notNull(),
  rating: integer("rating").notNull(),
  source: text("source").notNull(),
  text: text("text").notNull(),
  date: text("date").notNull(),
  published: boolean("published").default(false),
});

export const insertReviewSchema = createInsertSchema(reviews);
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Contact lead
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey(),
  category: text("category").default('immobilier'), // 'immobilier' ou 'patrimoine'
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  propertyId: text("property_id"),
  createdAt: text("created_at").notNull(),
});

export const insertLeadSchema = createInsertSchema(leads);
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Article de blog (Actualités)
export const articles = pgTable("articles", {
  id: varchar("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(), // paragraphes séparés par des sauts de ligne
  coverImage: text("cover_image"),
  tags: jsonb("tags").$type<string[]>().notNull(),
  author: text("author").default("Arthur Lemeille"),
  publishedAt: text("published_at").notNull(), // YYYY-MM-DD
  published: boolean("published").default(false),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
});

export const insertArticleSchema = createInsertSchema(articles, {
  tags: z.array(z.string()).default([]),
});
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
