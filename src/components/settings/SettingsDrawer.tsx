"use client";

import React, { useState } from "react";
import { useSettingsStore, CmdMode, CmdDock, TestMode } from "@/store/settings";
import CommandHintsFloating from "@/components/ui/CommandHintsFloating";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPanel() {
  const s = useSettingsStore();
  const [importText, setImportText] = useState("");
  return (
        <div className="p-0">
          {/* Commands */}
          <Card className="mb-4 bg-white/5 border border-white/10">
            <CardContent className="p-4 space-y-3">
              <div className="text-white/80 font-medium">Commands</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-white/60 mb-1">Default mode</div>
                  {(["hidden","peek","full"] as CmdMode[]).map(m => (
                    <label key={m} className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="cmdMode"
                        checked={s.commands.defaultMode===m}
                        onChange={() => {
                          s.update('commands', { defaultMode: m });
                          try { localStorage.setItem('bk:cmdHints.mode', m); } catch {}
                          try { window.dispatchEvent(new CustomEvent('bk:cmdHints:update')); } catch {}
                        }}
                      />
                      <span className="capitalize">{m === 'peek' ? 'Peek (minimized)' : m === 'full' ? 'Full panel' : 'Hidden'}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <div className="text-white/60 mb-1">Dock corner</div>
                  {(["br","bl","tr","tl"] as CmdDock[]).map(d => (
                    <label key={d} className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="cmdDock"
                        checked={s.commands.defaultDock===d}
                        onChange={() => {
                          s.update('commands', { defaultDock: d });
                          try { localStorage.setItem('bk:cmdHints.dock', d); } catch {}
                          try { window.dispatchEvent(new CustomEvent('bk:cmdHints:update')); } catch {}
                        }}
                      />
                      <span className="capitalize">{d === 'br' ? 'Bottom-right' : d === 'bl' ? 'Bottom-left' : d === 'tr' ? 'Top-right' : 'Top-left'}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={s.commands.autoShowOnResults} onChange={(e)=>s.update('commands',{ autoShowOnResults: e.target.checked })} />Auto-show on results</label>
                </div>
                <div>
                  <label className="block text-white/60 mb-1">Auto peek delay (ms)</label>
                  <input type="number" min={2000} max={20000} step={500} value={s.commands.autoPeekDelayMs}
                    onChange={(e)=>s.update('commands',{ autoPeekDelayMs: Math.min(20000, Math.max(2000, Number(e.target.value)||8000)) })}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1" />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 p-3">
                <div className="text-white/60 text-xs mb-2">Live preview</div>
                <div className="relative h-28">
                  <div className="absolute right-3 bottom-3">
                    <CommandHintsFloating context="results" defaultMode={s.commands.defaultMode} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test defaults */}
          <Card className="mb-4 bg-white/5 border border-white/10">
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="text-white/80 font-medium">Test defaults</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-white/60 mb-1">Default mode</div>
                  {(["words","time","quote","custom"] as TestMode[]).map(m => (
                    <label key={m} className="flex items-center gap-2 mb-1">
                      <input type="radio" name="testMode" checked={s.test.defaultMode===m} onChange={()=>s.update('test',{ defaultMode: m })} />
                      <span className="capitalize">{m}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <div className="text-white/60 mb-1">Default length</div>
                  {[10,15,20,30,50].map(n => (
                    <label key={n} className="inline-flex items-center gap-2 mr-2 mb-1">
                      <input type="radio" name="testLen" checked={s.test.defaultLength===n} onChange={()=>s.update('test',{ defaultLength: n })} />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={s.test.include_numbers} onChange={(e)=>s.update('test',{ include_numbers: e.target.checked })} />Include numbers</label>
                </div>
                <div>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={s.test.include_punctuation} onChange={(e)=>s.update('test',{ include_punctuation: e.target.checked })} />Include punctuation</label>
                </div>
              </div>
              <div className="text-white/50 text-xs">Applied on first load and new test when not overridden.</div>
            </CardContent>
          </Card>

          {/* Privacy (stub) */}
          <Card className="mb-4 bg-white/5 border border-white/10">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="text-white/80 font-medium">Privacy</div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={s.privacy.publicProfile} onChange={(e)=>s.update('privacy',{ publicProfile: e.target.checked })} />Public profile (coming soon)</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={s.privacy.shareRunsByDefault} onChange={(e)=>s.update('privacy',{ shareRunsByDefault: e.target.checked })} />Share runs by default (coming soon)</label>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <button className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10" onClick={()=>s.reset()}>Reset to defaults</button>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10" onClick={()=>{
                try {
                  const data = s.export();
                  const blob = new Blob([data], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'blaze_settings.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),0);
                } catch {}
              }}>Export JSON</button>
              <button className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10" onClick={()=>{
                const x = prompt("Paste settings JSON"); if (x) try { s.import(x); } catch {}
              }}>Import JSON</button>
            </div>
          </div>
        </div>
  );
}


