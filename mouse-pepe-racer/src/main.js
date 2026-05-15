import './style.css';
import { MonsterRallyGame } from './game/MonsterRallyGame.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div id="game-shell">
    <div id="hud">
      <div id="title">CHEESE MONSTER RALLY</div>
      <div id="stats">
        <div>ETH SPEED: <span id="eth-speed">0</span></div>
        <div>SOL SPEED: <span id="sol-speed">0</span></div>
        <div>POSITION: <span id="position">2 / 2</span></div>
        <div>COURSE: <span id="coins">0%</span></div>
      </div>
      <div id="controls-note">
        P1: W/S = Gas/Brake, A/D = Turn<br />
        P2: I/K = Gas/Brake, J/L = Turn<br />
        R = Restart Race, C = Camera
      </div>
      <div id="mode-controls">
        <button class="mode-btn active" data-mode="1">1 PLAYER</button>
        <button class="mode-btn" data-mode="2">2 PLAYER</button>
      </div>
      <div id="message">RACE START!</div>
      <div id="mobile-controls">
        <div class="control-group">
          <button class="btn small" data-hold="left">LEFT</button>
          <button class="btn" data-hold="brake">BRAKE</button>
          <button class="btn small" data-hold="right">RIGHT</button>
        </div>
        <div class="control-group">
          <button class="btn" data-tap="restart">RESET</button>
          <button class="btn" data-hold="gas">GAS</button>
        </div>
      </div>
    </div>
  </div>
`;

const game = new MonsterRallyGame(document.querySelector('#game-shell'));
game.start();
const setInput = (action, value) => {
  if (typeof game.setInput === 'function') {
    game.setInput(action, value);
    return;
  }
  game.input[action] = value;
};

const bindHold = (button, action) => {
  let holding = false;

  const finishOff = () => {
    holding = false;
    button.classList.remove('pressed');
    setInput(action, false);
  };

  const on = (e) => {
    if (e) e.preventDefault();
    if (e?.pointerId !== undefined && button.setPointerCapture) {
      button.setPointerCapture(e.pointerId);
    }
    holding = true;
    button.classList.add('pressed');
    setInput(action, true);
  };
  const off = (e) => {
    if (e) e.preventDefault();
    if (!holding) return;
    finishOff();
  };

  button.addEventListener('pointerdown', on);
  button.addEventListener('pointerup', off);
  button.addEventListener('pointercancel', off);
  button.addEventListener('mousedown', on);
  button.addEventListener('mouseup', off);
  button.addEventListener('touchstart', on, { passive: false });
  button.addEventListener('touchend', off, { passive: false });
  button.addEventListener('touchcancel', off, { passive: false });
  button.addEventListener('pointerleave', (e) => {
    if (holding && e.buttons === 0) off(e);
  });
  window.addEventListener('pointerup', off);
  window.addEventListener('mouseup', off);
  window.addEventListener('touchend', off, { passive: false });
  window.addEventListener('blur', off);
};

document.querySelectorAll('[data-hold]').forEach((button) => bindHold(button, button.dataset.hold));
document.querySelector('[data-tap="restart"]').addEventListener('click', () => game.restartRace());
document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    const mode = Number(button.dataset.mode);
    game.setPlayerMode(mode);
    document.querySelectorAll('[data-mode]').forEach((otherButton) => {
      otherButton.classList.toggle('active', Number(otherButton.dataset.mode) === mode);
    });
  });
});
