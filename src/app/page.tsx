"use client"

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { THEMES, FONTS, getSliders } from '../data/themes'
import { DIRECTORY } from '../data/terminalContent'
import { CRTScreen } from '../components/CRTScreen'
import { initAudio, toggleMute, isMuted, playClack, playTick, playEnter, playBootUp, playPowerOff, playModalOpen, playModalClose, startHum } from '../../utils/audioEngine'

export default function WebGLTerminalPage() {
  const [uiState, setUiState] = useState({
    scrollOffset: 0,
    navPath: [0, 0],
    focusDepth: 0,
    themeIdx: 0,
    fontIdx: 0,
    settingsOpen: false,
    aspectRatio: '4:3',
    settingsCursorIdx: 0,
    isBooted: false,
    soundOn: true
  })

  const [effects, setEffects] = useState({
    bloomAmt: THEMES[0].bloom,
    bloomRadius: THEMES[0].radius,
    bloomThresh: THEMES[0].thresh,
    burnIn: THEMES[0].burnIn,
    brightness: THEMES[0].bright,
    saturation: THEMES[0].satur,
    curvature: THEMES[0].curve,
    downsample: THEMES[0].crush,
    grain: THEMES[0].grain
  })

  const hoverRef = useRef({ x: -1, y: -1 })
  const activeSliderRef = useRef(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef('')
  const cursorRef = useRef(0)
  const setRedrawFn = useRef<(() => void) | null>(null)
  const gridSizeRef = useRef({ cols: 142, rows: 32, charW: 14.4, charH: 32 })

  useEffect(() => {
    const t = THEMES[uiState.themeIdx]
    setEffects({
      bloomAmt: t.bloom,
      bloomRadius: t.radius,
      bloomThresh: t.thresh,
      burnIn: t.burnIn,
      brightness: t.bright,
      saturation: t.satur,
      curvature: t.curve,
      downsample: t.crush,
      grain: t.grain
    })
  }, [uiState.themeIdx])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (inputRef.current) inputRef.current.focus()
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    textRef.current = e.target.value
    cursorRef.current = e.target.selectionStart || 0
    if (setRedrawFn.current) setRedrawFn.current()
  }

  const syncCursor = () => {
    if (inputRef.current) {
      cursorRef.current = inputRef.current.selectionStart || 0
      if (setRedrawFn.current) setRedrawFn.current()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
if (!uiState.isBooted) {
        initAudio();
        playBootUp();
        startHum();
        setUiState(s => ({ ...s, isBooted: true }));
        return;
    }
    if (uiState.isBooted) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            playTick();
        } else if (e.key === 'Enter') {
            playEnter();
        } else if (e.key === 'Escape') {
            playModalClose();
        } else if (e.key.length === 1 || e.key === 'Backspace') {
            playClack();
        }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (uiState.settingsOpen) {
          setUiState(s => ({ ...s, settingsCursorIdx: Math.max(0, s.settingsCursorIdx - 1) }))
      } else {
          setUiState(s => {
              let currentLevel = DIRECTORY;
              for (let i = 0; i < s.focusDepth; i++) {
                  currentLevel = currentLevel[s.navPath[i]]?.children || [];
              }
              const activeNode = s.focusDepth > 0 ? DIRECTORY[s.navPath[0]] : null;
              if (s.focusDepth === 1 && activeNode && activeNode.type === 'page') {
                  return { ...s, scrollOffset: Math.max(0, s.scrollOffset - 1) };
              }
              const newPath = [...s.navPath];
              newPath[s.focusDepth] = Math.max(0, newPath[s.focusDepth] - 1);
              return { ...s, navPath: newPath, scrollOffset: 0 }
          })
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (uiState.settingsOpen) {
          setUiState(s => ({ ...s, settingsCursorIdx: Math.min(18, s.settingsCursorIdx + 1) }))
      } else {
          setUiState(s => {
              let currentLevel = DIRECTORY;
              for (let i = 0; i < s.focusDepth; i++) {
                  currentLevel = currentLevel[s.navPath[i]]?.children || [];
              }
              const activeNode = s.focusDepth > 0 ? DIRECTORY[s.navPath[0]] : null;
              if (s.focusDepth === 1 && activeNode && activeNode.type === 'page') {
                  return { ...s, scrollOffset: s.scrollOffset + 1 };
              }
              const newPath = [...s.navPath];
              newPath[s.focusDepth] = Math.min(currentLevel.length - 1, newPath[s.focusDepth] + 1);
              return { ...s, navPath: newPath, scrollOffset: 0 }
          })
      }
    } else if (e.key === 'Escape') {
      setUiState(s => ({ ...s, settingsOpen: false }))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (uiState.settingsOpen) {
          if (uiState.settingsCursorIdx < 6) {
              setUiState(s => ({ ...s, themeIdx: s.settingsCursorIdx }))
          } else if (uiState.settingsCursorIdx < 9) {
              setUiState(s => ({ ...s, fontIdx: s.settingsCursorIdx - 6 }))
          } else if (uiState.settingsCursorIdx >= 15 && uiState.settingsCursorIdx < 18) {
              const ratios = ['4:3', '5:4', 'FLUID']
              setUiState(s => ({ ...s, aspectRatio: ratios[s.settingsCursorIdx - 15] }))
          } else if (uiState.settingsCursorIdx === 18) {
              playModalClose();
              setUiState(s => ({ ...s, settingsOpen: false }))
          }
      } else {
          // You could map 'Enter' to ArrowRight behavior when a folder is selected
          setUiState(s => {
              let currentLevel = DIRECTORY;
              for (let i = 0; i < s.focusDepth; i++) {
                  currentLevel = currentLevel[s.navPath[i]]?.children || [];
              }
              const activeNode = currentLevel[s.navPath[s.focusDepth]];
              if (activeNode && activeNode.type === 'folder' && activeNode.children) {
                  return { ...s, focusDepth: s.focusDepth + 1, navPath: [...s.navPath.slice(0, s.focusDepth + 1), 0] }
              }
              return s;
          })
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (uiState.settingsOpen && uiState.settingsCursorIdx >= 9 && uiState.settingsCursorIdx < 15) {
          e.preventDefault()
          const sliderIdx = uiState.settingsCursorIdx - 9
          const delta = e.key === 'ArrowRight' ? 0.05 : -0.05
          const SLIDER_CFG = getSliders(effects, setEffects);
          const cfg = SLIDER_CFG[sliderIdx]
          cfg.set(Math.max(cfg.min, Math.min(cfg.max, cfg.val + delta)))
      } else if (!uiState.settingsOpen) {
          e.preventDefault();
          if (e.key === 'ArrowLeft') {
              setUiState(s => {
                  if (s.focusDepth > 0) {
                      return { ...s, focusDepth: s.focusDepth - 1, navPath: s.navPath.slice(0, s.focusDepth), scrollOffset: 0 }
                  }
                  return s;
              });
          } else {
              setUiState(s => {
                  let currentLevel = DIRECTORY;
                  for (let i = 0; i < s.focusDepth; i++) {
                      currentLevel = currentLevel[s.navPath[i]]?.children || [];
                  }
                  const activeNode = currentLevel[s.navPath[s.focusDepth]];
                  if (activeNode) {
                      if (activeNode.type === 'folder' && activeNode.children) {
                          return { ...s, focusDepth: s.focusDepth + 1, navPath: [...s.navPath.slice(0, s.focusDepth + 1), 0] }
                      } else if (activeNode.type === 'page') {
                          return { ...s, focusDepth: s.focusDepth + 1 }
                      }
                  }
                  return s;
              });
          }
      }
    }
  }

  const handlePointerInteraction = (e: any, isClick: boolean) => {
    if (isClick && inputRef.current) inputRef.current.focus()

    const COLS = gridSizeRef.current.cols
    const ROWS = gridSizeRef.current.rows

    const rect = e.currentTarget.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
    
    const mult = 1.15
    const gridX = Math.floor(((nx * mult + 1) / 2) * COLS)
    const offsetY = Math.max(0, Math.floor((ROWS - 30) / 2));
    const gridY = Math.floor(((-ny * mult + 1) / 2) * ROWS) - offsetY;

    const prevHoverX = hoverRef.current.x
    const prevHoverY = hoverRef.current.y
    if (!isClick && (prevHoverX !== gridX || prevHoverY !== gridY)) {
        hoverRef.current = { x: gridX, y: gridY }
        if (setRedrawFn.current) setRedrawFn.current()
    }

if (!uiState.isBooted) {
        if (isClick) {
            initAudio();
            playBootUp();
            startHum();
            setUiState(s => ({ ...s, isBooted: true }));
        }
        return;
    }

    if (uiState.settingsOpen) {
        const w = 60; const h = 19;
        const boxX = Math.floor((COLS - w) / 2);
        const boxY = Math.floor((30 - h) / 2);
        const col2ItmX = boxX + 33;

       if (activeSliderRef.current >= 0) {
           let fraction = Math.max(0, Math.min(1, (gridX - (col2ItmX + 9)) / 8));
           const SLIDER_CFG = getSliders(effects, setEffects);
           const cfg = SLIDER_CFG[activeSliderRef.current];
           cfg.set(cfg.min + fraction * (cfg.max - cfg.min));
           return;
       }
       
       if (isClick && gridX >= boxX && gridX <= boxX + w && gridY >= boxY && gridY <= boxY + h) {
             for (let i = 0; i < THEMES.length; i++) {
                 if (gridY === boxY + 3 + i && gridX >= boxX + 6 && gridX <= boxX + 26) {
                     playTick();
                      setUiState(s => ({ ...s, themeIdx: i })); return;
                 }
             }
             for (let i = 0; i < FONTS.length; i++) {
                 if (gridY === boxY + 12 + i && gridX >= boxX + 6 && gridX <= boxX + 26) {
                     playTick();
                      setUiState(s => ({ ...s, fontIdx: i })); return;
                 }
             }
             if (gridY >= boxY + 3 && gridY <= boxY + 8 && gridX >= col2ItmX && gridX <= col2ItmX + 24) {
                 const sliderIdx = gridY - (boxY + 3);
                 activeSliderRef.current = sliderIdx;
                 playClack();
                 let fraction = Math.max(0, Math.min(1, (gridX - (col2ItmX + 9)) / 8));
                 const SLIDER_CFG = getSliders(effects, setEffects);
                 const cfg = SLIDER_CFG[sliderIdx];
                 cfg.set(cfg.min + fraction * (cfg.max - cfg.min));
                 return;
             }
             if (gridY === boxY + h - 3 && gridX >= boxX + 25 && gridX <= boxX + 33) {
                 playModalClose();
                 setUiState(s => ({ ...s, settingsOpen: false })); return;
             }
             if (gridY >= boxY + 12 && gridY <= boxY + 14 && gridX >= col2ItmX && gridX <= col2ItmX + 24) {
                  const ratios = ['4:3', '5:4', 'FLUID'];
                  playTick();
                  setUiState(s => ({ ...s, aspectRatio: ratios[gridY - (boxY + 12)] }));
                  return;
             }
            return; 
       }
    }

    const soundText = uiState.soundOn ? '[ SOUND: ON ]' : '[ SOUND: MUTED ]'
    const topBarRightStr = `[ SETTINGS ]  ${soundText}`
    const startX = COLS - topBarRightStr.length - 2
    if (gridY === 1 && isClick) {
       if (gridX >= startX + 14 && gridX < startX + 14 + soundText.length) {
           playTick();
           initAudio();
           startHum();
           toggleMute();
           setUiState(s => ({ ...s, soundOn: !isMuted }));
           return;
       }
       if (gridX >= startX && gridX <= startX + 11) {
           playModalOpen();
           setUiState(s => ({ ...s, settingsOpen: true }))
           return
       }
    }

    if (isClick && !uiState.settingsOpen) {
        const contactX = COLS - 30;
        if (gridY === 3 && gridX >= contactX && gridX < contactX + 22) {
            playTick();
            window.location.href = 'mailto:nawfaljaffri@gmail.com';
            return;
        }
        if (gridY === 5 && gridX >= contactX && gridX < contactX + 28) {
            playTick();
            window.open('https://linkedin.com/in/nawfaljaffri', '_blank');
            return;
        }
    }

    const colW = 20;
    if (isClick && !uiState.settingsOpen) {
        if (gridY >= 10 && gridY < 28) {
            for (let depth = 0; depth <= uiState.navPath.length; depth++) {
                const isProjectsList = depth === 1;
                const startX = isProjectsList ? colW + 2 : 1;
                const hitW = isProjectsList ? 24 : colW - 1;
                
                if (gridX >= startX && gridX < startX + hitW) {
                    let currentLevel: any = DIRECTORY;
                    for (let i = 0; i < depth; i++) {
                        currentLevel = currentLevel?.[uiState.navPath[i]]?.children;
                    }
                    if (currentLevel) {
                        const startY = isProjectsList ? 12 : 10;
                        const idx = gridY - startY;
                        if (idx >= 0 && idx < currentLevel.length) {
                            playTick();
                            setUiState(s => {
                                const newPath = [...s.navPath.slice(0, depth), idx];
                                return { ...s, focusDepth: Math.max(s.focusDepth, depth), navPath: newPath, scrollOffset: 0 }
                            })
                            if (inputRef.current) inputRef.current.focus()
                        }
                    }
                }
            }
        }
    }
  }

  return (
    <div className="w-screen h-[100dvh] bg-black flex items-center justify-center overflow-hidden">
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          maxWidth: uiState.aspectRatio === '4:3' ? 'calc(100vh * 4/3)' : uiState.aspectRatio === '5:4' ? 'calc(100vh * 5/4)' : 'none',
          maxHeight: uiState.aspectRatio === '4:3' ? 'calc(100vw * 3/4)' : uiState.aspectRatio === '5:4' ? 'calc(100vw * 4/5)' : 'none',
          aspectRatio: uiState.aspectRatio === '4:3' ? '4/3' : uiState.aspectRatio === '5:4' ? '5/4' : 'auto'
        }}
        className="relative cursor-none touch-none"
        onWheel={(e) => {
          if (!uiState.settingsOpen) {
            setUiState(s => ({ ...s, scrollOffset: Math.max(0, s.scrollOffset + (e.deltaY > 0 ? 0.3 : -0.3)) }));
          }
        }}
        onPointerDown={(e) => handlePointerInteraction(e, true)}
        onPointerMove={(e) => handlePointerInteraction(e, false)}
        onPointerUp={() => { 
          activeSliderRef.current = -1;
          if (inputRef.current) inputRef.current.focus();
        }}
        onPointerLeave={() => { activeSliderRef.current = -1 }}
      >
        <Canvas camera={{ position: [0, 0, 7], fov: 60 }}>
          <CRTScreen 
            uiState={uiState} setUiState={setUiState}
            effects={effects} setEffects={setEffects}
            textRef={textRef} cursorRef={cursorRef} setRedrawFn={setRedrawFn}
            gridSizeRef={gridSizeRef} hoverRef={hoverRef}
          />
        </Canvas>

      <input
        ref={inputRef}
        type="text"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none"
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={syncCursor}
        onMouseUp={syncCursor}
        autoFocus
      />
      </div>
    </div>
  )
}
