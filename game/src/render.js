// Midnight Vault Heist — canvas rendering. Draws the room, the thief, guards with
// their vision cones, sweeping cameras, loot, the vault, the exit and the HUD.
import { CAMERA_VIEW, FIELD, GUARD_VIEW, PLAYER } from './config.js';
import { SMOKE_RADIUS, exitReady } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const FLOOR_A = '#20242e';
const FLOOR_B = '#1b1e27';
const WALL = '#3d4457';
const WALL_TOP = '#565f78';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawFloor(ctx) {
  ctx.fillStyle = FLOOR_A;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = FLOOR_B;
  const tile = 60;
  for (let y = 0; y < FIELD.height; y += tile) {
    for (let x = 0; x < FIELD.width; x += tile) {
      if (((x + y) / tile) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD.width; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
  }
  for (let y = 0; y <= FIELD.height; y += tile) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
  }
}

function drawWalls(ctx, walls) {
  for (const w of walls) {
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(w.x, w.y, w.w, 4);
    ctx.fillStyle = WALL;
    ctx.fillRect(w.x, w.y + 4, w.w, w.h - 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
}

function drawLoot(ctx, item) {
  if (item.taken) return;
  const colors = { gold: '#f5c542', gem: '#4dd7ff', art: '#ff7ad9' };
  const color = colors[item.kind];
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  if (item.kind === 'gold') {
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6d1f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
  } else if (item.kind === 'gem') {
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(9, 0); ctx.lineTo(0, 11); ctx.lineTo(-9, 0);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillRect(-10, -8, 20, 16);
    ctx.fillStyle = '#5b1a45';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawVault(ctx, vault) {
  ctx.fillStyle = vault.open ? '#2f6b4f' : '#4a4f5e';
  ctx.fillRect(vault.x, vault.y, vault.w, vault.h);
  ctx.strokeStyle = vault.open ? '#7dffb0' : '#c9a227';
  ctx.lineWidth = 3;
  ctx.strokeRect(vault.x + 1.5, vault.y + 1.5, vault.w - 3, vault.h - 3);
  ctx.fillStyle = vault.open ? '#7dffb0' : '#c9a227';
  ctx.beginPath(); ctx.arc(vault.x + vault.w / 2, vault.y + vault.h / 2, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1e26';
  ctx.beginPath(); ctx.arc(vault.x + vault.w / 2, vault.y + vault.h / 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(vault.open ? 'OPEN' : 'VAULT', vault.x + vault.w / 2, vault.y - 8);
  if (!vault.open && vault.progress > 0) {
    ctx.fillStyle = '#222';
    ctx.fillRect(vault.x, vault.y + vault.h + 4, vault.w, 6);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(vault.x, vault.y + vault.h + 4, vault.w * vault.progress, 6);
  }
}

function drawExit(ctx, exit, ready) {
  ctx.fillStyle = ready ? '#1f7a44' : '#3a3f4d';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = ready ? '#7dffb0' : '#8a8f9e';
  ctx.lineWidth = 3;
  ctx.setLineDash(ready ? [] : [6, 5]);
  ctx.strokeRect(exit.x + 1.5, exit.y + 1.5, exit.w - 3, exit.h - 3);
  ctx.setLineDash([]);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(ready ? 'EXIT' : 'LOCKED', exit.x + exit.w / 2, exit.y + exit.h + 15);
}

function drawGuard(ctx, guard, alert) {
  const seen = alert > 0.25;
  ctx.save();
  conePath(ctx, guard.x, guard.y, guard.angle, GUARD_VIEW.range, GUARD_VIEW.halfAngle);
  ctx.fillStyle = seen ? 'rgba(255,64,64,0.30)' : 'rgba(255,214,64,0.20)';
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#c33';
  ctx.beginPath(); ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ff8a8a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ffd6d6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.angle) * 18, guard.y + Math.sin(guard.angle) * 18);
  ctx.stroke();
  if (seen) {
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 20);
  }
}

function drawCamera(ctx, cam) {
  const disabled = cam.disabled > 0;
  ctx.save();
  conePath(ctx, cam.x, cam.y, cam.angle, CAMERA_VIEW.range, CAMERA_VIEW.halfAngle);
  ctx.fillStyle = disabled ? 'rgba(120,120,120,0.10)' : 'rgba(255,80,80,0.16)';
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = disabled ? '#777' : '#e33';
  ctx.beginPath(); ctx.arc(cam.x, cam.y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = disabled ? '#444' : '#ff6b6b';
  ctx.beginPath(); ctx.arc(cam.x, cam.y, 3, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer(ctx, player, vaultBusy) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 4, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(player.angle);
  ctx.fillStyle = '#22242c';
  ctx.beginPath(); ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath(); ctx.arc(3, -4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(6, -3, 9, 6);
  ctx.restore();
  if (vaultBusy) {
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING...', player.x, player.y - 22);
  }
}

function drawSmoke(ctx, smoke) {
  if (!smoke) return;
  const grad = ctx.createRadialGradient(smoke.x, smoke.y, 8, smoke.x, smoke.y, SMOKE_RADIUS);
  grad.addColorStop(0, 'rgba(200,200,210,0.55)');
  grad.addColorStop(1, 'rgba(200,200,210,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(smoke.x, smoke.y, SMOKE_RADIUS, 0, Math.PI * 2); ctx.fill();
}

function drawHud(ctx, world, screen) {
  const level = world.level;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, FIELD.width, 44);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LEVEL ${world.levelIndex + 1} · ${level.name}`, 14, 15);
  ctx.font = '13px sans-serif';
  ctx.fillText(`SCORE ${world.score}   LOOT ${world.lootTaken}/${level.loot.length} (need ${level.needLoot})`, 14, 33);
  ctx.textAlign = 'right';
  const mins = Math.floor(world.timeLeft / 60);
  const secs = Math.floor(world.timeLeft % 60);
  ctx.fillStyle = world.timeLeft < 30 ? '#ff8080' : '#f2f2f2';
  ctx.fillText(`TIME ${mins}:${String(secs).padStart(2, '0')}`, FIELD.width - 14, 15);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillText('1 Smoke  2 EMP  3 Lockpick', FIELD.width - 14, 33);
  // Alarm meter.
  const mx = 330;
  const mw = 300;
  ctx.fillStyle = '#111';
  ctx.fillRect(mx, 12, mw, 20);
  const alarmColor = world.alarm > 66 ? '#ff4040' : world.alarm > 33 ? '#ffb020' : '#3fae5a';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(mx, 12, (mw * world.alarm) / 100, 20);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 0.5, 12.5, mw, 20);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ALARM ${Math.round(world.alarm)}%`, mx + mw / 2, 22);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (screen === SCREEN_PLAY && world.messageLeft > 0) {
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, FIELD.width / 2, 70);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,16,0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, 210);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, 260 + i * 30);
  });
  ctx.textAlign = 'left';
}

export function drawWorld(ctx, world, screen) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawFloor(ctx);
  drawExit(ctx, world.level.exit, exitReady(world));
  for (const item of world.level.loot) drawLoot(ctx, item);
  drawVault(ctx, world.level.vault);
  drawWalls(ctx, world.level.walls);
  for (const cam of world.level.cameras) drawCamera(ctx, cam);
  for (const g of world.level.guards) drawGuard(ctx, g, g.alert);
  drawSmoke(ctx, world.smoke);
  drawPlayer(ctx, world.player, world.vaultBusy);
  drawHud(ctx, world, screen);
  if (screen === SCREEN_TITLE) {
    overlay(ctx, 'MIDNIGHT VAULT HEIST', [
      'Sneak in. Crack the vault. Grab the loot. Get out.',
      'WASD / arrows to move · click to walk · E crack vault',
      '1 smoke bomb · 2 EMP · 3 lockpick — each costs score',
      'Stay out of the yellow cones and red camera beams.',
      'Press ENTER to start the heist',
    ], '#f5c542');
  } else if (screen === SCREEN_OVER) {
    if (world.won) {
      overlay(ctx, 'CLEAN GETAWAY!', [
        `You escaped with $${world.lootValue} of loot.`,
        `Final score: ${world.score}`,
        'Press R to play again · ENTER for the next room',
      ], '#7dffb0');
    } else if (world.caught) {
      overlay(ctx, 'BUSTED!', [
        'The alarm hit 100% and the guards swarmed you.',
        `Score: ${world.score} · Loot grabbed: ${world.lootTaken}`,
        'Press R to try the room again',
      ], '#ff4040');
    } else {
      overlay(ctx, 'OUT OF TIME', [
        'Dawn broke before you reached the exit.',
        `Score: ${world.score} · Loot grabbed: ${world.lootTaken}`,
        'Press R to try the room again',
      ], '#ffb020');
    }
  }
}
