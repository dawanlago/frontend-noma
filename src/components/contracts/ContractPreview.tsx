import { Fragment, type ReactNode } from "react";
import { BLANK, type ContractDocument } from "@/lib/contracts/clauses";

const SERIF = 'Georgia, "Times New Roman", Times, serif';

/** Destaca os campos vazios ("________") e os trechos em negrito das partes. */
function renderText(text: string): ReactNode {
  return text.split(/(<b>[\s\S]*?<\/b>)/g).map((chunk, index) => {
    if (chunk.startsWith("<b>")) {
      return <strong key={index}>{renderBlanks(chunk.slice(3, -4))}</strong>;
    }
    return <Fragment key={index}>{renderBlanks(chunk)}</Fragment>;
  });
}

function renderBlanks(text: string): ReactNode {
  const parts = text.split(BLANK);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <span className="rounded-sm bg-gold/15 text-charcoal/50">{BLANK}</span> : null}
    </Fragment>
  ));
}

function Paragraph({ text }: { text: string }) {
  const match = text.match(/^(\d+\.\d+\.)\s([\s\S]*)$/);
  return (
    <p className="mb-2 text-justify">
      {match ? (
        <>
          <strong>{match[1]}</strong> {renderText(match[2])}
        </>
      ) : (
        renderText(text)
      )}
    </p>
  );
}

function SignatureLine({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="text-[10.5px]">
      <div className="mb-1.5 border-t border-charcoal/70" />
      <p className="font-bold">{title}</p>
      {lines.map((line) => (
        <p key={line} className="text-charcoal/60">
          {line}
        </p>
      ))}
    </div>
  );
}

interface ContractPreviewProps {
  doc: ContractDocument;
  logo?: string;
}

/** Folha A4 com o contrato montado ao vivo. */
export default function ContractPreview({ doc, logo }: ContractPreviewProps) {
  return (
    <div className="rounded-xl bg-charcoal/[0.06] p-3 sm:p-4">
      <div className="max-h-[calc(100vh-13rem)] min-h-[420px] overflow-y-auto rounded-md">
        <article
          className="mx-auto bg-white px-7 py-8 text-[11.5px] leading-[1.65] text-charcoal shadow-soft sm:px-9 sm:py-10"
          style={{ fontFamily: SERIF, aspectRatio: "210 / 297" }}
        >
          {logo ? (
            <div className="mb-5 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="Logo" className="max-h-12 max-w-[160px] object-contain" />
            </div>
          ) : null}
          <h3 className="mb-5 text-center text-[13px] font-bold tracking-wide">{doc.title}</h3>
          {doc.preamble.map((text, index) => (
            <Paragraph key={index} text={text} />
          ))}
          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-4">
              <h4 className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide">{section.heading}</h4>
              {section.paragraphs.map((text, index) => (
                <Paragraph key={index} text={text} />
              ))}
            </section>
          ))}
          <p className="mt-5 text-justify">{doc.closing}</p>
          <p className="mb-8 mt-4 text-right">{renderBlanks(doc.placeDate)}</p>
          <div className="grid grid-cols-2 gap-6">
            {doc.signers.map((signer) => (
              <SignatureLine
                key={signer.role}
                title={signer.name || BLANK}
                lines={[signer.role, ...(signer.document ? [`CPF/CNPJ: ${signer.document}`] : [])]}
              />
            ))}
          </div>
          {doc.witnesses ? (
            <div className="mt-8 grid grid-cols-2 gap-6">
              {[1, 2].map((n) => (
                <SignatureLine key={n} title={`Testemunha ${n}`} lines={["Nome:", "CPF:"]} />
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}
