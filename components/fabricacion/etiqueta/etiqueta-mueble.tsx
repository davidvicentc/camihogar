/**
 * Una etiqueta de 10 × 15 cm, la que se pega al mueble en el taller.
 *
 * Está pensada para leerse a un metro de distancia y con poca luz: el código
 * va enorme y en monoespaciada (los ceros y las oes no se confunden), el QR
 * ocupa media etiqueta y debajo va el mismo código en Code128 para las
 * pistolas lectoras de siempre.
 *
 * Las medidas están en milímetros a propósito. Así lo que se ve en pantalla es
 * exactamente lo que sale por la impresora de etiquetas.
 *
 * El QR lleva `{siteUrl}/f/COD-949473` y el código de barras el texto
 * `COD-949473`: ninguno de los dos lleva token (§1 del contrato), así que una
 * etiqueta perdida se puede volver a imprimir cuando haga falta.
 */

/** Todo lo que se imprime en una etiqueta, ya en texto plano y formateado. */
export interface DatosEtiqueta {
  codigo: string;
  mueble: string;
  medidas: string;
  cliente: string;
  pedidoCodigo: string;
  ruta: string;
  /** Fecha ya escrita en español ("12 de marzo de 2026"); vacía si no hay. */
  fechaPrometida: string;
  /** "Urgente" / "Alta"; vacío cuando es la prioridad normal. */
  prioridad: string;
}

/** Fila de datos del pie de la etiqueta. */
function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  if (valor.trim() === "") return null;
  return (
    <div className="flex gap-[2mm] leading-tight">
      <span className="w-[22mm] shrink-0 text-[3mm] font-semibold uppercase tracking-wide text-[#6E5748]">
        {titulo}
      </span>
      <span className="min-w-0 flex-1 break-words text-[3.4mm] font-semibold text-[#25160F]">
        {valor}
      </span>
    </div>
  );
}

export function EtiquetaMueble({ datos }: { datos: DatosEtiqueta }) {
  return (
    <article
      className="etiqueta-mueble mx-auto flex h-[150mm] w-[100mm] flex-col items-center border border-[#25160F]/15 bg-white px-[5mm] py-[4mm] text-[#25160F]"
      aria-label={`Etiqueta del mueble ${datos.codigo}`}
    >
      {/* Cabecera: la marca, para que la etiqueta se reconozca de lejos. */}
      <header className="flex w-full items-center justify-between">
        <span className="flex items-center gap-[2mm]">
          {/* eslint-disable-next-line @next/next/no-img-element -- en una hoja
              para imprimir hace falta una imagen que cargue SIEMPRE y de
              inmediato; `next/image` la carga en diferido y puede salir en
              blanco al mandar a imprimir sin haber bajado hasta ella. */}
          <img
            src="/logo-mark.png"
            alt=""
            aria-hidden="true"
            loading="eager"
            className="h-[9mm] w-auto"
          />
          <span className="text-[3.6mm] font-medium tracking-[0.28em]">
            CAMIHOGAR
          </span>
        </span>
        {datos.prioridad !== "" && (
          <span className="rounded-full border-2 border-[#C63F0C] px-[3mm] py-[0.6mm] text-[3.2mm] font-bold uppercase text-[#C63F0C]">
            {datos.prioridad}
          </span>
        )}
      </header>

      {/* El QR: lo que se escanea con el móvil. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- la imagen la
          dibuja nuestro propio endpoint como SVG; el optimizador de Next no
          aporta nada aquí y rompería la impresión vectorial. */}
      <img
        src={`/api/fabrica/qr/${datos.codigo}?size=512`}
        alt={`Código QR del mueble ${datos.codigo}`}
        loading="eager"
        className="mt-[3mm] h-[54mm] w-[54mm]"
      />

      {/* El código, enorme: es lo que se dicta por teléfono y se teclea a mano. */}
      <p className="mt-[1mm] font-mono text-[9mm] font-bold leading-none tracking-tight tabular">
        {datos.codigo}
      </p>

      {/* El mismo código en barras, para las pistolas lectoras. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- ídem: SVG propio. */}
      <img
        src={`/api/fabrica/barcode/${datos.codigo}`}
        alt={`Código de barras del mueble ${datos.codigo}`}
        loading="eager"
        className="mt-[2mm] h-[15mm] w-[80mm] object-contain"
      />

      <p className="mt-[2mm] w-full text-center text-[4.6mm] font-bold leading-tight">
        {datos.mueble}
      </p>

      <div className="mt-[2.5mm] w-full space-y-[1.2mm] border-t border-[#25160F]/15 pt-[2.5mm]">
        <Dato titulo="Cliente" valor={datos.cliente} />
        <Dato titulo="Pedido" valor={datos.pedidoCodigo} />
        <Dato titulo="Ruta" valor={datos.ruta} />
        <Dato titulo="Medidas" valor={datos.medidas} />
        <Dato titulo="Entrega" valor={datos.fechaPrometida} />
      </div>
    </article>
  );
}
