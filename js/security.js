// ═══════════════════════════════════════════════════════
// CLAUDY — Security Module
// ═══════════════════════════════════════════════════════

const Security = (() => {
  let pin = '';
  let attempts = 0;
  let locked = false;
  let lockTimer = null;
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 30000; // 30s

  function getStoredPin() {
    const s = DB.get('settings');
    return s?.pin || '1234';
  }

  function setPin(newPin) {
    DB.update('settings', s => { s.pin = newPin; return s; });
  }

  function isFirstTime() {
    return !localStorage.getItem('claudy_settings');
  }

  function handleFirstTime(entered) {
    if (entered.length === 4) {
      // First 4 digits = new PIN
      if (!localStorage.getItem('claudy_pending_pin')) {
        localStorage.setItem('claudy_pending_pin', entered);
        updateHint('Repite tu nuevo PIN para confirmar');
        resetDots();
        pin = '';
        return;
      } else {
        const pending = localStorage.getItem('claudy_pending_pin');
        if (entered === pending) {
          localStorage.removeItem('claudy_pending_pin');
          setPin(entered);
          successUnlock();
        } else {
          localStorage.removeItem('claudy_pending_pin');
          errorDots('Los PINs no coinciden');
          pin = '';
        }
        return;
      }
    }
  }

  function pinInput(digit) {
    if (locked) return;
    if (pin.length >= 4) return;
    pin += digit;
    updateDots();
    if (pin.length === 4) {
      setTimeout(() => checkPin(), 150);
    }
  }

  function pinDel() {
    if (locked) return;
    pin = pin.slice(0, -1);
    updateDots();
  }

  function checkPin() {
    // First time setup flow
    if (isFirstTime() && getStoredPin() === '1234') {
      // Allow default pin on first use
    }

    const pending = localStorage.getItem('claudy_pending_pin');
    if (pending !== null) {
      // Confirming new PIN
      if (pin === pending) {
        localStorage.removeItem('claudy_pending_pin');
        setPin(pin);
        successUnlock();
      } else {
        localStorage.removeItem('claudy_pending_pin');
        errorDots('Los PINs no coinciden. Intenta de nuevo.');
        pin = '';
      }
      return;
    }

    if (isFirstTime() && pin === '1234') {
      // Prompt to set new PIN
      localStorage.setItem('claudy_pending_pin', '');
      updateHint('Primera vez: ingresa un nuevo PIN de 4 dígitos');
      resetDots();
      pin = '';
      return;
    }

    if (pin === getStoredPin()) {
      attempts = 0;
      successUnlock();
    } else {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        startLockout();
      } else {
        errorDots(`PIN incorrecto. ${MAX_ATTEMPTS - attempts} intentos restantes`);
        pin = '';
      }
    }
  }

  function startLockout() {
    locked = true;
    updateHint('Demasiados intentos. Espera 30 segundos.');
    document.querySelectorAll('.num-btn').forEach(b => b.style.opacity = '0.3');
    lockTimer = setTimeout(() => {
      locked = false;
      attempts = 0;
      pin = '';
      updateHint('Ingresa tu PIN');
      resetDots();
      document.querySelectorAll('.num-btn').forEach(b => b.style.opacity = '1');
    }, LOCK_TIME);
  }

  function successUnlock() {
    // All dots green
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('d' + i);
      if (d) { d.classList.add('filled'); d.style.background = 'var(--green)'; d.style.borderColor = 'var(--green)'; }
    }
    setTimeout(() => {
      document.getElementById('lock-screen').style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => {
        document.getElementById('lock-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
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
    setTimeout(() => {
      resetDots();
      updateHint('Ingresa tu PIN');
    }, 1200);
  }

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('d' + i);
      if (!d) continue;
      if (i < pin.length) {
        d.classList.add('filled');
        d.style.background = '';
        d.style.borderColor = '';
      } else {
        d.classList.remove('filled');
        d.style.background = '';
        d.style.borderColor = '';
      }
    }
  }

  function resetDots() {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById('d' + i);
      if (d) {
        d.classList.remove('filled', 'error');
        d.style.background = '';
        d.style.borderColor = '';
      }
    }
    pin = '';
  }

  function updateHint(msg) {
    const h = document.getElementById('pin-hint');
    if (h) h.textContent = msg;
  }

  function pinBio() {
    // Simulated biometric — just unlock if supported message
    if (window.PublicKeyCredential) {
      UI.snack('Biométrico no configurado. Usa tu PIN.');
    } else {
      UI.snack('Usa tu PIN para ingresar.');
    }
  }

  function changePin(oldPin, newPin) {
    if (oldPin !== getStoredPin()) return false;
    setPin(newPin);
    return true;
  }

  return { pinInput, pinDel, pinBio, changePin, getStoredPin };
})();

// Expose globally for onclick handlers
function pinInput(d) { Security.pinInput(d); }
function pinDel() { Security.pinDel(); }
function pinBio() { Security.pinBio(); }

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = '@keyframes fadeOut{from{opacity:1}to{opacity:0}}';
document.head.appendChild(style);
