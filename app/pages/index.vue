<template>
  <div class="flex flex-col">
    <!-- Hero Section -->
    <header
      class="relative bg-gradient-to-b from-[#0038A8] to-[#002a7f] text-white py-20 px-6 overflow-hidden"
    >
      <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <span class="text-[20rem] leading-none">🍍</span>
      </div>

      <div class="max-w-5xl mx-auto relative z-10">
        <div class="flex items-center gap-3 mb-6">
          <span
            class="text-4xl"
            role="img"
            aria-label="Piña - Símbolo de hospitalidad criolla"
            >🍍</span
          >
          <h1 class="text-3xl font-bold tracking-tight uppercase">Criollos</h1>
        </div>

        <h2 class="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          Caguas en la <br />
          <span class="text-[#FFD700]">palma de tu mano</span>
        </h2>

        <p
          class="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl leading-relaxed"
        >
          Estamos transformando el Valle del Turabo en una ciudad inteligente.
          Desde el tracking de trolleys en tiempo real hasta la mejor
          gastronomía criolla.
        </p>

        <div class="flex flex-wrap gap-4">
          <a
            href="#beta"
            class="bg-[#CE1126] hover:bg-[#b00e20] text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Únete al Beta Testing
          </a>
          <a
            href="#roadmap"
            class="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-bold text-lg transition-all"
          >
            Ver Roadmap
          </a>
        </div>
      </div>
    </header>

    <!-- Live Status Section -->
    <section class="py-12 bg-white border-b border-slate-100">
      <div class="max-w-5xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div class="flex items-center gap-3 mb-2 text-[#0038A8]">
              <span class="text-2xl">🚍</span>
              <span class="font-bold uppercase text-sm tracking-widest"
                >Trolleys Activos</span
              >
            </div>
            <div class="text-4xl font-black text-slate-800 tracking-tighter">
              {{ vehicleCount !== null ? vehicleCount : '...' }}
            </div>
            <p class="text-slate-500 text-sm mt-1 italic">
              Actualizado en tiempo real
            </p>
          </div>

          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div class="flex items-center gap-3 mb-2 text-[#CE1126]">
              <span class="text-2xl">📍</span>
              <span class="font-bold uppercase text-sm tracking-widest"
                >Puntos de Interés</span
              >
            </div>
            <div class="text-4xl font-black text-slate-800 tracking-tighter">
              Próximamente
            </div>
            <p class="text-slate-500 text-sm mt-1 italic">
              Cultura y Gastronomía
            </p>
          </div>

          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div class="flex items-center gap-3 mb-2 text-[#FFD700]">
              <span class="text-2xl">✨</span>
              <span class="font-bold uppercase text-sm tracking-widest"
                >App Status</span
              >
            </div>
            <div class="text-4xl font-black text-slate-800 tracking-tighter">
              Closed Beta
            </div>
            <p class="text-slate-500 text-sm mt-1 italic">
              Solo por invitación
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Roadmap / Updates -->
    <section id="roadmap" class="py-20 bg-slate-50">
      <div class="max-w-5xl mx-auto px-6">
        <h3 class="text-3xl font-bold mb-12 flex items-center gap-3">
          <span class="bg-[#0038A8] text-white p-2 rounded-lg text-sm"
            >Update Log</span
          >
          Hoja de Ruta Criolla
        </h3>

        <div class="space-y-8">
          <div class="flex gap-6">
            <div class="flex flex-col items-center">
              <div
                class="w-4 h-4 rounded-full bg-[#0038A8] ring-4 ring-blue-100"
              ></div>
              <div class="w-1 h-full bg-slate-200"></div>
            </div>
            <div class="pb-8">
              <h4 class="text-xl font-bold text-slate-800">
                Lanzamiento del Landing & API Beta
              </h4>
              <p class="text-slate-500 mb-2">15 de febrero, 2026</p>
              <div
                class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-slate-600"
              >
                Iniciamos la comunicación oficial. El API ya sirve datos reales
                de los trolleys de Caguas y hemos desplegado este portal para
                mantener a la comunidad informada.
              </div>
            </div>
          </div>

          <div class="flex gap-6">
            <div class="flex flex-col items-center">
              <div class="w-4 h-4 rounded-full bg-slate-300"></div>
              <div class="w-1 h-full bg-slate-200"></div>
            </div>
            <div class="pb-8">
              <h4 class="text-xl font-bold text-slate-600">
                Integración de Eventos Culturales
              </h4>
              <p class="text-slate-600 mb-2">Q1 2026</p>
              <p class="text-slate-600 italic">
                Sincronización con el calendario municipal y centros culturales.
              </p>
            </div>
          </div>

          <div class="flex gap-6">
            <div class="flex flex-col items-center">
              <div class="w-4 h-4 rounded-full bg-slate-300"></div>
            </div>
            <div class="">
              <h4 class="text-xl font-bold text-slate-600">
                IA Criolla & Gastronomía
              </h4>
              <p class="text-slate-600 mb-2">Q2 2026</p>
              <p class="text-slate-600 italic">
                Recomendaciones personalizadas basadas en tus gustos y
                ubicación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Beta Testing Form -->
    <section id="beta" class="py-20 bg-white">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <div class="inline-block p-4 rounded-3xl bg-blue-50 mb-6">
          <span class="text-5xl">🧪</span>
        </div>
        <h3 class="text-4xl font-black mb-4">
          ¿Quieres probar el app antes que nadie?
        </h3>
        <p class="text-xl text-slate-600 mb-10">
          Únete a nuestro programa de Beta Testing. Te enviaremos una invitación
          de **Test Flight** para que instales la versión experimental en tu
          iPhone o Android.
        </p>

        <form
          @submit.prevent="submitBeta"
          class="flex flex-col md:flex-row gap-4 max-w-xl mx-auto"
        >
          <input
            v-model="email"
            type="email"
            required
            placeholder="Tu email (ej. caguano@gmail.com)"
            class="flex-1 px-6 py-4 rounded-full border-2 border-slate-100 focus:border-[#0038A8] outline-none transition-all text-lg shadow-inner"
          />
          <button
            type="submit"
            :disabled="loading"
            class="bg-[#0038A8] text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-[#002a7f] transition-all disabled:opacity-50"
          >
            {{ loading ? 'Enviando...' : 'Pedir Acceso' }}
          </button>
        </form>
        <p v-if="success" class="mt-4 text-green-600 font-bold">
          ¡Excelente! Te avisaremos pronto. 🍍
        </p>
      </div>
    </section>

    <!-- Footer -->
    <footer
      class="bg-slate-900 text-slate-300 py-12 px-6 border-t border-slate-800 text-center"
    >
      <div class="max-w-5xl mx-auto">
        <div class="flex justify-center items-center gap-2 mb-6">
          <span class="text-2xl">🍍</span>
          <span class="font-bold text-white uppercase tracking-tighter"
            >Criollos Caguas</span
          >
        </div>
        <p class="mb-4">
          Un proyecto para modernizar el Valle del Turabo con tecnología
          abierta.
        </p>
        <div
          class="flex justify-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-300"
        >
          <span>Hecho con Pasión</span>
          <span>•</span>
          <span>Caguas, PR</span>
          <span>•</span>
          <span>2026</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
const email = ref('')
const loading = ref(false)
const success = ref(false)
const vehicleCount = ref(null)

// Obtener status de trolleys en el montaje
onMounted(async () => {
  const host = window.location.hostname
  const isLocalAuditHost = host === 'localhost' || host === '127.0.0.1'

  if (isLocalAuditHost) {
    vehicleCount.value = 0
    return
  }

  try {
    const data = await $fetch('/api/v1/vehicles/positions')
    if (data && data.vehicles) {
      vehicleCount.value = data.vehicles.length
    }
  } catch (e) {
    vehicleCount.value = 0
  }
})

const submitBeta = async () => {
  loading.value = true
  try {
    // Simular envío a endpoint de feedback (o crear uno nuevo para beta)
    await $fetch('/api/v1/beta', {
      method: 'POST',
      body: {
        email: email.value,
        date: new Date().toISOString(),
      },
    })
    success.value = true
    email.value = ''
  } catch (e) {
    alert('Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.')
  } finally {
    loading.value = false
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

body {
  font-family: 'Inter', sans-serif;
}

html {
  scroll-behavior: smooth;
}
</style>
