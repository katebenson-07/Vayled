"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { ContractTemplate, ContractClause, ContractSection } from "@/lib/types";
import { MERGE_FIELD_HELP, buildMergeContext, applyTemplateWithMarkers } from "@/lib/merge";
import { toRoman, freshDefaultSections, parseLegacyBody } from "@/lib/contractSections";
import ContractDocument, { ContractSectionHeading } from "@/components/ContractDocument";
import ContractLetterhead from "@/components/ContractLetterhead";
import ContractSignatureBlock from "@/components/ContractSignatureBlock";
import ContractFooter from "@/components/ContractFooter";

function ContractsContent() {
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [sections, setSections] = useState<ContractSection[]>([]);
  const [studioName, setStudioName] = useState<string>("");
  const [studioId, setStudioId] = useState<string | null>(null);
  const [migrated, setMigrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      setStudioId(uid ?? null);
      if (uid) {
        const { data: profile } = await supabase
          .from("studio_settings")
          .select("studio_name")
          .eq("studio_id", uid)
          .maybeSingle();
        if (profile?.studio_name) setStudioName(profile.studio_name);
      }

      let { data } = await supabase.from("contract_templates").select("*").maybeSingle();
      if (!data) {
        const seeded = freshDefaultSections();
        const { data: created } = await supabase
          .from("contract_templates")
          .insert({ studio_id: uid, sections: seeded, body: "" })
          .select()
          .single();
        data = created;
      }
      const row = data as ContractTemplate;
      setTemplate(row);

      const existingSections = (row.sections as ContractSection[]) ?? [];
      if (existingSections.length > 0) {
        setSections(existingSections);
      } else if (row.body) {
        const migratedSections = parseLegacyBody(row.body);
        const extraClauses = ((row.custom_clauses as ContractClause[]) ?? []).map((c) => ({
          id: c.id,
          heading: c.heading,
          body: c.body,
        }));
        setSections([...migratedSections, ...extraClauses]);
        setMigrated(true);
      } else {
        setSections(freshDefaultSections());
      }
      setLoading(false);
    }
    load();
  }, []);

  function updateSection(id: string, patch: Partial<ContractSection>) {
    setSections((s) => s.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)));
  }

  function addSection() {
    setSections((s) => [...s, { id: crypto.randomUUID(), heading: "New Section", body: "" }]);
  }

  function removeSection(id: string) {
    setSections((s) => s.filter((sec) => sec.id !== id));
  }

  function moveSection(id: string, direction: -1 | 1) {
    setSections((s) => {
      const idx = s.findIndex((sec) => sec.id === id);
      const newIdx = idx + direction;
      if (idx === -1 || newIdx < 0 || newIdx >= s.length) return s;
      const copy = [...s];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }

  async function save() {
    if (!template) return;
    await Promise.all([
      supabase
        .from("contract_templates")
        .update({ sections, updated_at: new Date().toISOString() })
        .eq("id", template.id),
      studioId
        ? supabase
            .from("studio_settings")
            .upsert({ studio_id: studioId, studio_name: studioName, updated_at: new Date().toISOString() })
        : Promise.resolve(),
    ]);
    setMigrated(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-charcoal/60">Loading...</p>;

  const displayStudioName = studioName || "Your Studio";
  const previewContext = buildMergeContext(null, null, 0, displayStudioName);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-script text-5xl leading-tight mb-1">Contract template</h1>
          <p className="text-charcoal/60 text-sm">
            Each card below becomes one numbered section of the contract — add, remove, or reorder them freely, the
            numbering updates itself.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview((v) => !v)} className="border border-charcoal/20 rounded-md px-4 py-2 text-sm">
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
          <button onClick={save} className="bg-charcoal text-ivory rounded-md px-4 py-2 text-sm">
            Save
          </button>
        </div>
      </div>
      {saved && <p className="text-sm text-green-700">Saved.</p>}
      {migrated && !saved && (
        <p className="text-sm text-charcoal bg-beige/30 border border-gold/30 rounded-md px-3 py-2">
          Converted your previous contract into editable sections below — click Save to keep it this way.
        </p>
      )}

      <section className="bg-white border border-charcoal/10 rounded-xl p-4">
        <label className="block text-xs uppercase tracking-wide text-charcoal/50 mb-1">
          Studio name (shown as the contract letterhead)
        </label>
        <input
          className="w-full sm:w-80 border border-charcoal/20 rounded-md px-3 py-2 text-sm mb-4"
          placeholder="e.g. Kate Benson Beauty"
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
        />
        <p className="text-xs text-charcoal/50">{MERGE_FIELD_HELP}</p>
        <p className="text-xs text-charcoal/50 mt-2">
          Inside a section: start a line with <code className="bg-ivory px-1 rounded">- </code> for a bullet point, or{" "}
          <code className="bg-ivory px-1 rounded">- [ ] </code> for a checkbox line. Leave a blank line between paragraphs.
        </p>
      </section>

      <div className={showPreview ? "grid lg:grid-cols-2 gap-6 items-start" : ""}>
        <div className="space-y-4">
          {sections.map((section, i) => (
            <div key={section.id} className="bg-white border border-charcoal/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide text-gold">Section {toRoman(i + 1)}</span>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => moveSection(section.id, -1)}
                    disabled={i === 0}
                    className="px-2 py-1 border border-charcoal/20 rounded disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveSection(section.id, 1)}
                    disabled={i === sections.length - 1}
                    className="px-2 py-1 border border-charcoal/20 rounded disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeSection(section.id)}
                    className="px-2 py-1 border border-red-200 text-red-600 rounded ml-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <input
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm font-medium mb-2"
                value={section.heading}
                onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                placeholder="Section heading"
              />
              <textarea
                className="w-full border border-charcoal/20 rounded-md px-3 py-2 text-sm font-mono"
                rows={6}
                value={section.body}
                onChange={(e) => updateSection(section.id, { body: e.target.value })}
                placeholder="Section text..."
              />
            </div>
          ))}
          <button
            onClick={addSection}
            className="w-full border border-dashed border-charcoal/30 rounded-xl py-3 text-sm text-charcoal/60 hover:bg-white"
          >
            + Add section
          </button>
        </div>

        {showPreview && (
          <div className="lg:sticky lg:top-6">
            <div className="bg-white border border-charcoal/10 rounded-xl p-8">
              <ContractLetterhead studioName={displayStudioName} />
              {sections.map((section, i) => (
                <div key={section.id}>
                  <ContractSectionHeading numeral={toRoman(i + 1)} title={section.heading || "Untitled"} />
                  <ContractDocument text={applyTemplateWithMarkers(section.body, previewContext)} />
                </div>
              ))}
              <ContractSignatureBlock studioName={displayStudioName} />
              <ContractFooter />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <AuthGuard>
      <ContractsContent />
    </AuthGuard>
  );
}
