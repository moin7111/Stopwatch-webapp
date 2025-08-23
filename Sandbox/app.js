(function(){
  'use strict';
  const display = document.getElementById('display');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const lapsEl = document.getElementById('laps');

  let running = false;
  let startTs = null;          // epoch ms at last start/continue
  let accumulatedMs = 0;       // total time accumulated while not running
  let tickId = null;

  let laps = [];               // newest first
  let lastLapMarkMs = 0;       // elapsed time when current lap started

  function now(){ return Date.now(); }

  function currentElapsedMs(){
    return running ? accumulatedMs + (now() - startTs) : accumulatedMs;
  }

  function format(ms){
    const hundredths = Math.floor(ms / 10) % 100;
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const pad2 = n => String(n).padStart(2,'0');
    return `${pad2(minutes)}:${pad2(seconds)},${pad2(hundredths)}`;
  }

  function renderTime(){
    display.textContent = format(currentElapsedMs());
  }

  function renderButtons(){
    if(running){
      rightBtn.textContent = 'Stopp';
      rightBtn.classList.add('stop');
      leftBtn.textContent = 'Runde';
      leftBtn.disabled = false;
    }else{
      rightBtn.classList.remove('stop');
      rightBtn.textContent = accumulatedMs > 0 ? 'Weiter' : 'Start';
      leftBtn.textContent = 'Löschen';
      leftBtn.disabled = accumulatedMs === 0;
    }
  }

  function start(){
    if(running) return;
    startTs = now();
    running = true;
    // Start of the first lap
    lastLapMarkMs = 0;
    // Immediately create the first lap entry on start when user presses Runde later
    tickId = setInterval(renderTime, 10);
    renderButtons();
  }

  function stop(){
    if(!running) return;
    accumulatedMs = currentElapsedMs();
    clearInterval(tickId); tickId = null; startTs = null; running = false;
    renderTime();
    renderButtons();
  }

  function reset(){
    clearInterval(tickId); tickId = null;
    running = false; startTs = null; accumulatedMs = 0; lastLapMarkMs = 0;
    laps = []; lapsEl.innerHTML = '';
    renderTime();
    renderButtons();
  }

  function continueRun(){
    if(running) return;
    startTs = now();
    running = true;
    tickId = setInterval(renderTime, 10);
    renderButtons();
  }

  function addLap(){
    if(!running) return;
    const elapsed = currentElapsedMs();
    const duration = elapsed - lastLapMarkMs;
    if(duration <= 0) return;
    addLapWithDuration(duration);
    lastLapMarkMs = elapsed;
  }

  function addLapWithDuration(durationMs){
    const index = laps.length + 1; // sequential index
    const entry = { index, durationMs };
    laps.unshift(entry);
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = `Runde ${index}`;
    const time = document.createElement('span');
    time.textContent = format(durationMs);
    li.appendChild(label); li.appendChild(time);
    lapsEl.insertBefore(li, lapsEl.firstChild);
  }

  rightBtn.addEventListener('click', () => {
    if(running){ stop(); }
    else{ accumulatedMs > 0 ? continueRun() : start(); }
  });

  leftBtn.addEventListener('click', () => {
    if(running){ addLap(); }
    else{ reset(); }
  });

  // init
  renderTime();
  renderButtons();
})();
