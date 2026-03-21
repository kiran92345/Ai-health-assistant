/* ═══ AI Health Assistant — Frontend Logic ═══ */

const API_BASE = '';

// ─── State ───────────────────────────────────────────────────────────────────
let currentLang = 'English';
let currentReport = null;
let ttsPlaying = false;
let recognition = null;
let conditions = [];
let selectedMajorSymptoms = [];   // Selected from major symptoms panel
let selectedMinorSymptoms = [];   // From description/mic (or future minor panel)

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadHistory();
  renderChart();
  updateNavScore();
  // Init language glider position
  setTimeout(initLangGlider, 80);

  // sync textarea char count
  const ta = document.getElementById('symptomInput');
  if (ta) {
    ta.addEventListener('input', () => {
      document.getElementById('charCount').textContent = `${ta.value.length} characters`;
    });
  }

  // Close suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) hideSuggestions();
  });

  // Check backend health silently
  fetch(`${API_BASE}/api/health`).catch(() => {});
});

// ─── PAGE ROUTING ─────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.page === name);
  });
  document.getElementById(`page-${name}`).classList.add('active');
  if (window.magicDockInstance && typeof window.magicDockInstance.updateActive === 'function') {
    window.magicDockInstance.updateActive(name);
  }
  const scrollBehavior = window.innerWidth <= 768 ? 'auto' : 'smooth';
  window.scrollTo({ top: 0, behavior: scrollBehavior });
  if (name === 'history') renderHistory();
  if (name === 'home') renderChart();
}

// ─── LANGUAGE SELECTION ───────────────────────────────────────────────────────
function selectLanguage(lang, btnEl) {
  currentLang = lang;
  // Sync all lang-card (home hero boxes)
  document.querySelectorAll('.lang-card').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  // Sync all lang-box (old selector, kept for compatibility)
  document.querySelectorAll('.lang-box').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  // Sync lang-pill (analyze page)
  document.querySelectorAll('.lang-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  // Animate glider to clicked card
  if (btnEl && btnEl.classList.contains('lang-card')) {
    moveGlider(btnEl);
  }
  // Update navbar badge
  const codes = { English:'EN', Hindi:'HI', Telugu:'TE', Tamil:'TA', Kannada:'KN', Malayalam:'ML' };
  const currentLangBadge = document.getElementById('currentLangBadge');
  if (currentLangBadge) currentLangBadge.textContent = `🌐 ${codes[lang] || 'EN'}`;
  // Save to profile
  const prefSelect = document.getElementById('prefLang');
  if (prefSelect) prefSelect.value = lang;
  saveProfile();
}

function moveGlider(cardEl) {
  const glider = document.getElementById('langGlider');
  const track  = document.querySelector('.lang-cards-track');
  if (!glider || !track || !cardEl) return;
  const trackRect = track.getBoundingClientRect();
  const cardRect  = cardEl.getBoundingClientRect();
  glider.style.left  = (cardRect.left - trackRect.left) + 'px';
  glider.style.width = cardRect.width + 'px';
}

function initLangGlider() {
  const active = document.querySelector('.lang-card.active');
  if (active) moveGlider(active);
}

function selectAnalyzeLang(lang, btn) {
  selectLanguage(lang, btn);
}


// ─── HOME SEARCH → ANALYZE (inline on home page) ──────────────────────────────
function goAnalyze() {
  const text = document.getElementById('homeSearch').value.trim();
  if (!text) { showToast('⚠️ Please type or speak your symptoms first', 'warning'); return; }
  hideSuggestions();
  // Copy text to symptomInput (kept for analysis function)
  const si = document.getElementById('symptomInput');
  if (si) { si.value = text; }
  runAnalysis();
}

function addSymptom(sym) {
  const inp = document.getElementById('homeSearch');
  inp.value += (inp.value ? ', ' : '') + sym;
}

// ─── SUGGESTIONS ──────────────────────────────────────────────────────────────
const SUGGESTION_POOL = [
  'Fever and headache', 'Cough and sore throat', 'Nausea and vomiting',
  'Joint pain and fatigue', 'Chest pain and breathlessness', 'Rash and itching',
  'Runny nose and sneezing', 'Abdominal pain and diarrhea', 'Dizziness and weakness',
  'High fever and chills', 'Loss of appetite and weight loss', 'Sweating and night sweats',
  'Blurred vision and headache', 'Frequent urination and thirst', 'Jaundice and dark urine',
];

function updateSuggestions(val) {
  const box = document.getElementById('suggestionsBox');
  if (!val || val.length < 2) { hideSuggestions(); return; }
  const matches = SUGGESTION_POOL.filter(s => s.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
  if (!matches.length) { hideSuggestions(); return; }
  box.innerHTML = matches.map(s =>
    `<div class="sugg-item" onclick="selectSuggestion('${s}')">🔍 ${s}</div>`
  ).join('');
  box.style.display = 'block';
}

function selectSuggestion(text) {
  document.getElementById('homeSearch').value = text;
  hideSuggestions();
}
function hideSuggestions() {
  document.getElementById('suggestionsBox').style.display = 'none';
}

// ─── SYMPTOM CHIPS ────────────────────────────────────────────────────────────
function appendSymptom(sym) {
  const ta = document.getElementById('symptomInput');
  if (!ta) return;
  const val = ta.value.trim();
  ta.value = val ? `${val}, ${sym}` : sym;
  ta.dispatchEvent(new Event('input'));
  ta.focus();
}
function clearInput() {
  const ta = document.getElementById('symptomInput');
  if (ta) ta.value = '';
  const cc = document.getElementById('charCount');
  if (cc) cc.textContent = '0 characters';
}

// ─── VOICE INPUT ──────────────────────────────────────────────────────────────
const LANG_CODES = {
  English: 'en-IN', Hindi: 'hi-IN', Telugu: 'te-IN',
  Tamil: 'ta-IN', Kannada: 'kn-IN', Malayalam: 'ml-IN'
};

function startVoiceInput(targetId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { showToast('⚠️ Speech not supported in this browser', 'warning'); return; }

  // Support both old mic-btn and new standalone mic-hero-btn
  const btn = targetId === 'homeSearch'
    ? (document.getElementById('homeMicBtn'))
    : document.getElementById('analyzeMicBtn');

  if (recognition) { recognition.stop(); return; }

  recognition = new SpeechRecognition();
  recognition.lang = LANG_CODES[currentLang] || 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  if (btn) btn.classList.add('recording');
  showToast('🎤 Listening... Speak now!', 'success');

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById(targetId).value = (document.getElementById(targetId).value + ' ' + transcript).trim();
    if (targetId === 'symptomInput') {
      const cc = document.getElementById('charCount');
      if (cc) cc.textContent = `${document.getElementById(targetId).value.length} characters`;
    }
    showToast(`✅ Got: "${transcript.slice(0, 40)}${transcript.length > 40 ? '...' : ''}"`, 'success');
    recognition = null;
    if (btn) btn.classList.remove('recording');
  };
  recognition.onerror = () => { recognition = null; if (btn) btn.classList.remove('recording'); showToast('⚠️ Could not understand. Try again.', 'warning'); };
  recognition.onend   = () => { recognition = null; if (btn) btn.classList.remove('recording'); };
  recognition.start();
}

// ─── ANALYSIS ─────────────────────────────────────────────────────────────────
// Step messages shown dynamically
const STEP_MESSAGES = [
  ['Extracting Symptoms',     'Identifying keywords from your input'],
  ['Running ML Model',        'Random Forest classifying 142 features'],
  ['Calculating Severity',    'Scoring confidence and risk level'],
  ['Building Recommendations','Diet, medicines, precautions'],
  ['Translating Report',      'Localising to your language'],
];

async function runAnalysis() {
  const text = (document.getElementById('homeSearch')?.value || document.getElementById('symptomInput')?.value || '').trim();
  if (!text && selectedMajorSymptoms.length === 0) {
    showToast('⚠️ Please enter symptoms or select major symptoms first', 'warning');
    return;
  }

  // ── Show loading panel, hide report + default content
  const loadPanel = document.getElementById('homeLoadingPanel');
  const rptPanel  = document.getElementById('homeReportSection');
  const defContent = document.getElementById('homeDefaultContent');

  if (rptPanel)   rptPanel.style.display   = 'none';
  if (defContent) defContent.style.display = 'none';
  if (loadPanel) { loadPanel.style.display = 'block'; window.scrollTo({top: loadPanel.offsetTop - 80, behavior:'smooth'}); }

  // ── Reset all steps to pending
  for (let i = 1; i <= 5; i++) {
    const stepEl = document.getElementById(`hstep${i}`);
    const fillEl = document.getElementById(`hfill${i}`);
    if (stepEl) stepEl.className = 'hload-step';
    if (fillEl) fillEl.style.width = '0%';
  }

  // ── Progress bar & percentage
  const bar    = document.getElementById('hloadBar');
  const pctEl  = document.getElementById('hloadPct');
  const subEl  = document.getElementById('hloadSub');
  let pct = 0;

  // ── Step timings: spread over ~1.2s to speed up analysis
  // Step 1: 0ms  Step 2: 250ms  Step 3: 500ms  Step 4: 750ms  Step 5: 1000ms
  const stepStart = [0, 250, 500, 750, 1000];
  const stepDur   = [200, 250, 250, 250, 200]; // ms each step fill takes

  function activateStep(i) {
    // Mark prev as done
    if (i > 0) {
      const prev = document.getElementById(`hstep${i}`);
      if (prev) prev.className = 'hload-step done';
    }
    const cur = document.getElementById(`hstep${i + 1}`);
    if (cur) cur.className = 'hload-step active';
    // Animate the fill bar
    const fill = document.getElementById(`hfill${i + 1}`);
    if (fill) {
      fill.style.transition = `width ${stepDur[i]}ms cubic-bezier(0.4,0,0.2,1)`;
      requestAnimationFrame(() => { fill.style.width = '100%'; });
    }
    if (subEl && STEP_MESSAGES[i]) subEl.textContent = STEP_MESSAGES[i][1];
  }

  // Activate steps with timers
  stepStart.forEach((t, i) => setTimeout(() => activateStep(i), t));

  // Smooth overall bar
  const targetStep = (stepIdx, pct) => stepIdx === 4 ? 95 : (stepIdx + 1) * 19;
  const barInt = setInterval(() => {
    pct = Math.min(pct + 3, 92);
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = Math.round(pct);
  }, 40);

  try {
    const resp = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        major_symptoms: selectedMajorSymptoms,
        minor_symptoms: selectedMinorSymptoms,
        description   : text,
        symptoms_text : text,   // legacy fallback
        language      : currentLang
      })
    });

    clearInterval(barInt);
    if (bar) { bar.style.transition = 'width 0.4s ease'; bar.style.width = '100%'; }
    if (pctEl) pctEl.textContent = '100';

    if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Analysis failed'); }

    const data = await resp.json();
    currentReport = data;

    // Mark last step done
    const lastStep = document.getElementById('hstep5');
    if (lastStep) lastStep.className = 'hload-step done';

    // Auto-save to history
    const autoSave = document.getElementById('autoSave');
    if (!autoSave || autoSave.checked) saveToHistory(data);

    await sleep(200);

    // ── Hide loading, show report
    if (loadPanel) loadPanel.style.display = 'none';
    if (rptPanel) {
      rptPanel.style.display = 'block';
      rptPanel.classList.add('report-slide-in');
      window.scrollTo({ top: rptPanel.offsetTop - 80, behavior: 'smooth' });
    }

    renderReport(data);
    updateNavScore();

    const ttsAuto = document.getElementById('ttsAuto');
    if (ttsAuto && ttsAuto.checked) setTimeout(toggleTTS, 500);

  } catch (err) {
    clearInterval(barInt);
    if (loadPanel) loadPanel.style.display = 'none';
    if (defContent) defContent.style.display = '';
    showToast(`❌ ${err.message}`, 'error');
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function newAnalysis() {
  const rptPanel  = document.getElementById('homeReportSection');
  const defContent = document.getElementById('homeDefaultContent');
  if (rptPanel) rptPanel.style.display = 'none';
  if (defContent) defContent.style.display = '';
  document.getElementById('homeSearch').value = '';
  stopTTS();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ─── RENDER REPORT ────────────────────────────────────────────────────────────
function renderReport(data) {
  const lang = data.language || 'English';

  // Disease + Confidence
  const disease = data.disease_translated || data.disease || 'Unknown';
  document.getElementById('diagnosisDisease').textContent = disease;
  document.getElementById('confidenceBadge').textContent = data.confidence || '--';

  // Severity
  const sevLevel = data.severity_level || 1;
  const sevLabel = data.severity_label_translated || data.severity_label || 'Normal';
  const sevDesc = data.severity_desc_translated || data.severity_desc || '';
  const sevEmoji = data.severity_emoji || '🟢';
  const sevBadge = document.getElementById('severityBadge');
  sevBadge.textContent = `${sevEmoji} ${sevLabel}`;
  sevBadge.className = `severity-badge sev-${sevLevel}`;
  document.getElementById('diagnosisDesc').textContent = sevDesc;

  // Emergency pulse
  document.getElementById('emergencyPulse').style.display = sevLevel === 3 ? 'block' : 'none';

  // Symptoms tags — major in red, minor in amber, desc in blue
  const symsWrap = document.getElementById('diagnosisSymptoms');
  const majTags  = (data.major_symptoms || []).map(s => `<span class="sym-tag sym-major">${s}</span>`);
  const minTags  = (data.minor_symptoms || []).map(s => `<span class="sym-tag sym-minor">${s}</span>`);
  const dscTags  = (data.desc_symptoms  || []).filter(s => !(data.major_symptoms||[]).includes(s) && !(data.minor_symptoms||[]).includes(s)).map(s => `<span class="sym-tag">${s}</span>`);
  const allTagsHTML = [...majTags, ...minTags, ...dscTags].slice(0,12).join('');
  symsWrap.innerHTML = allTagsHTML || (data.symptoms || []).slice(0,10).map(s => `<span class="sym-tag">${s}</span>`).join('');

  // Alt predictions
  const altWrap = document.getElementById('altPredictions');
  if (data.other_predictions && data.other_predictions.length) {
    altWrap.innerHTML = `<div style="font-size:0.75rem;color:var(--text3);margin-bottom:6px;">Also possible:</div>` +
      data.other_predictions.map(p => {
        const pct = parseFloat(p.confidence) || 0;
        return `<div class="alt-row">
          <span>${p.disease}</span>
          <div class="alt-bar"><div class="alt-bar-fill" style="width:${Math.min(pct*100,100)}%"></div></div>
          <span>${p.confidence}</span>
        </div>`;
      }).join('');
  } else altWrap.innerHTML = '';

  // Lists
  renderList('precautionsList', data.precautions_translated || data.precautions || []);
  renderList('foodEatList', data.foods_to_eat_translated || data.foods_to_eat || []);
  renderList('foodAvoidList', data.foods_to_avoid_translated || data.foods_to_avoid || []);
  renderList('medicineList', data.medical_suggestions_translated || data.medical_suggestions || []);

  // Doctor when
  document.getElementById('doctorText').textContent = data.doctor_when_translated || data.doctor_when || '';

  // Health Score
  const score = calcHealthScore(sevLevel, data.confidence_raw || 0.5);
  animateScore(score, sevLevel);

  // Severity metrics
  document.getElementById('scoreMetricSeverity').textContent = sevLabel;
  document.getElementById('scoreMetricConf').textContent = data.confidence || '--';

  // Quick Assessment Mode logic
  const isSimple = data.simple_mode === true;
  const qaCard = document.getElementById('quickAssessmentCard');
  if (qaCard) {
    if (isSimple) {
      qaCard.style.display = 'block';
      const count = data.symptom_count || 1;
      qaCard.querySelector('p').textContent = `Analyzing based on ${count} symptom${count > 1 ? 's' : ''}. For a full ML prediction using Random Forest, please describe your symptoms in more detail (3+ symptoms).`;
    } else {
      qaCard.style.display = 'none';
    }
  }

  const basicMedCard = document.getElementById('basicMedCard');
  if (isSimple && data.basic_medication && data.basic_medication.length > 0) {
     if (basicMedCard) basicMedCard.style.display = 'block';
     renderList('basicMedList', data.basic_medication_translated || data.basic_medication);
     
     const docP = document.getElementById('precautionsCard'); if(docP) docP.style.display = 'none';
     const docE = document.getElementById('foodEatCard'); if(docE) docE.style.display = 'none';
     const docA = document.getElementById('foodAvoidCard'); if(docA) docA.style.display = 'none';
     const docM = document.getElementById('medicineCard'); if(docM) docM.style.display = 'none';
  } else {
     if (basicMedCard) basicMedCard.style.display = 'none';
     const docP = document.getElementById('precautionsCard'); if(docP) docP.style.display = 'block';
     const docE = document.getElementById('foodEatCard'); if(docE) docE.style.display = 'block';
     const docA = document.getElementById('foodAvoidCard'); if(docA) docA.style.display = 'block';
     const docM = document.getElementById('medicineCard'); if(docM) docM.style.display = 'block';
  }
}

function renderList(id, items) {
  const el = document.getElementById(id);
  el.innerHTML = (items || []).map(item => `<li>${item}</li>`).join('');
}

function calcHealthScore(sevLevel, confRaw) {
  const baseMap = { 1: 80, 2: 55, 3: 30 };
  const base = baseMap[sevLevel] || 70;
  const adjustment = (confRaw - 0.5) * 10;
  return Math.min(100, Math.max(5, Math.round(base - adjustment)));
}

function animateScore(score, sevLevel) {
  const colors = { 1: '#10b981', 2: '#f97316', 3: '#ef4444' };
  const color = colors[sevLevel] || '#00e5ff';
  const donut = document.getElementById('scoreDonut');
  const numEl = document.getElementById('scoreNum');
  const circumference = 2 * Math.PI * 50; // r=50
  const offset = circumference - (score / 100) * circumference;
  donut.style.strokeDasharray = `${circumference}`;
  donut.style.strokeDashoffset = `${circumference}`;
  donut.style.stroke = color;
  donut.style.transition = 'stroke-dashoffset 1.5s ease, stroke 0.5s';

  let current = 0;
  const step = score / 60;
  const timer = setInterval(() => {
    current = Math.min(current + step, score);
    numEl.textContent = Math.round(current);
    if (current >= score) clearInterval(timer);
  }, 25);

  setTimeout(() => { donut.style.strokeDashoffset = `${offset}`; }, 100);

  // Update nav score ring
  const navRing = document.getElementById('scoreRingCircle');
  if (navRing) {
    navRing.style.stroke = color;
    navRing.setAttribute('stroke-dasharray', `${score} 100`);
  }
  const navScoreNum = document.getElementById('navScoreNum');
  if (navScoreNum) navScoreNum.textContent = score;
}

// ─── TTS ──────────────────────────────────────────────────────────────────────
async function toggleTTS() {
  const btn = document.getElementById('ttsBtn');
  const audio = document.getElementById('ttsAudio');

  if (ttsPlaying) { stopTTS(); return; }
  if (!currentReport) return;

  btn.classList.add('active');
  document.getElementById('ttsBtnText').textContent = 'Stop';
  ttsPlaying = true;

  const disease = currentReport.disease_translated || currentReport.disease || '';
  const sev = currentReport.severity_label_translated || currentReport.severity_label || '';
  const doc = currentReport.doctor_when_translated || currentReport.doctor_when || '';
  const text = `Health Report. Diagnosis: ${disease}. Severity: ${sev}. ${doc}`.slice(0, 500);

  try {
    const resp = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: currentLang })
    });
    if (!resp.ok) throw new Error('TTS error');
    const data = await resp.json();
    const audioSrc = `data:audio/mp3;base64,${data.audio}`;
    audio.src = audioSrc;
    audio.play();
    audio.onended = stopTTS;
    showToast('🔊 Reading report...', 'success');
  } catch {
    // Fallback: browser TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = Object.entries(LANG_CODES).find(([k]) => k === currentLang)?.[1] || 'en-IN';
      utterance.onend = stopTTS;
      window.speechSynthesis.speak(utterance);
      showToast('🔊 Using browser speech...', 'success');
    } else {
      showToast('⚠️ TTS not available', 'warning');
      stopTTS();
    }
  }
}

function stopTTS() {
  const btn = document.getElementById('ttsBtn');
  const audio = document.getElementById('ttsAudio');
  ttsPlaying = false;
  audio.pause();
  audio.src = '';
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (btn) {
    btn.classList.remove('active');
    document.getElementById('ttsBtnText').textContent = 'Speak Report';
  }
}

// ─── PDF DOWNLOAD ─────────────────────────────────────────────────────────────
async function downloadPDF() {
  if (!currentReport) { showToast('⚠️ No report to download', 'warning'); return; }
  showToast('⏳ Generating PDF...', 'success');

  try {
    const resp = await fetch(`${API_BASE}/api/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: currentReport })
    });
    if (!resp.ok) throw new Error('PDF failed');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health_report_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ PDF downloaded!', 'success');
  } catch {
    showToast('❌ PDF generation failed. Check if backend is running.', 'error');
  }
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function saveToHistory(report) {
  const history = getHistory();
  history.unshift({ ...report, id: Date.now() });
  localStorage.setItem('ai_health_history', JSON.stringify(history.slice(0, 50)));
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem('ai_health_history') || '[]'); }
  catch { return []; }
}

function renderHistory(filter = '') {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  let history = getHistory();
  if (filter) {
    const f = filter.toLowerCase();
    history = history.filter(h =>
      (h.disease || '').toLowerCase().includes(f) ||
      (h.symptoms_input || '').toLowerCase().includes(f) ||
      (h.disease_translated || '').toLowerCase().includes(f)
    );
  }

  if (!history.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const sevMap = { 1: 'sev-dot-1', 2: 'sev-dot-2', 3: 'sev-dot-3' };
  list.innerHTML = history.map((h, i) => {
    const disease = h.disease_translated || h.disease || 'Unknown';
    const precautions = (h.precautions_translated || h.precautions || []).slice(0, 2).join('; ');
    const foods = (h.foods_to_eat_translated || h.foods_to_eat || []).slice(0, 2).join('; ');
    return `
    <div class="history-item" id="hitem-${i}" onclick="expandHistory(${i})">
      <div class="history-item-header">
        <div class="history-sev ${sevMap[h.severity_level] || 'sev-dot-1'}"></div>
        <div class="history-disease">${disease}</div>
        <div class="history-conf">${h.confidence || ''}</div>
        <div class="history-date">${h.timestamp || ''}</div>
      </div>
      <div class="history-syms">Symptoms: ${(h.symptoms || []).slice(0,6).join(', ')}</div>
      <div class="history-expand">
        <div class="history-mini-bento">
          <div class="mini-section">
            <h4>🛡️ Precautions</h4>
            <p>${precautions || 'See full report'}</p>
          </div>
          <div class="mini-section">
            <h4>✅ Recommended Foods</h4>
            <p>${foods || 'See full report'}</p>
          </div>
          <div class="mini-section">
            <h4>🚨 When to See Doctor</h4>
            <p>${(h.doctor_when_translated || h.doctor_when || '').slice(0, 120)}</p>
          </div>
          <div class="mini-section">
            <h4>💊 Medicine</h4>
            <p>${(h.medical_suggestions_translated || h.medical_suggestions || []).slice(0,2).join('; ')}</p>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="action-btn tts-btn" onclick="playHistoryTTS(event,${i})">🔊 Speak</button>
          <button class="action-btn dl-btn" onclick="downloadHistoryPDF(event,${i})">📥 PDF</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function expandHistory(i) {
  const el = document.getElementById(`hitem-${i}`);
  el.classList.toggle('expanded');
}

async function playHistoryTTS(evt, i) {
  evt.stopPropagation();
  const h = getHistory()[i];
  if (!h) return;
  currentReport = h;
  currentLang = h.language || 'English';
  await toggleTTS();
}

async function downloadHistoryPDF(evt, i) {
  evt.stopPropagation();
  const h = getHistory()[i];
  if (!h) return;
  currentReport = h;
  await downloadPDF();
}

function filterHistory(val) { renderHistory(val); }

function clearHistory() {
  if (!confirm('Clear all history?')) return;
  localStorage.removeItem('ai_health_history');
  renderHistory();
  updateNavScore();
  showToast('🗑️ History cleared', 'success');
}

// ─── HEALTH CHART ─────────────────────────────────────────────────────────────
function renderChart() {
  const canvas = document.getElementById('healthChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const history = getHistory().slice(0, 7).reverse();
  const labelsEl = document.getElementById('chartLabels');

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = new Date().getDay();
  const w = canvas.clientWidth || 800;
  const h = 180;
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  // Generate 7 data points from history or defaults
  const scores = [];
  for (let k = 0; k < 7; k++) {
    if (history[k]) {
      scores.push(calcHealthScore(history[k].severity_level || 1, history[k].confidence_raw || 0.5));
    } else {
      scores.push(Math.round(70 + Math.random() * 20));
    }
  }

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const avgEl = document.getElementById('avgScoreText');
  if (avgEl) { avgEl.textContent = avg; }

  const padL = 30, padR = 20, padT = 20, padB = 30;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH / 4) * i;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
  }

  // Gradient fill
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, 'rgba(0,229,255,0.18)');
  grad.addColorStop(1, 'rgba(0,229,255,0)');

  const pts = scores.map((s, i) => ({
    x: padL + (plotW / (scores.length - 1)) * i,
    y: padT + plotH - (s / 100) * plotH
  }));

  // Fill area
  ctx.beginPath();
  ctx.moveTo(pts[0].x, padT + plotH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();

  // Dots
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = i === pts.length - 1 ? '#ff4b6e' : '#00e5ff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,14,30,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Score label on hover area (always show last)
    if (i === pts.length - 1) {
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(scores[i], p.x, p.y - 10);
    }
  });

  // Day labels
  if (labelsEl) {
    const dayLabels = [];
    for (let k = 0; k < 7; k++) {
      dayLabels.push(days[(today - 6 + k + 7) % 7]);
    }
    labelsEl.innerHTML = dayLabels.map(d => `<span>${d}</span>`).join('');
  }
}

// ─── NAV SCORE UPDATE ─────────────────────────────────────────────────────────
function updateNavScore() {
  const history = getHistory();
  if (!history.length) return;
  const latest = history[0];
  const score = calcHealthScore(latest.severity_level || 1, latest.confidence_raw || 0.5);
  const navScoreNum = document.getElementById('navScoreNum');
  if (navScoreNum) navScoreNum.textContent = score;
  const ring = document.getElementById('scoreRingCircle');
  if (ring) ring.setAttribute('stroke-dasharray', `${score} 100`);

  // Update profile page stats
  const h = document.getElementById('healthScoreDisplay');
  if (h) h.textContent = score;
  const ta = document.getElementById('totalAnalyses');
  if (ta) ta.textContent = history.length;
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem('ai_health_profile') || '{}');
    if (p.name) document.getElementById('profileName').value = p.name;
    if (p.age) document.getElementById('profileAge').value = p.age;
    if (p.height) document.getElementById('profileHeight').value = p.height;
    if (p.weight) document.getElementById('profileWeight').value = p.weight;
    if (p.blood) document.getElementById('profileBlood').value = p.blood;
    if (p.gender) document.getElementById('profileGender').value = p.gender;
    if (p.lang) { currentLang = p.lang; selectLanguage(p.lang, null); }
    if (p.conditions) { conditions = p.conditions; renderConditions(); }
    if (p.allergies) document.getElementById('profileAllergies').value = p.allergies;
    if (p.medications) document.getElementById('profileMedications').value = p.medications;
    if (p.autoSave !== undefined) document.getElementById('autoSave').checked = p.autoSave;
    if (p.ttsAuto !== undefined) document.getElementById('ttsAuto').checked = p.ttsAuto;
    if (p.emergAlerts !== undefined) document.getElementById('emergAlerts').checked = p.emergAlerts;

    // Member since
    const msEl = document.getElementById('memberSince');
    if (msEl) msEl.textContent = p.memberSince || new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    if (!p.memberSince) { p.memberSince = msEl ? msEl.textContent : ''; }

    // Streak (simple: analyses in last 7 days)
    const history = getHistory();
    const today = new Date().toDateString();
    let streak = 0;
    const dates = [...new Set(history.map(h => new Date(h.timestamp).toDateString()))];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (dates.includes(d.toDateString())) streak++;
      else break;
    }
    const streakEl = document.getElementById('streakDays');
    if (streakEl) streakEl.textContent = streak;

    if (p.height && p.weight) calcBMI();
    updateNavScore();
  } catch {}
}

function saveProfile() {
  const p = {
    name: document.getElementById('profileName')?.value || '',
    age: document.getElementById('profileAge')?.value || '',
    height: document.getElementById('profileHeight')?.value || '',
    weight: document.getElementById('profileWeight')?.value || '',
    blood: document.getElementById('profileBlood')?.value || '',
    gender: document.getElementById('profileGender')?.value || '',
    lang: currentLang,
    conditions,
    allergies: document.getElementById('profileAllergies')?.value || '',
    medications: document.getElementById('profileMedications')?.value || '',
    autoSave: document.getElementById('autoSave')?.checked ?? true,
    ttsAuto: document.getElementById('ttsAuto')?.checked ?? false,
    emergAlerts: document.getElementById('emergAlerts')?.checked ?? true,
    memberSince: document.getElementById('memberSince')?.textContent || new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
  };
  localStorage.setItem('ai_health_profile', JSON.stringify(p));
}

function calcBMI() {
  const h = parseFloat(document.getElementById('profileHeight')?.value);
  const w = parseFloat(document.getElementById('profileWeight')?.value);
  if (!h || !w) return;
  const bmi = w / ((h / 100) ** 2);
  const bmiVal = document.getElementById('bmiValue');
  const bmiStat = document.getElementById('bmiStatus');
  const bmiBar = document.getElementById('bmiBar');
  const bmiDisp = document.getElementById('bmiDisplay');
  if (!bmiVal) return;

  bmiDisp.style.display = 'block';
  bmiVal.textContent = bmi.toFixed(1);

  let status, color, pct;
  if (bmi < 18.5) { status = 'Underweight'; color = '#60a5fa'; pct = (bmi / 18.5) * 20; }
  else if (bmi < 25) { status = 'Normal ✅'; color = '#10b981'; pct = 20 + ((bmi - 18.5) / 6.5) * 35; }
  else if (bmi < 30) { status = 'Overweight'; color = '#f97316'; pct = 55 + ((bmi - 25) / 5) * 25; }
  else { status = 'Obese'; color = '#ef4444'; pct = 80 + Math.min(((bmi - 30) / 10) * 20, 20); }

  bmiStat.textContent = status;
  bmiStat.style.color = color;
  bmiBar.style.width = `${Math.min(pct, 100)}%`;
  bmiBar.style.background = color;
}

function changeAvatar() {
  const avatarEl = document.getElementById('profileAvatar');
  const emojis = ['🧑‍⚕️', '👨‍⚕️', '👩‍⚕️', '🧑', '👨', '👩', '🧒', '👴', '👵'];
  const current = avatarEl.dataset.emoji || '';
  const next = emojis[(emojis.indexOf(current) + 1) % emojis.length];
  avatarEl.dataset.emoji = next;
  avatarEl.innerHTML = `<div style="font-size:4rem;line-height:1;margin:0 auto">${next}</div>`;
  showToast(`Avatar changed to ${next}`, 'success');
}

function addCondition() {
  const input = document.getElementById('newCondition');
  const val = (input.value || '').trim();
  if (!val) return;
  conditions.push(val);
  input.value = '';
  renderConditions();
  saveProfile();
}

function renderConditions() {
  const el = document.getElementById('conditionTags');
  el.innerHTML = conditions.map((c, i) =>
    `<span class="condition-tag">${c}<button onclick="removeCondition(${i})">✕</button></span>`
  ).join('');
}

function removeCondition(i) {
  conditions.splice(i, 1);
  renderConditions();
  saveProfile();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3200);
}

// ─── RESIZE chart on window resize ───────────────────────────────────────────
window.addEventListener('resize', () => {
  if (document.getElementById('page-home').classList.contains('active')) renderChart();
});
