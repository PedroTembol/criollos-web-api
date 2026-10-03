export interface PublicFeedMetadata {
  state?: string
  fetchedAt?: string | null
  lastSuccessAt?: string | null
  stale?: boolean
  complete?: boolean
  sources?: Record<string, PublicFeedMetadata>
}

export function getFeedSourceStatuses(metadata?: PublicFeedMetadata | null) {
  const labels: Record<string, string> = {
    eventos: 'Agenda',
    gastronomia: 'Gastronomía',
    transport: 'Transporte',
  }
  const states: Record<string, string> = {
    fresh: 'Datos consultados',
    stale: 'Información anterior',
    partial: 'Información incompleta',
    unavailable: 'No disponible',
  }
  return Object.entries(metadata?.sources || {}).map(([name, source]) => ({
    name,
    label: labels[name] || name,
    state: states[source.state || ''] || 'Actualización sin confirmar',
    updated: getFeedStatus(source).updated,
  }))
}

export function getFeedStatus(
  metadata: PublicFeedMetadata | null | undefined,
  options: { pending?: boolean; error?: boolean; hasData?: boolean } = {}
) {
  const timestamp = metadata?.fetchedAt
  const date = timestamp ? new Date(timestamp) : null
  const updated =
    date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('es-PR', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'America/Puerto_Rico',
        }).format(date)
      : null
  if (options.pending) {
    return {
      tone: 'info',
      title: 'Actualizando información',
      message:
        'Consultando las fuentes. Los resultados anteriores pueden cambiar.',
      updated,
    }
  }
  if (options.error) {
    return {
      tone: 'warning',
      title: 'No pudimos actualizar',
      message: options.hasData
        ? 'Mostramos los últimos resultados cargados. Los filtros actuales pueden no estar confirmados.'
        : 'Intenta de nuevo para consultar los resultados.',
      updated,
    }
  }
  if (metadata?.state === 'unavailable') {
    return {
      tone: 'error',
      title: 'Fuente no disponible',
      message:
        'No podemos confirmar los resultados ahora. Intenta actualizar más tarde.',
      updated,
    }
  }
  if (metadata?.state === 'partial' || metadata?.complete === false) {
    return {
      tone: 'warning',
      title: 'Información incompleta',
      message:
        'Parte de las fuentes no pudo actualizarse. Puede haber más resultados que los mostrados.',
      updated,
    }
  }
  if (metadata?.state === 'stale' || metadata?.stale) {
    return {
      tone: 'warning',
      title: 'Mostrando información anterior',
      message:
        'La fuente no pudo actualizarse. Verifica los detalles antes de salir.',
      updated,
    }
  }
  if (metadata?.state === 'fresh' && updated) {
    return {
      tone: 'success',
      title: 'Información consultada',
      message:
        'La fecha indica cuándo consultamos la fuente. Confirma horarios y detalles en el enlace de cada lugar o evento.',
      updated,
    }
  }
  return {
    tone: 'info',
    title: 'Actualización sin confirmar',
    message:
      'No recibimos la fecha de consulta de la fuente. Puedes intentar actualizar.',
    updated: null,
  }
}
