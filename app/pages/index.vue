<template>
  <div class="flex flex-col">
    <!-- Hero Section -->
    <header
      class="relative bg-gradient-to-b from-[#0038A8] to-[#002a7f] text-white py-20 px-6 overflow-hidden"
    >
      <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <span class="text-[20rem] leading-none" aria-hidden="true">🍍</span>
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

        <nav class="flex flex-wrap gap-4" aria-label="Navegación principal">
          <NuxtLink
            to="/discovery"
            class="bg-[#CE1126] hover:bg-[#b00e20] text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg text-center"
          >
            Descubrir Caguas
          </NuxtLink>
          <NuxtLink
            to="/eventos"
            class="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-bold text-lg transition-all text-center"
          >
            Agenda Cultural
          </NuxtLink>
          <NuxtLink
            to="/gastronomia"
            class="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-bold text-lg transition-all text-center"
          >
            Ruta Gastronómica
          </NuxtLink>
          <NuxtLink
            to="/cerca"
            class="bg-white/10 hover:bg-white/20 backdrop-blur-md text-[#FFD700] border border-[#FFD700]/30 px-8 py-4 rounded-full font-bold text-lg transition-all text-center"
          >
            Cerca de ti
          </NuxtLink>
        </nav>

        <!-- Global Search Bar -->
        <div class="mt-12 max-w-2xl" role="search">
          <div class="relative group">
            <div
              class="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none"
            >
              <span class="text-2xl" aria-hidden="true">🔍</span>
            </div>
            <input
              v-model="searchQuery"
              @input="handleSearch"
              @keydown.down.prevent="moveActiveIndex(1)"
              @keydown.up.prevent="moveActiveIndex(-1)"
              @keydown.enter.prevent="selectActiveResult"
              @keydown.esc="closeSearch"
              type="text"
              placeholder="Busca rutas, paradas, eventos o comida..."
              class="w-full bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-blue-200 text-xl px-16 py-5 rounded-3xl outline-none focus:bg-white/20 focus:border-white/40 transition-all shadow-2xl"
              aria-label="Buscador global de Criollos"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="searchResults.length > 0"
              aria-haspopup="listbox"
              :aria-controls="
                searchResults.length ? 'search-results-list' : undefined
              "
              :aria-activedescendant="
                activeIndex >= 0 ? `result-item-${activeIndex}` : undefined
              "
            />
            <div
              v-if="searchLoading"
              class="absolute inset-y-0 right-0 pr-6 flex items-center"
              aria-hidden="true"
            >
              <div
                class="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
              ></div>
            </div>
          </div>

          <!-- Search Results Dropdown -->
          <div
            v-if="searchResults.length"
            id="search-results-list"
            role="listbox"
            aria-label="Resultados de búsqueda"
            class="absolute mt-4 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-50 border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <div class="max-h-[60vh] overflow-y-auto p-2">
              <div
                v-for="(result, index) in searchResults"
                :key="result.id"
                :id="`result-item-${index}`"
                role="option"
                :aria-selected="index === activeIndex"
                class="group p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer border border-transparent flex items-start gap-4"
                :class="{
                  'bg-slate-50 border-slate-100': index === activeIndex,
                }"
                @click="navigateResult(result)"
                @mouseenter="activeIndex = index"
              >
                <div
                  class="bg-slate-100 p-3 rounded-xl text-2xl group-hover:bg-white shadow-sm"
                  aria-hidden="true"
                >
                  {{ resultTypeEmoji(result.type) }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <h4
                      class="font-bold text-slate-900 group-hover:text-[#0038A8] transition-colors"
                    >
                      {{ result.title }}
                    </h4>
                    <span
                      class="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-500 rounded-md"
                    >
                      {{ resultTypeLabel(result.type) }}
                    </span>
                  </div>
                  <p class="text-sm text-slate-500 mt-0.5">
                    {{ result.subtitle }}
                  </p>
                  <p
                    v-if="result.description"
                    class="text-sm text-slate-400 mt-2 line-clamp-1 italic"
                  >
                    {{ result.description }}
                  </p>
                </div>
              </div>
            </div>
            <div
              class="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-widest"
            >
              <span aria-live="polite"
                >{{ searchResults.length }} resultados encontrados</span
              >
              <span>Usa flechas para navegar</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main>
      <!-- Live Status Section -->
      <section
        class="py-12 bg-white border-b border-slate-100"
        aria-labelledby="live-status-heading"
      >
        <h3 id="live-status-heading" class="sr-only">
          Estado del servicio ahora mismo
        </h3>
        <div class="max-w-5xl mx-auto px-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div class="flex items-center gap-3 mb-2 text-[#0038A8]">
                <span class="text-2xl" aria-hidden="true">🚍</span>
                <span class="font-bold uppercase text-sm tracking-widest"
                  >Trolleys Activos</span
                >
              </div>
              <div
                class="text-4xl font-black text-slate-800 tracking-tighter"
                aria-live="polite"
              >
                {{ vehicleCount !== null ? vehicleCount : '...' }}
              </div>
              <p class="text-slate-500 text-sm mt-1 italic">
                Actualizado en tiempo real
              </p>
            </div>

            <NuxtLink
              to="/eventos"
              class="group bg-slate-50 p-6 rounded-2xl border border-slate-100 transition hover:border-[#CE1126]/30 hover:shadow-sm"
            >
              <div class="flex items-center gap-3 mb-2 text-[#CE1126]">
                <span class="text-2xl" aria-hidden="true">🎭</span>
                <span class="font-bold uppercase text-sm tracking-widest"
                  >Agenda Cultural</span
                >
              </div>
              <div
                class="text-4xl font-black text-slate-800 tracking-tighter group-hover:text-[#CE1126]"
              >
                Nueva
              </div>
              <p class="text-slate-500 text-sm mt-1 italic">
                Explora qué está pasando en Caguas
              </p>
            </NuxtLink>

            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div class="flex items-center gap-3 mb-2 text-[#FFD700]">
                <span class="text-2xl" aria-hidden="true">✨</span>
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

      <!-- Operational Health -->
      <section
        class="py-12 bg-slate-900 text-white border-b border-slate-800"
        aria-labelledby="health-heading"
      >
        <div class="max-w-5xl mx-auto px-6">
          <div
            class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8"
          >
            <div>
              <p
                class="text-sm font-black uppercase tracking-[0.2em] text-[#FFD700] mb-2"
              >
                Salud operativa
              </p>
              <h3 id="health-heading" class="text-3xl font-bold">
                ¿Está corriendo bien el sistema?
              </h3>
              <p class="text-slate-300 mt-2 max-w-2xl">
                Resumen público del tracking para saber si el servicio está
                saludable, degradado o sin señal antes de inspeccionar cada
                unidad.
              </p>
            </div>
            <div
              class="inline-flex items-center rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest"
              role="status"
              :class="
                serviceHealthTone === 'healthy'
                  ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40'
                  : serviceHealthTone === 'warning'
                    ? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/40'
                    : serviceHealthTone === 'critical'
                      ? 'bg-rose-500/15 text-rose-100 ring-1 ring-rose-300/40'
                      : 'bg-white/10 text-slate-100 ring-1 ring-white/15'
              "
            >
              {{ serviceHealthLabel }}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <article
              v-for="card in trackingHealthCards"
              :key="card.id"
              class="rounded-3xl border p-5"
              :class="
                card.tone === 'healthy'
                  ? 'border-emerald-400/30 bg-emerald-500/10'
                  : card.tone === 'warning'
                    ? 'border-amber-300/30 bg-amber-500/10'
                    : card.tone === 'critical'
                      ? 'border-rose-300/30 bg-rose-500/10'
                      : 'border-white/10 bg-white/5'
              "
            >
              <h4
                class="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-2"
              >
                {{ card.label }}
              </h4>
              <p
                class="text-3xl font-black text-white leading-tight"
                aria-live="polite"
              >
                {{ card.value }}
              </p>
              <p class="text-sm text-slate-300 mt-3 leading-relaxed">
                {{ card.hint }}
              </p>
            </article>
          </div>

          <div
            v-if="trackingAlertRoutes.length"
            class="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6"
            aria-live="polite"
          >
            <div
              class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4"
            >
              <div>
                <h4 class="text-xl font-black text-white">
                  Rutas que necesitan atención
                </h4>
                <p class="text-sm text-slate-300 mt-1">
                  Se listan solo las rutas retrasadas, offline o sin señal para
                  que el ciudadano entienda rápido si hay degradación real.
                </p>
              </div>
              <span
                class="text-xs font-black uppercase tracking-widest text-slate-300"
              >
                {{ trackingAlertRoutes.length }} alertas activas
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <article
                v-for="route in trackingAlertRoutes"
                :key="route.id"
                class="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p
                      class="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2"
                    >
                      Ruta {{ route.routeId || 'N/D' }}
                    </p>
                    <h5 class="text-lg font-black text-white">
                      {{ route.routeName }}
                    </h5>
                  </div>
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                    :class="
                      route.tone === 'warning'
                        ? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/40'
                        : 'bg-rose-500/15 text-rose-100 ring-1 ring-rose-300/40'
                    "
                  >
                    {{ route.label }}
                  </span>
                </div>
                <p class="text-sm text-slate-300 mt-3 leading-relaxed">
                  {{ route.hint }}
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- Live Trolley Board -->
      <section
        class="py-16 bg-slate-50 border-b border-slate-200"
        aria-labelledby="trolley-board-heading"
      >
        <div class="max-w-5xl mx-auto px-6">
          <div
            class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
          >
            <div>
              <p
                class="text-sm font-black uppercase tracking-[0.2em] text-[#0038A8] mb-2"
              >
                Trolley Board
              </p>
              <h3
                id="trolley-board-heading"
                class="text-3xl font-bold text-slate-900"
              >
                Movimiento en vivo por Caguas
              </h3>
              <p class="text-slate-600 mt-2 max-w-2xl">
                Mira qué unidades están activas ahora mismo, su ruta y la
                próxima parada reportada.
              </p>
            </div>
            <p
              class="text-sm text-slate-500 font-bold"
              role="status"
              aria-live="polite"
            >
              {{
                lastUpdatedLabel
                  ? `Última lectura: ${lastUpdatedLabel}`
                  : 'Esperando datos en vivo…'
              }}
            </p>
          </div>

          <div v-if="topVehicles.length" class="space-y-8">
            <div
              v-if="upcomingStops.length"
              class="space-y-4"
              aria-label="Próximas paradas con llegadas visibles"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <h4 class="text-xl font-black text-slate-900">
                    Próximas paradas con movimiento
                  </h4>
                  <p class="text-sm text-slate-600">
                    Agrupamos las llegadas visibles por parada para detectar
                    rápido dónde viene el próximo trolley.
                  </p>
                </div>
                <span
                  class="text-xs font-black uppercase tracking-widest text-slate-500"
                >
                  {{ upcomingStops.length }} paradas visibles
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <article
                  v-for="stop in upcomingStops"
                  :key="stop.stopKey"
                  class="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p
                        class="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2"
                      >
                        Próxima parada visible
                      </p>
                      <h5
                        class="text-lg font-black text-slate-900 leading-tight"
                      >
                        {{ stop.name }}
                      </h5>
                      <p class="text-sm text-slate-600 mt-1">
                        {{
                          stop.routeNames.length
                            ? stop.routeNames.join(' · ')
                            : routeIdListCopy(stop.routeIds)
                        }}
                      </p>
                    </div>
                    <span
                      class="inline-flex items-center rounded-full bg-[#0038A8]/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-[#0038A8]"
                    >
                      {{ etaCopy(stop.nextArrivalEtaSeconds) }}
                    </span>
                  </div>

                  <dl class="grid grid-cols-2 gap-3 text-sm">
                    <div
                      class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                    >
                      <dt
                        class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                      >
                        Llegadas visibles
                      </dt>
                      <dd class="text-slate-900 font-bold">
                        {{ stop.arrivalCount }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                    >
                      <dt
                        class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                      >
                        En vivo ahora
                      </dt>
                      <dd class="text-slate-900 font-bold">
                        {{ stop.liveVehicleCount }}
                      </dd>
                    </div>
                  </dl>

                  <ul class="space-y-2 text-sm text-slate-600">
                    <li
                      v-for="vehicle in stop.vehicles.slice(0, 3)"
                      :key="`${stop.stopKey}-${vehicle.assetId}`"
                      class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                    >
                      <div>
                        <p class="font-bold text-slate-900">
                          {{ vehicle.label }}
                        </p>
                        <p
                          class="text-xs uppercase tracking-widest text-slate-500 mt-1"
                        >
                          {{ vehicle.routeName || `Ruta ${vehicle.routeId}` }}
                        </p>
                      </div>
                      <span
                        class="text-xs font-black uppercase tracking-widest text-slate-500 text-right"
                      >
                        {{ etaCopy(vehicle.nextStopEtaSeconds) }}
                      </span>
                    </li>
                  </ul>
                </article>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <article
                v-for="vehicle in topVehicles"
                :key="vehicle.assetId"
                class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p
                      class="text-xs font-black uppercase tracking-[0.2em] text-[#0038A8] mb-2"
                    >
                      {{ vehicle.routeName || 'Ruta activa' }}
                    </p>
                    <h4
                      class="text-2xl font-black text-slate-900 leading-tight"
                    >
                      {{ vehicle.label }}
                    </h4>
                  </div>
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                    :class="
                      vehicle.freshnessLabel === 'live'
                        ? 'bg-emerald-100 text-emerald-700'
                        : vehicle.freshnessLabel === 'stale'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                    "
                  >
                    {{ freshnessCopy(vehicle.freshnessLabel) }}
                  </span>
                </div>

                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div
                    class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                  >
                    <dt
                      class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                    >
                      Próxima parada
                    </dt>
                    <dd class="text-slate-900 font-bold">
                      {{ vehicle.nextStop?.name || 'Sin parada reportada' }}
                    </dd>
                    <p class="text-slate-500 mt-1">
                      {{ etaCopy(vehicle.nextStopEtaSeconds) }}
                    </p>
                  </div>
                  <div
                    class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                  >
                    <dt
                      class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                    >
                      Dirección
                    </dt>
                    <dd class="text-slate-900 font-bold">
                      {{ directionLabel(vehicle) }}
                    </dd>
                  </div>
                  <div
                    class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                  >
                    <dt
                      class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                    >
                      Estado
                    </dt>
                    <dd class="text-slate-900 font-bold capitalize">
                      {{ vehicle.statusLabel }}
                    </dd>
                  </div>
                  <div
                    class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                  >
                    <dt
                      class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                    >
                      Actualización
                    </dt>
                    <dd class="text-slate-900 font-bold">
                      {{ freshnessTime(vehicle.freshnessSeconds) }}
                    </dd>
                  </div>
                </dl>

                <p
                  class="text-sm text-slate-600 leading-relaxed min-h-[2.5rem]"
                >
                  {{
                    vehicle.message ||
                    'Sin mensaje operativo reportado por la unidad.'
                  }}
                </p>
              </article>
            </div>

            <div v-if="routeCards.length" class="space-y-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <h4 class="text-xl font-black text-slate-900">
                    Estado por ruta
                  </h4>
                  <p class="text-sm text-slate-600">
                    Cada tarjeta ya sale resumida desde el API para web y app,
                    sin recomputar el snapshot completo en cliente.
                  </p>
                </div>
                <span
                  class="text-xs font-black uppercase tracking-widest text-slate-500"
                >
                  {{ routeCards.length }} rutas visibles
                </span>
              </div>

              <div
                class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                aria-label="Resumen por ruta"
              >
                <article
                  v-for="route in routeCards"
                  :key="route.routeId"
                  class="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p
                        class="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2"
                      >
                        Ruta {{ route.routeId }}
                      </p>
                      <h5
                        class="text-lg font-black text-slate-900 leading-tight"
                      >
                        {{ route.routeName || 'Ruta activa' }}
                      </h5>
                      <p class="text-sm text-slate-600 mt-1">
                        {{ directionLabel(route) }}
                      </p>
                    </div>
                    <span
                      class="inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
                      :class="
                        route.liveVehicles > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : route.staleVehicles > 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      "
                    >
                      {{ routeStatusCopy(route) }}
                    </span>
                  </div>

                  <dl class="grid grid-cols-2 gap-3 text-sm">
                    <div
                      class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                    >
                      <dt
                        class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                      >
                        Unidades
                      </dt>
                      <dd class="text-slate-900 font-bold">
                        {{ route.totalVehicles }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100"
                    >
                      <dt
                        class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                      >
                        En vivo
                      </dt>
                      <dd class="text-slate-900 font-bold">
                        {{ route.liveVehicles }}
                      </dd>
                    </div>
                  </dl>

                  <div
                    class="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100 text-sm"
                  >
                    <p
                      class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1"
                    >
                      Unidad líder
                    </p>
                    <p class="text-slate-900 font-bold">
                      {{ route.leadVehicle?.label || 'Sin unidad priorizada' }}
                    </p>
                    <p class="text-slate-600 mt-1">
                      {{
                        route.leadVehicle?.nextStopName
                          ? `Próxima parada: ${route.leadVehicle.nextStopName}`
                          : 'Sin próxima parada reportada'
                      }}
                    </p>
                    <p class="text-slate-500 mt-1">
                      {{
                        route.leadVehicle?.nextStopName
                          ? etaCopy(route.leadVehicle.nextStopEtaSeconds)
                          : 'Sin ETA local disponible'
                      }}
                    </p>
                    <p class="text-slate-500 mt-1">
                      {{
                        route.leadVehicle
                          ? `${statusCopy(route.leadVehicle.statusLabel)} · ${freshnessTime(route.leadVehicle.freshnessSeconds)}`
                          : 'Sin telemetría disponible'
                      }}
                    </p>
                  </div>

                  <p class="text-sm text-slate-500">
                    {{
                      route.lastReportedAt
                        ? `Último reporte de la ruta: ${formatDateTime(route.lastReportedAt)}`
                        : 'La ruta no tiene hora válida reportada todavía.'
                    }}
                  </p>
                </article>
              </div>
            </div>
          </div>

          <div
            v-else
            class="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-600"
            aria-live="polite"
          >
            No hay unidades activas reportadas ahora mismo. Vuelve a intentar en
            unos minutos.
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
                  Iniciamos la comunicación oficial. El API ya sirve datos
                  reales de los trolleys de Caguas y hemos desplegado este
                  portal para mantener a la comunidad informada.
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
                  Sincronización con el calendario municipal y centros
                  culturales.
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
      <section id="beta" class="py-20 bg-white" aria-labelledby="beta-heading">
        <div class="max-w-3xl mx-auto px-6 text-center">
          <div class="inline-block p-4 rounded-3xl bg-blue-50 mb-6">
            <span class="text-5xl" role="img" aria-label="Laboratorio">🧪</span>
          </div>
          <h3 id="beta-heading" class="text-4xl font-black mb-4">
            ¿Quieres probar el app antes que nadie?
          </h3>
          <p class="text-xl text-slate-600 mb-10">
            Únete a nuestro programa de Beta Testing. Te enviaremos una
            invitación de **Test Flight** para que instales la versión
            experimental en tu iPhone o Android.
          </p>

          <form
            @submit.prevent="submitBeta"
            class="flex flex-col md:flex-row gap-4 max-w-xl mx-auto"
            aria-label="Formulario de registro para beta"
          >
            <input
              v-model="email"
              type="email"
              required
              placeholder="Tu email (ej. caguano@gmail.com)"
              class="flex-1 px-6 py-4 rounded-full border-2 border-slate-100 focus:border-[#0038A8] outline-none transition-all text-lg shadow-inner"
              aria-label="Email para invitación beta"
            />
            <button
              type="submit"
              :disabled="loading"
              class="bg-[#0038A8] text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-[#002a7f] transition-all disabled:opacity-50"
            >
              {{ loading ? 'Enviando...' : 'Pedir Acceso' }}
            </button>
          </form>
          <p v-if="success" class="mt-4 text-green-600 font-bold" role="status">
            ¡Excelente! Te avisaremos pronto. 🍍
          </p>
        </div>
      </section>
    </main>

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
import {
  getTrackingAlertRoutes,
  getTrackingHealthCards,
} from '../utils/trackingHealth'

const email = ref('')
const loading = ref(false)
const success = ref(false)
const vehicleCount = ref(null)
const topVehicles = ref([])
const routeCards = ref([])
const upcomingStops = ref([])
const trackingHealthCards = ref(getTrackingHealthCards(null, 0))
const trackingAlertRoutes = ref([])
const serviceHealthLabel = ref('Sin lectura')
const serviceHealthTone = ref('neutral')
const lastUpdatedLabel = ref('')

// Global Search
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const activeIndex = ref(-1)
let searchTimeout = null

const handleSearch = () => {
  activeIndex.value = -1
  if (searchTimeout) clearTimeout(searchTimeout)

  const q = searchQuery.value.trim()
  if (q.length < 2) {
    searchResults.value = []
    return
  }

  searchLoading.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const config = useRuntimeConfig()
      const apiKey =
        config.public.apiKey ||
        '118884a9d701e5b0ab4f44322568a3c548fb3efb9f22b1b64f8c446224224c2b'

      const data = await $fetch('/api/v1/search', {
        query: { q },
        headers: {
          'x-api-key': apiKey,
        },
      })

      searchResults.value = data?.results || []
    } catch (e) {
      console.error('Search error:', e)
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 300)
}

const resultTypeEmoji = (type) => {
  const map = {
    route: '🚍',
    stop: '📍',
    evento: '🎭',
    gastronomia: '🍍',
  }
  return map[type] || '✨'
}

const resultTypeLabel = (type) => {
  const map = {
    route: 'Ruta',
    stop: 'Parada',
    evento: 'Evento',
    gastronomia: 'Comida',
  }
  return map[type] || 'Info'
}

const navigateResult = (result) => {
  if (result.type === 'evento') {
    return navigateTo('/eventos')
  }
  if (result.type === 'gastronomia') {
    return navigateTo('/gastronomia')
  }
  if (result.type === 'route' || result.type === 'stop') {
    return navigateTo('/discovery') // Fallback for now
  }
}

const moveActiveIndex = (delta) => {
  if (!searchResults.value.length) return
  activeIndex.value =
    (activeIndex.value + delta + searchResults.value.length) %
    searchResults.value.length
}

const selectActiveResult = () => {
  if (activeIndex.value >= 0 && searchResults.value[activeIndex.value]) {
    navigateResult(searchResults.value[activeIndex.value])
  }
}

const closeSearch = () => {
  searchResults.value = []
  searchQuery.value = ''
  activeIndex.value = -1
}

const freshnessCopy = (label) => {
  if (label === 'live') return 'En vivo'
  if (label === 'stale') return 'Demorado'
  return 'Sin señal'
}

const freshnessTime = (seconds) => {
  if (seconds === null || seconds === undefined) {
    return 'Sin hora'
  }

  if (seconds < 60) {
    return 'Hace menos de 1 min'
  }

  const minutes = Math.round(seconds / 60)
  return `Hace ${minutes} min`
}

const etaCopy = (seconds) => {
  if (seconds === null || seconds === undefined) {
    return 'Sin ETA local disponible'
  }

  if (seconds <= 0) {
    return 'Llegando a la próxima parada'
  }

  if (seconds < 60) {
    return `Próxima parada en ~${seconds} seg`
  }

  const minutes = Math.round(seconds / 60)
  return `Próxima parada en ~${minutes} min`
}

const statusCopy = (label) => {
  if (label === 'moving') return 'En movimiento'
  if (label === 'stopped') return 'Detenido'
  if (label === 'idle') return 'En espera'
  return 'Sin estado'
}

const routeStatusCopy = (route) => {
  if (route.liveVehicles > 0) return 'Operando'
  if (route.staleVehicles > 0) return 'Demorada'
  return 'Sin señal'
}

const formatDateTime = (value) => {
  try {
    return new Intl.DateTimeFormat('es-PR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

const directionLabel = (vehicle) => {
  if (vehicle.directionStartName && vehicle.directionEndName) {
    return `${vehicle.directionStartName} → ${vehicle.directionEndName}`
  }

  if (vehicle.routeName) {
    return vehicle.routeName
  }

  return 'Dirección no disponible'
}

const routeIdListCopy = (routeIds) => {
  if (!Array.isArray(routeIds) || !routeIds.length) {
    return 'Sin rutas visibles'
  }

  return routeIds.map((routeId) => `Ruta ${routeId}`).join(' · ')
}

// Obtener status de trolleys en el montaje
onMounted(async () => {
  const host = window.location.hostname
  const isLocalAuditHost = host === 'localhost' || host === '127.0.0.1'

  if (isLocalAuditHost) {
    vehicleCount.value = 0
    topVehicles.value = []
    routeCards.value = []
    upcomingStops.value = []
    trackingHealthCards.value = getTrackingHealthCards(null, 0)
    trackingAlertRoutes.value = []
    serviceHealthLabel.value = 'Sin lectura'
    serviceHealthTone.value = 'neutral'
    return
  }

  try {
    const config = useRuntimeConfig()
    const apiKey =
      config.public.apiKey ||
      '118884a9d701e5b0ab4f44322568a3c548fb3efb9f22b1b64f8c446224224c2b'

    const data = await $fetch('/api/v1/tracking', {
      headers: {
        'x-api-key': apiKey,
      },
    })

    const vehicles = Array.isArray(data?.vehicles) ? data.vehicles : []
    vehicleCount.value = vehicles.length
    topVehicles.value = vehicles
      .slice()
      .sort((a, b) => {
        const aFreshness = a.freshnessSeconds ?? Number.MAX_SAFE_INTEGER
        const bFreshness = b.freshnessSeconds ?? Number.MAX_SAFE_INTEGER
        return aFreshness - bFreshness
      })
      .slice(0, 3)

    routeCards.value = Array.isArray(data?.summary?.routes)
      ? data.summary.routes.slice(0, 6)
      : []
    upcomingStops.value = Array.isArray(data?.summary?.upcomingStops)
      ? data.summary.upcomingStops.slice(0, 6)
      : []
    trackingHealthCards.value = getTrackingHealthCards(
      data?.summary,
      vehicles.length
    )
    trackingAlertRoutes.value = getTrackingAlertRoutes(data?.summary)

    if (data?.summary?.serviceHealth?.status === 'healthy') {
      serviceHealthLabel.value = 'Sistema saludable'
      serviceHealthTone.value = 'healthy'
    } else if (data?.summary?.serviceHealth?.status === 'degraded') {
      serviceHealthLabel.value = 'Sistema degradado'
      serviceHealthTone.value = 'warning'
    } else if (data?.summary?.serviceHealth?.status === 'offline') {
      serviceHealthLabel.value = 'Sistema sin servicio'
      serviceHealthTone.value = 'critical'
    } else {
      serviceHealthLabel.value = 'Sin lectura'
      serviceHealthTone.value = 'neutral'
    }

    if (data?.fetchedAt) {
      lastUpdatedLabel.value = formatDateTime(data.fetchedAt)
    }
  } catch (e) {
    console.error('Error fetching vehicle positions:', e)
    vehicleCount.value = 0
    topVehicles.value = []
    routeCards.value = []
    upcomingStops.value = []
    trackingHealthCards.value = getTrackingHealthCards(null, 0)
    trackingAlertRoutes.value = []
    serviceHealthLabel.value = 'Sin lectura'
    serviceHealthTone.value = 'neutral'
    lastUpdatedLabel.value = ''
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
