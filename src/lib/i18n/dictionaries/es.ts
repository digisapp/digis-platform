import type { Dictionary } from './en';

export const es: Dictionary = {
  // Common
  common: {
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    next: 'Siguiente',
    back: 'Atrás',
    close: 'Cerrar',
    share: 'Compartir',
    follow: 'Seguir',
    following: 'Siguiendo',
    unfollow: 'Dejar de seguir',
    explore: 'Explorar',
    search: 'Buscar',
    coins: 'monedas',
    viewProfile: 'Ver Perfil',
    seeAll: 'Ver Todo',
    tryAgain: 'Intentar de Nuevo',
    noResults: 'No se encontraron resultados',
    or: 'o',
  },

  // Navigation
  nav: {
    home: 'Inicio',
    explore: 'Explorar',
    streams: 'En Vivo',
    messages: 'Mensajes',
    wallet: 'Billetera',
    settings: 'Ajustes',
    forYou: 'Para Ti',
    clips: 'Clips',
  },

  // Auth
  auth: {
    signUp: 'Registrarse',
    signIn: 'Iniciar Sesión',
    logOut: 'Cerrar Sesión',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    imAFan: 'Soy Fan',
    imACreator: 'Soy Creador/a',
    fanDescription: 'Mira transmisiones en vivo, reserva videollamadas y accede a contenido exclusivo',
    creatorDescription: 'Transmite en vivo, ofrece llamadas pagadas y gana con tu contenido',
    checkEmail: 'Revisa tu correo para verificar tu cuenta',
  },

  // Onboarding
  onboarding: {
    welcomeTitle: '¡Bienvenido/a a Digis!',
    welcomeDesc: 'Sigue a creadores para ver sus transmisiones, contenido y novedades en tu feed.',
    coinsTitle: 'Las Monedas lo Hacen Todo',
    coinsDesc: 'Usa monedas para apoyar a creadores y desbloquear experiencias exclusivas.',
    sendTips: 'Enviar propinas',
    sendTipsDesc: 'Apoya a creadores durante transmisiones y en mensajes directos',
    unlockContent: 'Desbloquear contenido exclusivo',
    unlockContentDesc: 'Accede a fotos y videos premium',
    bookCalls: 'Reservar videollamadas',
    bookCallsDesc: 'Llamadas de video y voz 1 a 1 con creadores',
    claimFreeCoins: 'Reclamar 10 Monedas Gratis',
    claiming: 'Reclamando...',
    coinsClaimed: '¡10 Monedas Reclamadas!',
    allSetTitle: '¡Todo Listo!',
    allSetFollowing: 'Estás siguiendo a {count} creador{s}. Su contenido aparecerá en tu feed.',
    allSetExplore: 'Explora creadores, mira transmisiones en vivo y descubre contenido exclusivo.',
    findCreators: 'Encontrar creadores',
    browseContent: 'Ver contenido',
    startExploring: 'Comenzar a Explorar',
  },

  // Dashboard
  dashboard: {
    liveNow: 'En Vivo Ahora',
    discoverCreators: 'Descubrir Creadores',
    searchCreators: 'Buscar creadores...',
    noCreators: 'No se encontraron creadores',
    checkBackLater: 'Vuelve más tarde para ver nuevos creadores',
    all: 'Todos',
    live: 'En Vivo',
    online: 'En Línea',
    new: 'Nuevos',
  },

  // For You Feed
  feed: {
    forYou: 'Para Ti',
    clips: 'Clips',
    nothingYet: 'Nada aquí todavía',
    contentWillAppear: 'El contenido aparecerá cuando los creadores comiencen a publicar',
    exploreCreators: 'Explorar Creadores',
    videoFailed: 'Error al cargar el video',
    exclusiveContent: 'Contenido Exclusivo',
    loadingFeed: 'Cargando tu feed...',
  },

  // Chat / Messages
  chat: {
    yourMessages: 'Tus Mensajes',
    messagesDesc: 'Envía mensajes directos a creadores, propinas y solicita videollamadas.',
    selectConversation: 'Selecciona una conversación o busca un creador para chatear.',
    noChatsYet: 'Sin chats todavía',
    noUnreadChats: 'Sin chats sin leer',
    allCaughtUp: '¡Estás al día!',
    startConversation: 'Envía mensajes a creadores, propinas o solicita llamadas',
    findCreators: 'Buscar Creadores',
    typeMessage: 'Escribe un mensaje...',
  },

  // Wallet
  wallet: {
    balance: 'Saldo',
    buyCoins: 'Comprar Monedas',
    transactions: 'Transacciones',
    noTransactions: 'Sin transacciones todavía',
    welcomeBonus: 'Bono de bienvenida — monedas gratis para nuevos fans',
  },

  // Streams
  streams: {
    noLiveStreams: 'No Hay Transmisiones en Vivo Ahora',
    checkSchedule: '¡Consulta la programación o mira repeticiones!',
    viewSchedule: 'Ver Programación',
    watchReplays: 'Ver Repeticiones',
    noScheduled: 'No Hay Shows Programados',
    noReplays: 'No Hay Repeticiones Todavía',
  },

  // Profile
  profile: {
    sendTip: 'Enviar Propina',
    message: 'Mensaje',
    subscribe: 'Suscribirse',
    subscribed: 'Suscrito/a',
    callRates: 'Tarifas de Llamada',
    perMinute: '/min',
  },

  // Settings
  settings: {
    profile: 'Perfil',
    social: 'Social',
    language: 'Idioma',
    languageDesc: 'Elige tu idioma preferido',
    deleteAccount: 'Eliminar Cuenta',
    becomeCreator: 'Convertirse en Creador/a',
  },

  // Milestones
  milestones: {
    firstFollow: '¡Seguiste a tu primer creador! Su contenido aparecerá en tu feed.',
    firstLike: '¡Primer like! A los creadores les encanta saber que disfrutas su contenido.',
    firstTip: '¡Primera propina enviada! Acabas de alegrarle el día a un creador.',
    firstMessage: '¡Primer mensaje enviado! Los creadores suelen responder en pocas horas.',
    firstPurchase: '¡Contenido desbloqueado! Disfruta de tu acceso exclusivo.',
  },

  // Emails
  emails: {
    welcomeSubject: '¡Bienvenido/a a Digis!',
    nudge12hSubject: '{name}, descubre creadores que te encantarán en Digis',
    nudge36hSubject: '{name}, aún no sigues a nadie en Digis',
    nudge72hSubject: 'Creadores están transmitiendo en vivo en Digis — no te lo pierdas, {name}',
  },

  // Marketing / Landing
  landing: {
    heroTitle: '¿cuál es tu digis?',
    heroCta: 'Conviértete en Creador/a',
    heroFanCta: 'Explorar Creadores',
    featureLiveStreams: 'Transmisiones en Vivo',
    featureVideoCalls: 'Videollamadas',
    featureChats: 'Chats',
    featureEvents: 'Eventos Exclusivos',
    featureGifts: 'Regalos Virtuales',
    featureDigitals: 'Contenido Digital',
    modelsTitle: 'Modelos e Influencers',
    modelsDesc: 'Transmite en vivo, vende contenido exclusivo y conecta con fans a través de videollamadas.',
    fitnessTitle: 'Creadores de Fitness',
    fitnessDesc: 'Ofrece sesiones de entrenamiento, llamadas de coaching y contenido premium de fitness.',
    companionsTitle: 'Compañeros/as Virtuales',
    companionsDesc: 'Construye conexiones significativas a través de videollamadas, chats y contenido exclusivo.',
    footerTerms: 'Términos de Servicio',
    footerPrivacy: 'Política de Privacidad',
    footerExplore: 'Explorar',
    footerBecomeCreator: 'Conviértete en Creador/a',
  },
} as const;
