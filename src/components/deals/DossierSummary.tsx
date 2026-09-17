function stripMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#+\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .trim();
}

function renderInline(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-semibold text-charcoal">
          {bold[1]}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function parseLabeledItem(line: string) {
  const cleaned = line.replace(/^[-*•]\s*/, "").trim();
  const labeled = cleaned.match(/^\*\*(.+?):\*\*\s*(.*)$/) || cleaned.match(/^([^:]{2,40}):\s+(.+)$/);
  if (!labeled) return { text: stripMarkdown(cleaned) };
  return { label: stripMarkdown(labeled[1]), value: labeled[2].trim() };
}

export function parseDossierSummary(raw: string) {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "---" && !/^aqui está/i.test(line));

  const sections: Array<{ title: string; items: Array<{ label?: string; text: string }> }> = [];
  let title = "";
  let current: { title: string; items: Array<{ label?: string; text: string }> } | null = null;

  function pushCurrent() {
    if (current && (current.title || current.items.length)) {
      sections.push(current);
    }
  }

  for (const line of lines) {
    if (/^#\s+/.test(line) && !title) {
      title = stripMarkdown(line);
      continue;
    }

    if (/^#{2,3}\s+/.test(line)) {
      pushCurrent();
      current = {
        title: stripMarkdown(line).replace(/^\d+\.\s*/, ""),
        items: [],
      };
      continue;
    }

    if (!current) {
      current = { title: title || "Resumo", items: [] };
      title = "";
    }

    const parsed = parseLabeledItem(line);
    current.items.push({
      label: parsed.label,
      text: parsed.value || parsed.text || stripMarkdown(line),
    });
  }

  pushCurrent();

  return {
    title: title.replace(/dossiê comercial\s*-?\s*/i, "").trim(),
    sections: sections.filter((section) => section.items.length || section.title),
  };
}

export default function DossierSummary({ text }: { text: string }) {
  const dossier = parseDossierSummary(text);

  if (!dossier.sections.length) {
    return <p className="text-sm leading-6 text-charcoal">{text}</p>;
  }

  return (
    <div className="space-y-4">
      {dossier.title ? (
        <p className="font-display text-lg font-semibold tracking-tight text-charcoal">{dossier.title}</p>
      ) : null}
      {dossier.sections.map((section) => {
        const labeled = section.items.filter((item) => item.label);
        const notes = section.items.filter((item) => !item.label);
        return (
          <section key={section.title} className="rounded-xl border border-charcoal/10 bg-white p-4">
            <p className="eyebrow mb-3">{section.title}</p>
            {labeled.length ? (
              <dl className="space-y-2">
                {labeled.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="grid gap-1 sm:grid-cols-[150px_1fr] sm:gap-4">
                    <dt className="text-xs font-medium text-charcoal/45">{item.label}</dt>
                    <dd className="text-sm leading-6 text-charcoal">{renderInline(item.text)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {notes.length ? (
              <ul className={`space-y-2 ${labeled.length ? "mt-3" : ""}`}>
                {notes.map((item, index) => (
                  <li key={`${item.text}-${index}`} className="text-sm leading-6 text-charcoal">
                    {renderInline(item.text)}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
