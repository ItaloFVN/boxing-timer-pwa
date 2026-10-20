/**
 * BOXTIMER PRO — Timer de Boxe Profissional (PWA)
 * - Web Audio API Sintetizada (Campainha/Gongo metálico, Clapper de 10s, Bips de contagem)
 * - Cronômetro de alta precisão sem drift (baseado em performance.now())
 * - Screen Wake Lock API para manter a tela ligada durante o treino
 */

class BoxingAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Toca o gongo/campainha metálica de boxe usando síntese aditiva inarmônica
   * @param {number} strikes Número de batidas (1 = Início do Round, 2 = Fim do Round, 3 = Fim do Treino)
   */
  playGong(strikes = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const spacing = 0.24; // intervalo entre batidas múltiplas
    for (let s = 0; s < strikes; s++) {
      this._strikeBell(this.ctx.currentTime + s * spacing);
    }
  }

  _strikeBell(startTime) {
    const ctx = this.ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.95, startTime);
    masterGain.connect(ctx.destination);

    // 1. Impacto físico do martelo de aço no bronze (transiente percussivo de 35ms)
    const bufferSize = Math.floor(ctx.sampleRate * 0.045);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const impactFilter = ctx.createBiquadFilter();
    impactFilter.type = 'bandpass';
    impactFilter.frequency.setValueAtTime(3400, startTime);
    impactFilter.Q.setValueAtTime(1.8, startTime);

    const impactGain = ctx.createGain();
    impactGain.gain.setValueAtTime(0.9, startTime);
    impactGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

    noise.connect(impactFilter);
    impactFilter.connect(impactGain);
    impactGain.connect(masterGain);
    noise.start(startTime);

    // 2. Modulação FM inicial ("clang" metálico do ataque da campainha de ringue)
    const fmMod = ctx.createOscillator();
    const fmModGain = ctx.createGain();
    fmMod.type = 'sine';
    fmMod.frequency.setValueAtTime(1123, startTime);
    fmModGain.gain.setValueAtTime(420, startTime);
    fmModGain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.18);
    fmMod.connect(fmModGain);
    fmMod.start(startTime);
    fmMod.stop(startTime + 0.2);

    // 3. Modos acústicos reais de um gongo/campainha de bronze de boxe (com batimento acústico / shimmer)
    // Pares levemente desafinados (+4.5Hz / +7Hz) criam a oscilação metálica característica do bronze vibrando
    const bellModes = [
      { freq: 784.0,  amp: 0.48, decay: 2.35, fm: true },  // Fundamental do sino de bronze (G5)
      { freq: 788.4,  amp: 0.34, decay: 2.15, fm: false }, // Par de batimento acústico (shimmer)
      { freq: 1568.0, amp: 0.36, decay: 1.65, fm: true },  // Modo 2:0 (oitava brilhante)
      { freq: 1574.8, amp: 0.24, decay: 1.45, fm: false }, // Batimento do modo superior
      { freq: 2161.5, amp: 0.28, decay: 1.05, fm: true },  // Modo inarmônico 2.756 (timbre de campainha)
      { freq: 3026.0, amp: 0.20, decay: 0.65, fm: false }, // Modo 3.86 (brilho metálico)
      { freq: 4061.0, amp: 0.14, decay: 0.35, fm: false }, // Modo 5.18 (ataque da borda)
      { freq: 5280.0, amp: 0.09, decay: 0.16, fm: false }  // Harmônico agudo do impacto
    ];

    bellModes.forEach((mode) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(mode.freq, startTime);
      if (mode.fm) {
        fmModGain.connect(osc.frequency);
      }

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(mode.amp, startTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(mode.amp * 0.35, startTime + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + mode.decay);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + mode.decay + 0.05);
    });
  }

  /**
   * Toca um apito esportivo realista (com modulação de bolinha/trinado e sopro) para os últimos 10 segundos
   */
  playTenSecondWarning() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Dois sopros de apito ("Fiu-Fiiiu!") típicos de aviso de 10 segundos no treino
    this._blowWhistle(now, 0.16);
    this._blowWhistle(now + 0.22, 0.36);
  }

  _blowWhistle(startTime, duration) {
    const ctx = this.ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, startTime);
    masterGain.gain.linearRampToValueAtTime(0.75, startTime + 0.018);
    masterGain.gain.setValueAtTime(0.75, startTime + Math.max(0.02, duration - 0.04));
    masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    masterGain.connect(ctx.destination);

    // LFO que simula a bolinha de cortiça girando dentro do apito (~30 Hz de trinado)
    const peaLfo = ctx.createOscillator();
    const peaFreqGain = ctx.createGain();
    const peaAmpGain = ctx.createGain();

    peaLfo.type = 'sine';
    peaLfo.frequency.setValueAtTime(30, startTime);
    peaFreqGain.gain.setValueAtTime(65, startTime); // Variação de frequência do trinado
    peaAmpGain.gain.setValueAtTime(0.22, startTime);

    peaLfo.connect(peaFreqGain);
    peaLfo.connect(peaAmpGain);
    peaAmpGain.connect(masterGain.gain);

    // Duas câmaras ressonantes de um apito esportivo (ex: ~2820 Hz e ~2960 Hz)
    const freqs = [2820, 2965];
    freqs.forEach((baseFreq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      // Leve subida de afinação no ataque do sopro
      osc.frequency.setValueAtTime(baseFreq * 0.96, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, startTime + 0.025);
      peaFreqGain.connect(osc.frequency);

      oscGain.gain.setValueAtTime(idx === 0 ? 0.55 : 0.38, startTime);
      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    });

    // Ruído de sopro/ar passando pelo bocal do apito
    const airBufferSize = Math.floor(ctx.sampleRate * duration);
    const airBuffer = ctx.createBuffer(1, airBufferSize, ctx.sampleRate);
    const airData = airBuffer.getChannelData(0);
    for (let i = 0; i < airBufferSize; i++) {
      airData[i] = Math.random() * 2 - 1;
    }
    const airSource = ctx.createBufferSource();
    airSource.buffer = airBuffer;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.setValueAtTime(2900, startTime);
    airFilter.Q.setValueAtTime(5.5, startTime);

    const airGain = ctx.createGain();
    airGain.gain.setValueAtTime(0.18, startTime);

    airSource.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(masterGain);

    peaLfo.start(startTime);
    peaLfo.stop(startTime + duration + 0.02);
    airSource.start(startTime);
    airSource.stop(startTime + duration);
  }

  /**
   * Bip curto para os últimos 3, 2, 1 segundos
   */
  playCountdownPip(freq = 880) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.38, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }
}

// ============================================================================
// Aplicação Principal do Timer
// ============================================================================

const STORAGE_KEY = 'boxtimer_pro_config_v1';

const DEFAULT_CONFIG = {
  roundSeconds: 180, // 3 minutos
  restSeconds: 60,   // 1 minuto
  totalRounds: 5,    // 5 rounds
  prepSeconds: 5,    // 5s de preparação antes do Round 1
  warnLast10: true   // Aviso sonoro e visual nos 10s finais
};

const THEME_COLORS = {
  'state-idle': '#090b10',
  'state-prep': '#082f49',
  'state-work': '#043927',
  'state-warning': '#78350f',
  'state-rest': '#691212',
  'state-finished': '#172554'
};

class BoxingTimerApp {
  constructor() {
    this.audio = new BoxingAudioEngine();
    this.config = this.loadConfig();
    this.draftConfig = { ...this.config };

    // Estado interno do Timer
    this.phase = 'IDLE'; // IDLE | PREP | WORK | REST | FINISHED
    this.currentRound = 1;
    this.isRunning = false;
    this.phaseDurationMs = this.config.roundSeconds * 1000;
    this.remainingMs = this.phaseDurationMs;
    this.lastFrameTime = 0;
    this.rafId = null;
    this.lastAnnouncedSecond = null;
    this.warnTriggeredThisRound = false;
    this.wakeLock = null;

    this.cacheDOM();
    this.bindEvents();
    this.setupDialogLightDismissFallback();
    this.renderRoundDots();
    this.updateSummaryUI();
    this.syncUI();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Não foi possível ler configurações salvas:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Não foi possível salvar configurações:', e);
    }
  }

  cacheDOM() {
    this.body = document.body;
    this.themeMeta = document.getElementById('themeColorMeta');
    this.flashOverlay = document.getElementById('flashOverlay');

    this.phaseBadge = document.getElementById('phaseBadge');
    this.roundDisplay = document.getElementById('roundDisplay');
    this.roundDots = document.getElementById('roundDots');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.progressBar = document.getElementById('progressBar');

    this.summaryPill = document.getElementById('summaryPill');
    this.summaryRound = document.getElementById('summaryRound');
    this.summaryRest = document.getElementById('summaryRest');
    this.summaryTotal = document.getElementById('summaryTotal');
    this.summaryWarn = document.getElementById('summaryWarn');
    this.summaryWarnSep = document.getElementById('summaryWarnSep');

    this.startPauseBtn = document.getElementById('startPauseBtn');
    this.startPauseLabel = document.getElementById('startPauseLabel');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.resetBtn = document.getElementById('resetBtn');
    this.skipBtn = document.getElementById('skipBtn');

    this.muteBtn = document.getElementById('muteBtn');
    this.soundOnIcon = document.getElementById('soundOnIcon');
    this.soundOffIcon = document.getElementById('soundOffIcon');

    this.settingsDialog = document.getElementById('settingsDialog');
    this.openSettingsBtn = document.getElementById('openSettingsBtn');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');

    this.cfgRoundValue = document.getElementById('cfgRoundValue');
    this.cfgRestValue = document.getElementById('cfgRestValue');
    this.cfgRoundsValue = document.getElementById('cfgRoundsValue');
    this.cfgPrepValue = document.getElementById('cfgPrepValue');
    this.cfgWarnToggle = document.getElementById('cfgWarnToggle');

    this.testBellBtn = document.getElementById('testBellBtn');
    this.testWarnBtn = document.getElementById('testWarnBtn');
    this.presetChips = document.querySelectorAll('.preset-chip');
    this.stepBtns = document.querySelectorAll('.step-btn');
  }

  bindEvents() {
    // Controles Principais
    this.startPauseBtn.addEventListener('click', () => {
      this.audio.init();
      this.toggleStartPause();
    });

    this.resetBtn.addEventListener('click', () => {
      this.audio.init();
      this.resetTimer();
    });

    this.skipBtn.addEventListener('click', () => {
      this.audio.init();
      this.skipPhase();
    });

    // Botão de Mudo
    this.muteBtn.addEventListener('click', () => {
      this.audio.init();
      this.audio.muted = !this.audio.muted;
      this.muteBtn.classList.toggle('is-muted', this.audio.muted);
      this.soundOnIcon.classList.toggle('hidden', this.audio.muted);
      this.soundOffIcon.classList.toggle('hidden', !this.audio.muted);
    });

    // Abrir / Fechar Modal de Configurações
    const openModal = () => {
      this.audio.init();
      if (this.isRunning) {
        this.pauseTimer();
      }
      this.draftConfig = { ...this.config };
      this.syncSettingsModalUI();
      this.settingsDialog.showModal();
    };

    this.openSettingsBtn.addEventListener('click', openModal);
    this.summaryPill.addEventListener('click', openModal);
    this.closeSettingsBtn.addEventListener('click', () => this.settingsDialog.close());

    // Steppers de ajuste (- / +)
    this.stepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleStepperAction(action);
      });
    });

    // Presets Rápidos
    this.presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.draftConfig.roundSeconds = Number(chip.dataset.round);
        this.draftConfig.restSeconds = Number(chip.dataset.rest);
        this.draftConfig.totalRounds = Number(chip.dataset.rounds);
        this.draftConfig.prepSeconds = Number(chip.dataset.prep);
        this.syncSettingsModalUI();
      });
    });

    this.cfgWarnToggle.addEventListener('change', () => {
      this.draftConfig.warnLast10 = this.cfgWarnToggle.checked;
    });

    // Testar Sons no Modal
    this.testBellBtn.addEventListener('click', () => {
      this.audio.init();
      this.audio.playGong(1);
    });

    this.testWarnBtn.addEventListener('click', () => {
      this.audio.init();
      this.audio.playTenSecondWarning();
    });

    // Salvar Configurações
    this.saveSettingsBtn.addEventListener('click', () => {
      this.config = { ...this.draftConfig };
      this.saveConfig();
      this.settingsDialog.close();
      this.resetTimer();
    });

    // Reativar Wake Lock quando a aba voltar a ficar visível
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isRunning) {
        this.requestWakeLock();
      }
    });
  }

  /**
   * Fallback obrigatório para navegadores sem suporte a <dialog closedby="any"> (ex: Safari iOS)
   */
  setupDialogLightDismissFallback() {
    const dialog = this.settingsDialog;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (isDialogContent) return;
        dialog.close();
      });
    }
  }

  handleStepperAction(action) {
    const c = this.draftConfig;
    switch (action) {
      case 'round-minus':
        c.roundSeconds = Math.max(15, c.roundSeconds - 15);
        break;
      case 'round-plus':
        c.roundSeconds = Math.min(900, c.roundSeconds + 15);
        break;
      case 'rest-minus':
        c.restSeconds = Math.max(10, c.restSeconds - 5);
        break;
      case 'rest-plus':
        c.restSeconds = Math.min(300, c.restSeconds + 5);
        break;
      case 'rounds-minus':
        c.totalRounds = Math.max(1, c.totalRounds - 1);
        break;
      case 'rounds-plus':
        c.totalRounds = Math.min(30, c.totalRounds + 1);
        break;
      case 'prep-minus':
        c.prepSeconds = Math.max(0, c.prepSeconds - 5);
        break;
      case 'prep-plus':
        c.prepSeconds = Math.min(30, c.prepSeconds + 5);
        break;
    }
    this.syncSettingsModalUI();
  }

  syncSettingsModalUI() {
    const c = this.draftConfig;
    this.cfgRoundValue.textContent = this.formatMMSS(c.roundSeconds * 1000);
    this.cfgRestValue.textContent = this.formatMMSS(c.restSeconds * 1000);
    this.cfgRoundsValue.textContent = String(c.totalRounds);
    this.cfgPrepValue.textContent = `${String(c.prepSeconds).padStart(2, '0')}s`;
    this.cfgWarnToggle.checked = Boolean(c.warnLast10);

    this.presetChips.forEach((chip) => {
      const isMatch =
        Number(chip.dataset.round) === c.roundSeconds &&
        Number(chip.dataset.rest) === c.restSeconds &&
        Number(chip.dataset.rounds) === c.totalRounds;
      chip.classList.toggle('active', isMatch);
    });
  }

  // ============================================================================
  // Controle de Estados e Loop de Tempo
  // ============================================================================

  toggleStartPause() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    if (this.phase === 'FINISHED') {
      this.resetTimer();
    }

    if (this.phase === 'IDLE') {
      if (this.config.prepSeconds > 0) {
        this.enterPhase('PREP', this.config.prepSeconds * 1000);
      } else {
        this.enterPhase('WORK', this.config.roundSeconds * 1000);
      }
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.requestWakeLock();
    this.syncUI();
    this.tick();
  }

  pauseTimer() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.releaseWakeLock();
    this.syncUI();
  }

  resetTimer() {
    this.pauseTimer();
    this.phase = 'IDLE';
    this.currentRound = 1;
    this.phaseDurationMs = this.config.roundSeconds * 1000;
    this.remainingMs = this.phaseDurationMs;
    this.lastAnnouncedSecond = null;
    this.warnTriggeredThisRound = false;
    this.renderRoundDots();
    this.updateSummaryUI();
    this.syncUI();
  }

  skipPhase() {
    if (this.phase === 'IDLE') {
      this.enterPhase('WORK', this.config.roundSeconds * 1000);
      this.syncUI();
      return;
    }
    if (this.phase === 'FINISHED') {
      this.resetTimer();
      return;
    }
    this.advanceToNextPhase();
    this.syncUI();
  }

  enterPhase(newPhase, durationMs) {
    this.phase = newPhase;
    this.phaseDurationMs = durationMs;
    this.remainingMs = durationMs;
    this.lastAnnouncedSecond = Math.ceil(durationMs / 1000);
    this.warnTriggeredThisRound = false;

    if (newPhase === 'PREP') {
      this.audio.playCountdownPip(660);
      this.triggerFlash();
    } else if (newPhase === 'WORK') {
      this.audio.playGong(1); // 1 Gongo forte = Início do Round
      this.triggerFlash();
      this.vibrate([250]);
    } else if (newPhase === 'REST') {
      this.audio.playGong(2); // 2 Gongos = Fim do Round / Descanso
      this.triggerFlash();
      this.vibrate([180, 90, 180]);
    } else if (newPhase === 'FINISHED') {
      this.audio.playGong(3); // 3 Gongos = Treino Concluído!
      this.triggerFlash();
      this.vibrate([250, 100, 250, 100, 400]);
      this.pauseTimer();
    }

    this.renderRoundDots();
  }

  advanceToNextPhase() {
    if (this.phase === 'PREP') {
      this.enterPhase('WORK', this.config.roundSeconds * 1000);
    } else if (this.phase === 'WORK') {
      if (this.currentRound < this.config.totalRounds) {
        this.enterPhase('REST', this.config.restSeconds * 1000);
      } else {
        this.enterPhase('FINISHED', 0);
      }
    } else if (this.phase === 'REST') {
      this.currentRound += 1;
      this.enterPhase('WORK', this.config.roundSeconds * 1000);
    }
  }

  tick() {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.remainingMs = Math.max(0, this.remainingMs - delta);
    const currentWholeSecond = Math.ceil(this.remainingMs / 1000);

    // Eventos disparados na virada exata de cada segundo
    if (currentWholeSecond !== this.lastAnnouncedSecond && currentWholeSecond > 0) {
      this.lastAnnouncedSecond = currentWholeSecond;

      // Aviso de últimos 10 segundos do Round
      if (
        this.phase === 'WORK' &&
        this.config.warnLast10 &&
        currentWholeSecond === 10 &&
        !this.warnTriggeredThisRound
      ) {
        this.warnTriggeredThisRound = true;
        this.audio.playTenSecondWarning();
        this.triggerFlash();
        this.vibrate([120, 60, 120]);
      }

      // Bips nos últimos 3, 2, 1 segundos de qualquer fase
      if (currentWholeSecond <= 3 && currentWholeSecond >= 1) {
        this.audio.playCountdownPip(currentWholeSecond === 1 ? 1046.5 : 880);
      }
    }

    this.syncUI();

    if (this.remainingMs <= 0) {
      this.advanceToNextPhase();
      this.syncUI();
    }

    if (this.isRunning) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  // ============================================================================
  // Atualização Visual de Alto Contraste
  // ============================================================================

  syncUI() {
    // 1. Definir classe de cor da tela inteira
    const activeStateClass = this.computeBodyStateClass();
    this.body.className = `${activeStateClass}${this.isRunning ? ' is-running' : ''}`;

    // Atualizar cor da barra de status do iOS/Android
    const hexColor = THEME_COLORS[activeStateClass] || '#090b10';
    if (this.themeMeta.getAttribute('content') !== hexColor) {
      this.themeMeta.setAttribute('content', hexColor);
    }

    // 2. Atualizar textos de Fase e Round
    this.roundDisplay.textContent = `ROUND ${this.currentRound} DE ${this.config.totalRounds}`;

    if (this.phase === 'IDLE') {
      this.phaseBadge.textContent = 'PRONTO PARA LUTAR';
    } else if (this.phase === 'PREP') {
      this.phaseBadge.textContent = 'PREPARE-SE';
    } else if (this.phase === 'WORK') {
      const secLeft = Math.ceil(this.remainingMs / 1000);
      if (this.config.warnLast10 && secLeft <= 10) {
        this.phaseBadge.textContent = '⚡ RETA FINAL • 10s ⚡';
      } else {
        this.phaseBadge.textContent = this.isRunning ? '🥊 ROUND ATIVO' : '⏸ ROUND PAUSADO';
      }
    } else if (this.phase === 'REST') {
      this.phaseBadge.textContent = this.isRunning ? '🧊 DESCANSO' : '⏸ DESCANSO PAUSADO';
    } else if (this.phase === 'FINISHED') {
      this.phaseBadge.textContent = '🏆 TREINO CONCLUÍDO!';
    }

    // 3. Atualizar Relógio Gigante
    if (this.phase === 'FINISHED') {
      this.timeDisplay.textContent = 'FIM!';
    } else {
      this.timeDisplay.textContent = this.formatMMSS(this.remainingMs);
    }

    // 4. Atualizar Barra de Progresso
    const ratio =
      this.phaseDurationMs > 0
        ? Math.max(0, Math.min(100, (this.remainingMs / this.phaseDurationMs) * 100))
        : 0;
    this.progressBar.style.width = `${ratio}%`;

    // 5. Atualizar Botão Start / Pause
    if (this.isRunning) {
      this.startPauseLabel.textContent = 'PAUSE';
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
    } else {
      this.startPauseLabel.textContent =
        this.phase === 'IDLE' || this.phase === 'FINISHED' ? 'START' : 'RETOMAR';
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
    }
  }

  computeBodyStateClass() {
    if (this.phase === 'IDLE') return 'state-idle';
    if (this.phase === 'PREP') return 'state-prep';
    if (this.phase === 'REST') return 'state-rest';
    if (this.phase === 'FINISHED') return 'state-finished';
    if (this.phase === 'WORK') {
      const secLeft = Math.ceil(this.remainingMs / 1000);
      if (this.config.warnLast10 && secLeft <= 10 && secLeft > 0) {
        return 'state-warning';
      }
      return 'state-work';
    }
    return 'state-idle';
  }

  renderRoundDots() {
    this.roundDots.innerHTML = '';
    const maxDots = Math.min(this.config.totalRounds, 15);
    for (let i = 1; i <= maxDots; i++) {
      const dot = document.createElement('span');
      dot.className = 'round-dot';
      if (i < this.currentRound || this.phase === 'FINISHED') {
        dot.classList.add('done');
      } else if (i === this.currentRound) {
        dot.classList.add('current');
      }
      this.roundDots.appendChild(dot);
    }
  }

  updateSummaryUI() {
    this.summaryRound.textContent = `🥊 ${this.formatMMSS(this.config.roundSeconds * 1000)}`;
    this.summaryRest.textContent = `🧊 ${this.formatMMSS(this.config.restSeconds * 1000)}`;
    this.summaryTotal.textContent = `🔄 ${this.config.totalRounds} ${this.config.totalRounds === 1 ? 'Round' : 'Rounds'}`;
    this.summaryWarn.classList.toggle('hidden', !this.config.warnLast10);
    this.summaryWarnSep.classList.toggle('hidden', !this.config.warnLast10);
  }

  formatMMSS(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  triggerFlash() {
    this.flashOverlay.classList.add('active');
    setTimeout(() => {
      this.flashOverlay.classList.remove('active');
    }, 120);
  }

  vibrate(pattern) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (_) {}
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (_) {}
      this.wakeLock = null;
    }
  }
}

// Inicialização e Registro do Service Worker (PWA Offline)
window.addEventListener('DOMContentLoaded', () => {
  window.boxTimerApp = new BoxingTimerApp();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Falha ao registrar Service Worker:', err);
    });
  }
});
