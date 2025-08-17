// public/js/stopwatch.js
// Standalone stopwatch logic for the Spectator UI.
// This file assumes the following DOM elements exist in the page:
// - #timeDisplay, #leftButton, #rightButton, #lapsContainer
// It integrates with a global `secretForce` object (window.secretForce) if present.
// The UI will NOT show any connection/token status (keeps spectator view clean).

(() => {
  'use strict';

  // --- DOM references ---
  const timeDisplay = document.getElementById('timeDisplay');
  const leftButton = document.getElementById('leftButton');
  const rightButton = document.getElementById('rightButton');
  const lapsContainer = document.getElementById('lapsContainer');

  // --- stopwatch state ---
  let startTime = 0;
  let elapsedTime = 0; // milliseconds accumulated when paused
  let timerInterval = null;
  let isRunning = false;
  let lapCounter = 0;
  let laps = []; // array of { number, time: 'MM:SS,CC', isCurrent }
  let currentLapStartTime = 0;

  // --- helpers (formatting) ---
  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((milliseconds % 1000) / 10);
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')},${String(centiseconds).padStart(2,'0')}`;
  }

  function timeStringToMs(timeString) {
    const parts = String(timeString).split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const secondsParts = (parts[1] || '00').split(',');
    const seconds = parseInt(secondsParts[0], 10) || 0;
    const centiseconds = parseInt(secondsParts[1], 10) || 0;
    return (minutes * 60 + seconds) * 1000 + centiseconds * 10;
  }

  // --- UI update functions ---
  function updateDisplay() {
    const now = Date.now();
    const total = elapsedTime + (isRunning ? (now - startTime) : 0);
    if (timeDisplay) timeDisplay.textContent = formatTime(total);

    // update current lap if present
    if (laps.length > 0 && laps[0].isCurrent) {
      let currentLapElapsed;
      if (isRunning) currentLapElapsed = now - currentLapStartTime;
      else currentLapElapsed = timeStringToMs(laps[0].time);
      laps[0].time = formatTime(currentLapElapsed);
      updateLapsDisplay();
    }
  }

  function updateLapsDisplay() {
    if (!lapsContainer) return;
    lapsContainer.innerHTML = '';
    const completedLaps = laps.filter(l => !l.isCurrent);

    let fastest = null, slowest = null, fastestIdx = -1, slowestIdx = -1;
    if (completedLaps.length >= 2) {
      completedLaps.forEach(lap => {
        const ms = timeStringToMs(lap.time);
        if (fastest === null || ms < fastest) { fastest = ms; fastestIdx = laps.indexOf(lap); }
        if (slowest === null || ms > slowest) { slowest = ms; slowestIdx = laps.indexOf(lap); }
      });
    }

    laps.forEach((lap, idx) => {
      const el = document.createElement('div');
      let cls = 'lap-item';
      if (!lap.isCurrent && completedLaps.length >= 2) {
        if (idx === fastestIdx) cls += ' fastest';
        else if (idx === slowestIdx) cls += ' slowest';
      }
      el.className = cls;
      el.innerHTML = `<span class="lap-number">Runde ${lap.number}</span><span class="lap-time">${lap.time}</span>`;
      lapsContainer.appendChild(el);
    });
  }

  // --- right button style helper ---
  function setRightButtonStyleByText(text) {
    if (!rightButton) return;
    rightButton.classList.remove('right-start','right-running','right-continue');
    if (text === 'Start') { rightButton.classList.add('right-start'); rightButton.textContent = 'Start'; }
    else if (text === 'Stopp') { rightButton.classList.add('right-running'); rightButton.textContent = 'Stopp'; }
    else if (text === 'Weiter') { rightButton.classList.add('right-continue'); rightButton.textContent = 'Weiter'; }
    else { rightButton.classList.add('right-start'); rightButton.textContent = text; }
  }

  // --- core stopwatch actions ---
  function startStopwatch() {
    isRunning = true;
    startTime = Date.now();

    if (lapCounter === 0) {
      currentLapStartTime = startTime;
      lapCounter = 1;
      laps.unshift({ number: lapCounter, time: '00:00,00', isCurrent: true });
      updateLapsDisplay();
    }

    timerInterval = setInterval(updateDisplay, 10);

    setRightButtonStyleByText('Stopp');
    if (leftButton) {
      leftButton.textContent = 'Runde';
      leftButton.className = 'control-button left left-running';
      leftButton.disabled = false;
    }

    // reset force counters if secretForce present
    try { if (window.secretForce && typeof window.secretForce.resetCounters === 'function') window.secretForce.resetCounters(); } catch (e) { /* ignore */ }
  }

  async function stopStopwatch() {
    if (!isRunning) return;
    isRunning = false;
    const now = Date.now();
    const realTotal = elapsedTime + (now - startTime);
    clearInterval(timerInterval);

    // If secretForce is available, ask it whether a force should be applied now
    let forcedMs = null;
    try {
      if (window.secretForce && typeof window.secretForce.applyIfTriggered === 'function') {
        forcedMs = await window.secretForce.applyIfTriggered('stop', realTotal);
      }
    } catch (e) {
      console.warn('secretForce.applyIfTriggered error', e);
    }

    const finalMs = (typeof forcedMs === 'number' && !isNaN(forcedMs)) ? forcedMs : realTotal;

    // keep elapsedTime consistent (so resume works)
    elapsedTime = finalMs;

    // finalize current lap if present
    if (laps.length > 0 && laps[0].isCurrent) {
      laps[0].time = formatTime(finalMs);
      laps[0].isCurrent = false;
      updateLapsDisplay();
    }

    setRightButtonStyleByText('Weiter');
    if (leftButton) {
      leftButton.textContent = 'Löschen';
      leftButton.className = 'control-button left left-stopped';
    }
  }

  function resetStopwatch() {
    isRunning = false;
    elapsedTime = 0;
    lapCounter = 0;
    laps = [];
    currentLapStartTime = 0;
    clearInterval(timerInterval);
    if (timeDisplay) timeDisplay.textContent = '00:00,00';

    setRightButtonStyleByText('Start');
    if (leftButton) {
      leftButton.textContent = 'Runde';
      leftButton.className = 'control-button left left-idle';
      leftButton.disabled = true;
    }

    updateLapsDisplay();
  }

  function recordLap() {
    const now = Date.now();

    if (laps.length > 0 && laps[0].isCurrent) laps[0].isCurrent = false;

    lapCounter++;
    currentLapStartTime = now;
    laps.unshift({ number: lapCounter, time: '00:00,00', isCurrent: true });
    updateLapsDisplay();
  }

  // --- event bindings ---
  if (rightButton) {
    rightButton.addEventListener('click', function() {
      const txt = rightButton.textContent.trim();
      if (txt === 'Start') {
        startStopwatch();
      } else if (txt === 'Stopp' && isRunning) {
        stopStopwatch();
      } else if (txt === 'Weiter' && !isRunning && elapsedTime > 0) {
        // Resume from paused state - don't reset elapsedTime
        startStopwatch();
      }
    });
  }

  if (leftButton) {
    leftButton.addEventListener('click', function() {
      if (isRunning) {
        const now = Date.now();
        const realTotal = elapsedTime + (isRunning ? (now - startTime) : 0);
        (async function(){
          let forcedMs = null;
          try {
            if (window.secretForce && typeof window.secretForce.applyIfTriggered === 'function') {
              forcedMs = await window.secretForce.applyIfTriggered('lap', realTotal);
            }
          } catch (e) { /* ignore */ }

          if (typeof forcedMs === 'number') {
            if (laps.length > 0 && laps[0].isCurrent) laps[0].isCurrent = false;
            lapCounter++;
            currentLapStartTime = Date.now();
            laps.unshift({ number: lapCounter, time: formatTime(forcedMs), isCurrent: true });
            updateLapsDisplay();
          } else {
            recordLap();
          }
        })();
      } else if (elapsedTime > 0) {
        resetStopwatch();
      }
    });
  }

  // --- initial state ---
  if (leftButton) leftButton.disabled = true;
  setRightButtonStyleByText('Start');
  updateDisplay();

  // Expose a small API on window in case other scripts want to control stopwatch
  window.SpectatorStopwatch = {
    start: startStopwatch,
    stop: stopStopwatch,
    reset: resetStopwatch,
    recordLap
  };

})();
