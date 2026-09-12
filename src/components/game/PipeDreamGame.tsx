"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Gamepad2, X } from "lucide-react";
import "./pipe-dream-game.css";

export function PipeDreamGame() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* game.js is a vanilla IIFE that wires up its own DOM by id and starts a
          requestAnimationFrame loop; next/script's src-based dedup keeps it from
          being injected/executed more than once even across re-renders. */}
      <Script src="/game/game.js" strategy="afterInteractive" />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
      >
        <Gamepad2 className="h-4 w-4" />
        Play Pipe Dream
      </button>

      {/* Kept mounted (just hidden) once opened so game.js's DOM references and
          its rAF loop stay attached to the same elements across open/close. */}
      <div className="pd-game-overlay" style={{ display: open ? "flex" : "none" }}>
        <button
          type="button"
          className="pd-game-close"
          onClick={() => setOpen(false)}
          aria-label="Close game"
        >
          <X className="h-5 w-5" />
        </button>

        <div id="app">
          <div id="titlebar">
            <span className="title-icon">🚰</span>
            <span className="title-text">Pipe Dream</span>
            <div className="title-buttons">
              <button className="tbtn" title="Minimize">_</button>
              <button className="tbtn" title="Maximize">&#9633;</button>
              <button className="tbtn" title="Close" onClick={() => setOpen(false)}>&times;</button>
            </div>
          </div>
          <div id="menubar">
            <span>File</span><span>Game</span><span>Options</span><span>Help</span>
          </div>

          <header id="topbar">
            <div className="stat">
              <label>Score</label>
              <div className="led" id="score">0</div>
            </div>
            <div className="stat">
              <label>Best</label>
              <div className="led" id="highscore">0</div>
            </div>
            <div className="stat">
              <label>Level</label>
              <div className="led" id="level">1</div>
            </div>
            <button id="helpBtn" title="How to play">?</button>
            <button id="muteBtn" title="Mute sound">Snd</button>
          </header>

          <main id="playfield">
            <div id="boardWrap">
              <canvas id="board" />
              <div id="phaseBanner" />
            </div>

            <aside id="sidebar">
              <fieldset className="panel">
                <legend>Time to Flooz</legend>
                <div className="bar"><div id="timeBar" className="bar-fill" /></div>
              </fieldset>

              <fieldset className="panel">
                <legend>Flow Progress</legend>
                <div className="bar"><div id="lenBar" className="bar-fill green" /></div>
                <div id="lenLabel">0 / 0</div>
              </fieldset>

              <fieldset className="panel">
                <legend>Next Pieces</legend>
                <div id="queue" />
              </fieldset>

              <fieldset className="panel">
                <legend>Tip</legend>
                <p className="hint">Click an empty tile to place the next pipe. Connect the flooz from the start valve for as long as you can!</p>
              </fieldset>
            </aside>
          </main>

          <div id="statusbar">Ready</div>

          <div id="overlay" className="hidden">
            <div className="dialog">
              <div className="dialog-titlebar">
                <span id="overlayTitle">Pipe Dream</span>
                <button className="tbtn" data-dismiss="">&times;</button>
              </div>
              <div className="dialog-body">
                <div className="dialog-icon">🚰</div>
                <p id="overlayText" />
              </div>
              <div className="dialog-buttons">
                <button id="overlayBtn">Start</button>
              </div>
            </div>
          </div>

          <div id="helpOverlay" className="hidden">
            <div className="dialog">
              <div className="dialog-titlebar">
                <span>How To Play</span>
                <button className="tbtn" data-dismiss="">&times;</button>
              </div>
              <div className="dialog-body">
                <div className="dialog-icon">ℹ</div>
                <ul className="rules">
                  <li>A queue of pipe pieces waits on the right. Click any empty tile to place the <b>next</b> piece there.</li>
                  <li>Pieces cannot be rotated — pick your placements to steer the flow.</li>
                  <li>When the &quot;Time to Flooz&quot; bar runs out, the flooz starts flowing from the start valve.</li>
                  <li>Keep placing pipes ahead of the flow — if it reaches an empty tile, a rock, or a pipe end that doesn&apos;t connect onward, it bursts and the game is over.</li>
                  <li>Reach the target flow length to clear the level. Each level flows faster and has less build time.</li>
                </ul>
              </div>
              <div className="dialog-buttons">
                <button id="helpCloseBtn">OK</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
