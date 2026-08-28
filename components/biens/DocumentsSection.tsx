import CollapsibleSection from "@/components/CollapsibleSection";
import DocumentUploader from "@/components/DocumentUploader";
import MultiDocumentUploader from "@/components/MultiDocumentUploader";

// Section « Documents administratifs » de la fiche bien (uploaders + analyse IA).
type Props = {
  editing: any;
  updateField: (field: string, value: any) => void;
  setEditing: (updater: any) => void;
  analyzing: boolean;
  analyzeDocument: (documentBase64: string) => void;
};

export default function DocumentsSection({ editing, updateField, setEditing, analyzing, analyzeDocument }: Props) {
  return (
    <CollapsibleSection title="Documents administratifs" subtitle="Titre, DPE, taxe foncière, mandat, estimation, plan, PV d'AG…">
      <div className="mb-2 p-1.5 bg-gray-50 rounded">
        <div className="flex justify-between items-center mb-1.5">
          <h3 className="font-semibold text-xs">Documents</h3>
          <div className="flex gap-0.5">
            {editing.estimation && (
              <button onClick={() => analyzeDocument(editing.estimation!)} disabled={analyzing} className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" data-testid="button-analyze-estimation">{analyzing ? '...' : 'IA Estim'}</button>
            )}
            {editing.dpeDocument && (
              <button onClick={() => analyzeDocument(editing.dpeDocument!)} disabled={analyzing} className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" data-testid="button-analyze-dpe">{analyzing ? '...' : 'IA DPE'}</button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div>
            <label className="block mb-0.5 text-[10px] font-medium">Titre propriété</label>
            <DocumentUploader document={editing.titleDeed} onChange={doc => updateField('titleDeed', doc)} label="" />
          </div>
          <div>
            <label className="block mb-0.5 text-[10px] font-medium">DPE</label>
            <DocumentUploader document={editing.dpeDocument} onChange={doc => updateField('dpeDocument', doc)} label="" />
          </div>
          <div>
            <label className="block mb-0.5 text-[10px] font-medium">Taxe foncière</label>
            <DocumentUploader document={editing.propertyTax} onChange={doc => updateField('propertyTax', doc)} label="" />
          </div>
          <div>
            <label className="block mb-0.5 text-[10px] font-medium">Mandat</label>
            <DocumentUploader document={editing.mandate} onChange={doc => updateField('mandate', doc)} label="" />
          </div>
          <div>
            <label className="block mb-0.5 text-[10px] font-medium">Estimation</label>
            <DocumentUploader document={editing.estimation} onChange={doc => updateField('estimation', doc)} label="" />
          </div>
          <div>
            <label className="block mb-0.5 text-[10px] font-medium">Plans du bien (plusieurs possibles)</label>
            <MultiDocumentUploader
              documents={editing.floorPlans && editing.floorPlans.length ? editing.floorPlans : (editing.floorPlan ? [editing.floorPlan] : [])}
              onChange={docs => setEditing((prev: any) => prev ? { ...prev, floorPlans: docs, floorPlan: undefined } : null)}
              label=""
              maxDocuments={6}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              uploadToCloud
            />
          </div>
          {editing.type === 'APPARTEMENT' && (
            <>
              <div>
                <label className="block mb-0.5 text-[10px] font-medium">Règlement copro</label>
                <DocumentUploader document={editing.propertyRules} onChange={doc => updateField('propertyRules', doc)} label="" />
              </div>
              <div>
                <label className="block mb-0.5 text-[10px] font-medium">Relevé charges</label>
                <DocumentUploader document={editing.chargesStatement} onChange={doc => updateField('chargesStatement', doc)} label="" />
              </div>
              <div>
                <label className="block mb-0.5 text-[10px] font-medium">PV AG</label>
                <MultiDocumentUploader documents={editing.agMinutes || []} onChange={docs => updateField('agMinutes', docs)} label="" uploadToCloud />
              </div>
            </>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
