import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

/** Le canvas est rendu depuis les octets du téléchargement, jamais depuis des notes HTML. */
export function PdfDocumentView({ bytes }: { bytes: Uint8Array }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState('fit');
  const [width, setWidth] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [renderedKey, setRenderedKey] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderKey = document ? `${document.fingerprints[0]}:${pageNumber}:${width}:${zoom}` : '';
  const rendering = !error && (busy || renderedKey !== renderKey);

  useEffect(() => {
    let active = true;
    setDocument(null); setPageNumber(1); setError(''); setBusy(true);
    // Le transfert au worker ne doit pas détacher les octets conservés pour télécharger.
    const task = getDocument({ data: bytes.slice(), disableWorkerRendering: true });
    task.promise.then(pdf => { if (active) setDocument(pdf); })
      .catch(() => { if (active) { setError('Le document PDF ne peut pas être affiché. Vous pouvez réessayer.'); setBusy(false); } });
    return () => { active = false; void task.destroy(); };
  }, [bytes]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!document || !canvas.current || !width) return;
    let active = true;
    let task: RenderTask | undefined;
    setBusy(true); setError(''); setText('');
    async function render() {
      const page = await document!.getPage(pageNumber);
      if (!active || !canvas.current) return;
      const natural = page.getViewport({ scale: 1 });
      const scale = zoom === 'fit' ? Math.min((width - 32) / natural.width, 1.6) : Number(zoom) / 100;
      const viewport = page.getViewport({ scale: Math.max(0.2, scale) });
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const element = canvas.current;
      element.width = Math.ceil(viewport.width * density);
      element.height = Math.ceil(viewport.height * density);
      element.style.width = `${viewport.width}px`;
      element.style.height = `${viewport.height}px`;
      task = page.render({ canvas: element, viewport, transform: [density, 0, 0, density, 0, 0] });
      await task.promise;
      const content = await page.getTextContent();
      if (active) {
        setText(content.items.map(item => 'str' in item ? item.str : '').join(' '));
        setRenderedKey(renderKey);
        setBusy(false);
      }
    }
    void render().catch(error => {
      if (active && error?.name !== 'RenderingCancelledException') {
        setError('L’affichage de cette page a échoué. Changez de page ou rechargez le document.'); setBusy(false);
      }
    });
    return () => { active = false; task?.cancel(); };
  }, [document, pageNumber, width, zoom, renderKey]);

  return <div className="bulletin-pdf" data-testid="pdf-viewer" aria-busy={rendering}>
    <div className="bulletin-pdf-toolbar" aria-label="Lecture du PDF">
      <div className="bulletin-pdf-pagination">
        <button type="button" aria-label="Page précédente" disabled={!document || pageNumber === 1} onClick={() => setPageNumber(p => p - 1)}>Précédente</button>
        <span aria-live="polite">Page {pageNumber} sur {document?.numPages ?? '…'}</span>
        <button type="button" aria-label="Page suivante" disabled={!document || pageNumber === document.numPages} onClick={() => setPageNumber(p => p + 1)}>Suivante</button>
      </div>
      <label>Zoom <select aria-label="Zoom du document" value={zoom} onChange={event => setZoom(event.target.value)}>
        <option value="fit">Ajuster à la largeur</option>
        {[75, 100, 125, 150].map(value => <option key={value} value={value}>{value} %</option>)}
      </select></label>
    </div>
    {error && <p className="bulletin-error" role="alert">{error}</p>}
    {rendering && !error && <p className="bulletin-pdf-status" role="status">Affichage du PDF…</p>}
    <div ref={container} className="bulletin-pdf-sheet" tabIndex={0} aria-label="Document PDF, défilement horizontal disponible au zoom">
      <canvas ref={canvas} role="img" aria-label={`Page ${pageNumber} du bulletin scolaire`} data-rendered={!rendering && !error}/>
    </div>
    <div className="sr-only" data-testid="pdf-text" aria-label={`Texte du PDF, page ${pageNumber}`}>{text}</div>
  </div>;
}
