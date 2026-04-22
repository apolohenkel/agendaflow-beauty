// Definiciones de los 4 verticals soportados.
// Cada vertical tiene paleta + copy + ejemplo de chat + servicios sugeridos.
// Toda la UI pública (landing, booking, emails, onboarding, configuración)
// deriva su tema de aquí usando CSS variables vía themeCssVars().

export const VERTICALS = {
  beauty_salon: {
    key: 'beauty_salon',
    name: 'Salón de belleza',
    emoji: '💇‍♀️',
    shortLabel: 'Salón',
    theme: {
      bg: '#FAF6F0',
      surface: '#FFFFFF',
      surfaceSoft: '#FDFBF7',
      border: '#EDE5DB',
      borderSoft: '#F4EADB',
      text: '#2B1810',
      textSoft: '#6B5A4F',
      textMuted: '#A89582',
      primary: '#B8824B',
      primaryHover: '#8C5E35',
      primarySoft: '#E8C5B8',
      onPrimary: '#FFFFFF',
      accent: '#E8C5B8',
      success: '#7A9A6E',
      error: '#C44646',
    },
    copy: {
      tagline: 'Tu salón merece una agenda',
      taglineAccent: 'que no duerma',
      heroLead: 'Mientras cortas, tinturas o das masajes, un asistente contesta WhatsApp, agenda citas y recuerda a tus clientes.',
      staffTerm: 'estilistas',
      clientTerm: 'clientas',
      salonWord: 'salón',
      businessChatName: 'Salón Sofía',
      businessChatInitial: 'S',
    },
    chatExample: [
      { from: 'client', text: '¿Tienen cita mañana para corte?' },
      { from: 'bot', text: '¡Hola! Sí, tengo disponible:\n\n🕙 10:30 con Laura\n🕒 15:00 con Carla\n\n¿Cuál te acomoda?' },
      { from: 'client', text: 'Las 3 está perfecto 🙌' },
      { from: 'bot', text: '✨ Listo. Te agendé con Carla mañana 15:00.\nTe recordamos 2h antes.' },
    ],
    suggestedServices: ['Corte dama', 'Tinte', 'Peinado', 'Tratamiento capilar', 'Manicura'],
    painPoints: [
      { emoji: '📵', title: 'Contestas WhatsApp 2 horas tarde', body: 'Mientras tenías a la clienta en la silla, 5 mensajes quedaron sin responder. Cuando respondes, ya agendaron en el salón de al lado.' },
      { emoji: '💸', title: 'Ausencias que te cuestan el día', body: 'Bloqueaste dos horas para María. No llegó. Tampoco avisó. Podrías haber atendido a otras dos clientas en ese hueco.' },
      { emoji: '🤯', title: 'Agenda en post-its, WhatsApp y cuadernos', body: '¿A qué hora es Andrea? ¿Qué servicio pidió? ¿Ya confirmó? El caos mental que te llevas a la cama cada noche.' },
    ],
  },

  barbershop: {
    key: 'barbershop',
    name: 'Barbería',
    emoji: '🪒',
    shortLabel: 'Barbería',
    theme: {
      bg: '#1A1410',
      surface: '#23191F',
      surfaceSoft: '#1F1612',
      border: '#2E2420',
      borderSoft: '#392C25',
      text: '#F0E8DC',
      textSoft: '#C8B8A5',
      textMuted: '#8C7A68',
      primary: '#C08B4D',
      primaryHover: '#D89F5F',
      primarySoft: '#4A5D3C',
      onPrimary: '#1A1410',
      accent: '#4A5D3C',
      success: '#7A9A6E',
      error: '#D45555',
    },
    copy: {
      tagline: 'Tu barbería llena sola',
      taglineAccent: 'hasta cuando duermes',
      heroLead: 'Mientras atiendes un corte, un asistente contesta WhatsApp, agenda clientes nuevos y recuerda a todos sus turnos.',
      staffTerm: 'barberos',
      clientTerm: 'clientes',
      salonWord: 'barbería',
      businessChatName: 'Barber Club',
      businessChatInitial: 'B',
    },
    chatExample: [
      { from: 'client', text: 'Hermano, ¿hay turno mañana para corte y barba?' },
      { from: 'bot', text: '¡Qué tal! Tengo estos turnos libres:\n\n🕛 12:00 con Miguel\n🕔 17:30 con Andrés\n\n¿Cuál prefieres?' },
      { from: 'client', text: 'Las 5:30 dale' },
      { from: 'bot', text: '✂️ Listo. Te espero mañana 17:30 con Andrés.\nRecordatorio 2h antes.' },
    ],
    suggestedServices: ['Corte caballero', 'Corte + barba', 'Arreglo de barba', 'Diseño cejas', 'Coloración'],
    painPoints: [
      { emoji: '📵', title: 'El cliente de al lado ya lo perdiste', body: 'Mientras terminabas el corte, tres wasaps sin responder. Para cuando agarras el teléfono, se fueron a la barbería de la esquina.' },
      { emoji: '💸', title: 'Turnos bloqueados que no llegan', body: 'Reservaste media hora para Juan. Juan no apareció. Ni un mensaje. Media hora muerta en tu día.' },
      { emoji: '🤯', title: 'Agenda en la cabeza y en el grupo de WhatsApp', body: '¿Tenía cita Carlos el sábado? ¿A qué hora era Luis? Te acuestas repasando turnos en la cabeza.' },
    ],
  },

  nail_salon: {
    key: 'nail_salon',
    name: 'Salón de uñas',
    emoji: '💅',
    shortLabel: 'Uñas',
    theme: {
      bg: '#FBF5F7',
      surface: '#FFFFFF',
      surfaceSoft: '#FDF8FA',
      border: '#F2E4EA',
      borderSoft: '#F8ECF1',
      text: '#3A1F2B',
      textSoft: '#7A5669',
      textMuted: '#AB8C9B',
      primary: '#C26D8B',
      primaryHover: '#AB5575',
      primarySoft: '#E8C5D3',
      onPrimary: '#FFFFFF',
      accent: '#B79CD9',
      success: '#7A9A6E',
      error: '#C44646',
    },
    copy: {
      tagline: 'Tu nail studio lleno,',
      taglineAccent: 'como lo soñaste',
      heroLead: 'Mientras les haces magia a unas acrílicas, un asistente contesta WhatsApp y agenda las próximas manicuras.',
      staffTerm: 'manicuristas',
      clientTerm: 'clientas',
      salonWord: 'nail studio',
      businessChatName: 'Nails by Sofi',
      businessChatInitial: 'N',
    },
    chatExample: [
      { from: 'client', text: 'Hola 💖 ¿tienes espacio mañana para acrílicas?' },
      { from: 'bot', text: '¡Hola linda! Sí, tengo:\n\n🕚 11:00 con Sofi\n🕒 15:30 con Mely\n\n¿Cuál te queda?' },
      { from: 'client', text: 'Las 3:30 porfa ✨' },
      { from: 'bot', text: '💅 Listo. Mañana 15:30 con Mely.\nTrae la inspiración que quieras 💕' },
    ],
    suggestedServices: ['Manicura clásica', 'Pedicura spa', 'Acrílicas', 'Diseño artístico', 'Gel polish'],
    painPoints: [
      { emoji: '📵', title: 'Contestas con la mano llena de polvo acrílico', body: 'Mientras limas, pules y pintas, el WhatsApp acumula clientas pidiendo cita. Cuando respondes, ya se fueron con la competencia.' },
      { emoji: '💸', title: 'Huecos vacíos entre sesiones', body: 'Bloqueaste 3h para acrílicas de Karla. Canceló a última hora sin avisar. Tres horas sin clientas y sin ingresos.' },
      { emoji: '🤯', title: 'Diseños, colores y horarios todo mezclado', body: '¿Qué diseño pidió Andrea? ¿Con qué color? ¿A qué hora? Anotas todo y siempre se pierde algo.' },
    ],
  },

  spa: {
    key: 'spa',
    name: 'Spa',
    emoji: '🧖‍♀️',
    shortLabel: 'Spa',
    theme: {
      bg: '#F6F4EE',
      surface: '#FFFFFF',
      surfaceSoft: '#FAF8F3',
      border: '#E8E3D6',
      borderSoft: '#EFEADD',
      text: '#2B3028',
      textSoft: '#5F6457',
      textMuted: '#9A9887',
      primary: '#7A9A6E',
      primaryHover: '#5E7D54',
      primarySoft: '#C8B99C',
      onPrimary: '#FFFFFF',
      accent: '#C8B99C',
      success: '#7A9A6E',
      error: '#C44646',
    },
    copy: {
      tagline: 'Tu spa lleno,',
      taglineAccent: 'tu mente en paz',
      heroLead: 'Mientras ofreces momentos de calma, un asistente agenda futuras sesiones y recuerda a tus huéspedes sus citas.',
      staffTerm: 'terapeutas',
      clientTerm: 'huéspedes',
      salonWord: 'spa',
      businessChatName: 'Spa Harmonía',
      businessChatInitial: 'H',
    },
    chatExample: [
      { from: 'client', text: 'Buenas tardes, ¿agenda disponible mañana para masaje?' },
      { from: 'bot', text: 'Buenas tardes 🌿 Tengo:\n\n🕙 10:00 con Ana\n🕓 16:00 con María\n\n¿Cuál le acomoda?' },
      { from: 'client', text: 'La tarde estaría perfecto' },
      { from: 'bot', text: '🌸 Listo. Mañana 16:00 con María.\nLe esperamos con una infusión de bienvenida.' },
    ],
    suggestedServices: ['Masaje relajante', 'Masaje profundo', 'Facial', 'Aromaterapia', 'Ritual de bienvenida'],
    painPoints: [
      { emoji: '📵', title: 'Agenda fragmentada entre WhatsApp y correo', body: 'Tus huéspedes reservan por 4 canales distintos. Cuando alguien pregunta disponibilidad, tienes que revisar 3 cuadernos antes de responder.' },
      { emoji: '💸', title: 'Ausencias en sesiones largas', body: 'Reservaste 90 minutos de masaje. No apareció. Una terapeuta libre, una sala vacía, y el día con menos ingresos.' },
      { emoji: '🤯', title: 'Contraindicaciones y notas en libretas', body: '¿Qué aceite prefería la Sra. García? ¿Tiene alergias? La información crítica vive en una libreta que siempre se pierde.' },
    ],
  },
}

export const VERTICAL_KEYS = ['beauty_salon', 'barbershop', 'nail_salon', 'spa']
export const DEFAULT_VERTICAL = 'beauty_salon'

export function getVertical(key) {
  return VERTICALS[key] || VERTICALS[DEFAULT_VERTICAL]
}

// Transforma el theme de una vertical a un objeto de CSS vars listo para style inline.
// Uso: <div style={themeCssVars(getVertical('barbershop').theme)}>...</div>
// Y luego en clases Tailwind: bg-[var(--surface)] text-[var(--text)] etc.
export function themeCssVars(theme) {
  return {
    '--bg': theme.bg,
    '--surface': theme.surface,
    '--surface-soft': theme.surfaceSoft,
    '--border': theme.border,
    '--border-soft': theme.borderSoft,
    '--text': theme.text,
    '--text-soft': theme.textSoft,
    '--text-muted': theme.textMuted,
    '--primary': theme.primary,
    '--primary-hover': theme.primaryHover,
    '--primary-soft': theme.primarySoft,
    '--on-primary': theme.onPrimary,
    '--accent': theme.accent,
    '--success': theme.success,
    '--error': theme.error,
  }
}

// Merge de theme base + overrides custom del org (organizations.theme jsonb).
export function composeTheme(verticalKey, customOverrides = null) {
  const base = getVertical(verticalKey).theme
  if (!customOverrides || typeof customOverrides !== 'object') return base
  return { ...base, ...customOverrides }
}
