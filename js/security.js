// ═══════════════════════════════════════════════════════
// CLAUDY — Security Module (fixed)
// ═══════════════════════════════════════════════════════
const Security = (() => {
  let pin = '';
  let attempts = 0;
  let locked = false;
  let step = 'enter'; // 'enter' | 'new' | 'confirm'
  let pendingPin = '';

  function getStoredPin() {
    try { return JSON.parse(localStorage.getItem('claudy_settings'))?.pin || null; } catch(e) { return null; }
  }

  function isFirstTime() { return !getStoredPin(); }

  function pinInput(digit) {
    if (locked) return;
    if (pin.length >= 4) return;
    pin += digit;
    updateDots();
    if (pin.length === 4) setTimeout(() => checkPin(), 200);
  }

  function pinDel() {
    if (locked) return;
    pin = pin.slice(0, -1);
    updateDots();
  }

  function checkPin() {
    if (isFirstTime()) {
      // Primera vez: no hay PIN guardado
      if (step === 'enter') {
        // Cualquier 4 dígitos válidos → pedir confirmación
        pendingPin = pin;
        step = 'confirm';
        pin = '';
        resetDots();
        updateHint('Repite tu nuevo PIN para confirmar');
        return;
      }
      if (step === 'confirm') {
        if (pin === pendingPin) {
          // Guardar PIN y entrar
          const settings = { pin: pin, name: 'Estudiante', notifications: true };
          localStorage.setItem('claudy_settings', JSON.stringify(settings));
          successUnlock();
        } else {
          // No coincide → volver a empezar
          step = 'enter';
          pendingPin = '';
          pin = '';
          errorDots('No coinciden. Elige un nuevo PIN.');
        }
        return;
      }
    } else {
      // Ya tiene PIN guardado → verificar
      if (pin === getStoredPin()) {
        attempts = 0;
        successUnlock();
      } else {
        attempts++;
        if (attempts >= 5) {
          startLockout();
        } else {
          pin = '';
          errorDots(`PIN incorrecto. ${5 - attempts} intento${5-attempts!==1?'s':''} restante${5-attempts!==1?'s':''}`);
        }
      }
    }
  }

  function startLockout() {
    locked = true;
    pin = '';
    resetDots();
    updateHint('Demasiados intentos. Espera 30 segundos.');
    document.querySelectorAll('.num-btn').forEach(b => b.style.opacity = '0.3');
    setTimeout(() => {
      locked = false;
      attempts = 0;
      updateHint(isFirstTime() ? 'Elige tu PIN de 4 dígitos' : 'Ingresa tu PIN');
      document.querySelectorAll('.num-btn').forEach(b => b.style.opacity = '1');
    }, 30000);
  }

  function successUnlock() {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('d' + i);
      if (d) { d.classList.add('filled'); d.style.background = 'var(--green)'; d.style.borderColor = 'var(--green)'; }
    }
    setTimeout(() => {
      const ls = document.getElementById('lock-screen');
      if (ls) { ls.style.opacity = '0'; ls.style.transition = 'opacity 0.4s'; }
      setTimeout(() => {
        document.getElementById('lock-screen')?.classList.add('hidden');
        document.getElementById('app')?.classList.remove('hidden');
        App.init();
      }, 400);
    }, 400);
  }

  function errorDots(msg) {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('d' + i);
      if (d) { d.classList.add('error'); d.style.background = 'var(--red)'; d.style.borderColor = 'var(--red)'; }
    }
    updateHint(msg);
    setTimeout(() => { resetDots(); updateHint(step === 'confirm' ? 'Repite tu PIN' : isFirstTime() ? 'Elige tu PIN de 4 dígitos' : 'Ingresa tu PIN'); }, 1400);
  }

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('d' + i);
      if (!d) continue;
      if (i < pin.length) { d.classList.add('filled'); d.style.background = ''; d.style.borderColor = ''; }
      else { d.classList.remove('filled', 'error'); d.style.background = ''; d.style.borderColor = ''; }
    }
  }

  function resetDots() {
    pin = '';
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('d' + i);
      if (d) { d.classList.remove('filled', 'error'); d.style.background = ''; d.style.borderColor = ''; }
    }
  }

  function updateHint(msg) {
    const h = document.getElementById('pin-hint');
    if (h) h.textContent = msg;
  }

  function pinBio() { UI?.snack('Usa tu PIN para ingresar.'); }

  function changePin(oldPin, newPin) {
    if (oldPin !== getStoredPin()) return false;
    const s = JSON.parse(localStorage.getItem('claudy_settings') || '{}');
    s.pin = newPin;
    localStorage.setItem('claudy_settings', JSON.stringify(s));
    return true;
  }

  // Set initial hint on load
  window.addEventListener('DOMContentLoaded', () => {
    updateHint(isFirstTime() ? 'Elige tu PIN de 4 dígitos' : 'Ingresa tu PIN');
    const footer = document.querySelector('.lock-footer');
    if (footer) footer.textContent = isFirstTime() ? 'Primera vez: elige un PIN de 4 dígitos' : 'Ingresa tu PIN para acceder';
  });

  return { pinInput, pinDel, pinBio, changePin, getStoredPin };
})();

function pinInput(d) { Security.pinInput(d); }
function pinDel() { Security.pinDel(); }
function pinBio() { Security.pinBio(); }
