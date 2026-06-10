import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { Effects } from '@react-three/drei'
import * as THREE from 'three'
import { ShaderPass, UnrealBloomPass, AfterimagePass } from 'three-stdlib'
import { FONTS, THEMES, SNAKE_COLORS, getSliders } from '../data/themes'
import { DIRECTORY } from '../data/terminalContent'
import { CRTShader } from '../gl/CRTShader'
import { TextBuffer } from '../gl/TextBuffer'
import { MouseCursor } from './MouseCursor'

extend({ ShaderPass, UnrealBloomPass, AfterimagePass })

export function CRTScreen({ 
  uiState, setUiState, effects, setEffects,
  textRef, cursorRef, setRedrawFn, gridSizeRef, hoverRef
}: any) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const textureRef = useRef<THREE.CanvasTexture | null>(null)
  const { viewport } = useThree()
  
  const shaderPassRef = useRef<any>(null)
  const bloomRef = useRef<any>(null)
  const afterimageRef = useRef<any>(null)
  const cursorVisible = useRef(true)
    const snakeState = useRef({ 
      body: [
        {x: 10, y: 10, color: SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]}, 
        {x: 9, y: 10, color: SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]}, 
        {x: 8, y: 10, color: SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]}
      ], 
      dir: {x: 1, y: 0}, food: {x: 20, y: 15}, lastMove: 0 
    });

  const activeTheme = THEMES[uiState.themeIdx]
  const activeFont = FONTS[uiState.fontIdx]

  const sysInfo = useMemo(() => {
    if (typeof window === 'undefined') return { cores: 4, mem: 8, os: 'UNKNOWN' }
    const ua = navigator.userAgent
    let os = 'UNKNOWN'
    if (ua.indexOf('Mac OS X') !== -1) os = 'macOS'
    else if (ua.indexOf('Windows') !== -1) os = 'Windows'
    else if (ua.indexOf('Linux') !== -1) os = 'Linux'
    return {
      cores: navigator.hardwareConcurrency || 8,
      // @ts-ignore
      mem: navigator.deviceMemory || 16,
      os
    }
  }, [])

  useMemo(() => {
    if (typeof window === 'undefined') return
    const cvs = document.createElement('canvas')
    cvs.width = 2048
    cvs.height = 1024
    canvasRef.current = cvs
    
    const tex = new THREE.CanvasTexture(cvs)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    textureRef.current = tex
  }, [])

  const drawCanvas = () => {
    if (!canvasRef.current || !textureRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const W = canvasRef.current.width
    const H = canvasRef.current.height

    ctx.font = `${activeFont.size}px ${activeFont.css}`
    const charW = ctx.measureText('M').width
    const charH = 32
    
    const COLS = Math.floor(W / charW)
    const ROWS = Math.floor(H / charH)
    
    gridSizeRef.current = { cols: COLS, rows: ROWS, charW, charH }

    ctx.imageSmoothingEnabled = false
    ctx.textBaseline = 'top'

    const buffer = new TextBuffer(COLS, ROWS);
    const offsetY = Math.max(0, Math.floor((ROWS - 30) / 2));
    const writeUI = (x: number, y: number, str: string, col: number) => buffer.writeStr(x, y + offsetY, str, col);
    const drawBoxUI = (x: number, y: number, w: number, h: number, title?: string) => buffer.drawBox(x, y + offsetY, w, h, title);

    if (!uiState.isBooted) {
        // Draw Snake
        const s = snakeState.current;
        s.body.forEach((segment: any) => {
            buffer.writeStr(segment.x, segment.y, '█', segment.color);
        });
        buffer.writeStr(s.food.x, s.food.y, '●', 0);

        // Draw Title
        const titleStr = "NAWFAL JAFFRI";
        const titleX = Math.floor((COLS - titleStr.length) / 2);
        const titleY = Math.floor(ROWS / 2) - 1;
        buffer.writeStr(titleX, titleY, titleStr, 0);
        
        buffer.renderToCanvas(ctx, charW, charH, activeFont, activeTheme);
        
        // Draw pulsing prompt (text only, no solid background to prevent bloom bleeding)
        const promptStr = "[ PRESS ANY KEY TO POWER ON ]";
        const px = Math.floor((COLS - promptStr.length) / 2) * charW;
        const py = Math.floor(ROWS / 2 + 1) * charH + activeFont.yOffset;
        
        const hex2rgb = (hex: string) => {
            const v = parseInt(hex.replace('#', ''), 16);
            return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
        };
        const fgRgb = hex2rgb(activeTheme.fg);
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        
        ctx.font = `${activeFont.size}px ${activeFont.css}`;
        ctx.fillStyle = `rgba(${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b}, ${pulse})`;
        ctx.fillText(promptStr, px, py);
        
        textureRef.current.needsUpdate = true;
        return;
    }

    drawBoxUI(0, 0, COLS, 8, '')
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false })
    writeUI(COLS / 2 - 4, 0, `┤${timeStr}├`, 0)
    
    const contactX = COLS - 30;
    const isHoverEmail = hoverRef.current.y === 3 && hoverRef.current.x >= contactX && hoverRef.current.x < contactX + 22;
    const isHoverLinkedIn = hoverRef.current.y === 5 && hoverRef.current.x >= contactX && hoverRef.current.x < contactX + 28;
    writeUI(contactX, 3, `nawfaljaffri@gmail.com`, isHoverEmail ? 2 : 0)
    writeUI(contactX, 4, `+971 50 4945990`, 0)
    writeUI(contactX, 5, `linkedin.com/in/nawfaljaffri`, isHoverLinkedIn ? 2 : 0)
    writeUI(contactX, 6, `Location: Dubai, UAE`, 1)

    const soundText = uiState.soundOn ? '[ SOUND: ON ]' : '[ SOUND: MUTED ]'
    const topBarRight = `[ SETTINGS ]  ${soundText}`
    const startX = COLS - topBarRight.length - 2
    const hx = hoverRef.current.x
    const hy = hoverRef.current.y
    const isHoverSettings = hy === 1 && hx >= startX && hx <= startX + 11
    const isHoverSound = hy === 1 && hx >= startX + 14 && hx < startX + 14 + soundText.length
    
    writeUI(startX, 1, '[ SETTINGS ]', isHoverSettings ? 2 : 0)
    writeUI(startX + 14, 1, soundText, isHoverSound ? 2 : 0)

    const colW = 20;
    
    drawBoxUI(0, 8, colW, 18, 'CONTENTS');
    
    DIRECTORY.forEach((item, idx) => {
        const y = 10 + idx;
        const isSelected = uiState.navPath[0] === idx;
        const isHovered = !uiState.settingsOpen && hy === y && hx >= 1 && hx < colW - 1;
        
        let prefix = '';
        if (item.type === 'folder' && !isSelected) prefix = '+';
        
        const textContent = `${prefix}${item.name}`;
        const str = ` ${textContent}`.padEnd(colW - 1, ' ');
        
        let color = 0;
        if (isSelected) color = 2;
        else if (isHovered) color = 1;

        writeUI(1, y, str, color);
    });

    const previewW = COLS - colW;
    drawBoxUI(colW, 8, previewW, 18, 'PREVIEW');
    
    const wrapText = (text: string, maxLen: number) => {
        const lines: string[] = [];
        const words = text.split(' ');
        let currentLine = '';
        words.forEach(word => {
            if ((currentLine + word).length > maxLen) {
                if (currentLine) lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine += word + ' ';
            }
        });
        if (currentLine) lines.push(currentLine.trim());
        return lines;
    };

    const rootNode = uiState.navPath.length > 0 ? DIRECTORY[uiState.navPath[0]] : null;
    if (rootNode) {
        if (rootNode.type === 'folder') {
            const listW = 24;
            const detailX = colW + listW;
            const detailW = previewW - listW;

            writeUI(colW + 2, 10, `:: ${rootNode.name} ::`, 0);
            writeUI(colW + 2, 11, '─'.repeat(listW - 4), 1);
            
            if (rootNode.children) {
                rootNode.children.forEach((child: any, idx: number) => {
                    const y = 12 + idx; // Reduced gap
                    const isSelected = uiState.navPath.length === 2 && uiState.navPath[1] === idx;
                    const isHovered = !uiState.settingsOpen && hy === y && hx >= colW + 2 && hx < colW + listW - 2;
                    const prefix = isSelected ? '[>]' : '[ ]';
                    let color = 0;
                    if (isSelected) color = 2;
                    else if (isHovered) color = 1;
                    writeUI(colW + 2, y, `${prefix} ${child.name}`, color);
                });
            }

            if (uiState.navPath.length === 2 && rootNode.children) {
                const projectNode = rootNode.children[uiState.navPath[1]];
                if (projectNode) {
                    writeUI(detailX + 2, 10, `:: ${projectNode.name} ::`, 0);
                    writeUI(detailX + 2, 11, '─'.repeat(detailW - 4), 1);
                    
                    const boxH = 7; // Reduced box height to give text more vertical room
                    const bx = detailX + 2;
                    const by = 12; // Start immediately after divider
                    const bw = detailW - 4;
                    // Draw patterned box
                    for (let i = 0; i < bw; i++) {
                        writeUI(bx + i, by, '░', 1);
                        writeUI(bx + i, by + boxH - 1, '░', 1);
                    }
                    for (let j = 0; j < boxH; j++) {
                        writeUI(bx, by + j, '░', 1);
                        writeUI(bx + bw - 1, by + j, '░', 1);
                    }
                    
                    const renderZoneStr = '[ VISUAL ASSET RENDER ZONE ]';
                    writeUI(bx + Math.floor((bw - renderZoneStr.length) / 2), by + Math.floor(boxH / 2), renderZoneStr, 1);

                    writeUI(detailX + 2, 12 + boxH, '─'.repeat(detailW - 4), 1);
                    
                    // Wrap the description text
                    const allLines: string[] = [];
                    const rawDescLines = projectNode.desc.split('\n');
                    rawDescLines.forEach((rawLine: string) => {
                        const wrapped = wrapText(rawLine, detailW - 8);
                        allLines.push(...wrapped);
                    });
                    const stackWrapped = wrapText(`Stack: ${projectNode.lang}  |  Links: ${projectNode.links || ''}`, detailW - 8);
                    allLines.push(...stackWrapped);

                    const maxVisible = 26 - (12 + boxH + 1);
                    const maxScroll = Math.max(0, allLines.length - maxVisible);
                    const scroll = Math.floor(Math.min(uiState.scrollOffset, maxScroll));
                    const currentY = 12 + boxH + 1;
                    
                    for (let i = 0; i < maxVisible && i + scroll < allLines.length; i++) {
                        writeUI(detailX + 2, currentY + i, allLines[i + scroll], 0);
                    }
                    if (maxScroll > 0) {
                        const sbH = maxVisible;
                        const sbThumbH = Math.max(1, Math.floor(sbH * (maxVisible / allLines.length)));
                        const sbThumbY = Math.floor((sbH - sbThumbH) * (scroll / maxScroll));
                        for (let i = 0; i < sbH; i++) {
                            const isThumb = i >= sbThumbY && i < sbThumbY + sbThumbH;
                            writeUI(COLS - 2, currentY + i, isThumb ? '█' : '│', 1);
                        }
                    }
                }
            }
        } else if (rootNode.type === 'page') {
            const isPageFocused = uiState.focusDepth === 1;
            writeUI(colW + 2, 10, `${isPageFocused ? '[>]' : '::'} ${rootNode.name} ${isPageFocused ? '' : '::'}`, isPageFocused ? 2 : 0);
            writeUI(colW + 2, 11, '─'.repeat(previewW - 4), 1);
            if (rootNode.content) {
                const allLines: string[] = [];
                rootNode.content.forEach((rawLine: string) => {
                    const wrapped = wrapText(rawLine, previewW - 8);
                    allLines.push(...wrapped);
                });
                const maxVisible = 13;
                const maxScroll = Math.max(0, allLines.length - maxVisible);
                const scroll = Math.floor(Math.min(uiState.scrollOffset, maxScroll));
                for (let i = 0; i < maxVisible && i + scroll < allLines.length; i++) {
                    writeUI(colW + 2, 12 + i, allLines[i + scroll], 0);
                }
                if (maxScroll > 0) {
                    const sbH = maxVisible;
                    const sbThumbH = Math.max(1, Math.floor(sbH * (maxVisible / allLines.length)));
                    const sbThumbY = Math.floor((sbH - sbThumbH) * (scroll / maxScroll));
                    for (let i = 0; i < sbH; i++) {
                        const isThumb = i >= sbThumbY && i < sbThumbY + sbThumbH;
                        writeUI(COLS - 2, 12 + i, isThumb ? '█' : '│', 1);
                    }
                }

            }
        }
    }

    drawBoxUI(0, 26, COLS, 4, 'TERMINAL')
    const prefix = '$ '
    const typedText = textRef.current
    writeUI(2, 28, prefix + typedText, 0)
    
    if (cursorVisible.current) {
        writeUI(2 + prefix.length + cursorRef.current, 28, '█', 0)
    }

    if (uiState.settingsOpen) {
       const w = 60; const h = 19;
       const boxX = Math.floor((COLS - w) / 2);
       const boxY = Math.floor((30 - h) / 2);
       
       for(let i=0; i<h; i++) {
           writeUI(boxX, boxY+i, ' '.repeat(w), 0); 
       }
       drawBoxUI(boxX, boxY, w, h, 'SETTINGS');
       
       writeUI(boxX + 4, boxY + 2, 'THEME:', 0);
       THEMES.forEach((t, i) => {
          const isMouseHover = hy === boxY + 3 + i && hx >= boxX + 6 && hx <= boxX + 26;
          const isHighlighted = uiState.settingsCursorIdx === i || isMouseHover;
          writeUI(boxX + 6, boxY + 3 + i, `[${uiState.themeIdx === i ? '*' : ' '}] ${t.name}`, isHighlighted ? 2 : 0);
       });

       writeUI(boxX + 4, boxY + 11, 'FONT:', 0);
       FONTS.forEach((f, i) => {
          const isMouseHover = hy === boxY + 12 + i && hx >= boxX + 6 && hx <= boxX + 26;
          const isHighlighted = uiState.settingsCursorIdx === 6 + i || isMouseHover;
          writeUI(boxX + 6, boxY + 12 + i, `[${uiState.fontIdx === i ? '*' : ' '}] ${f.name}`, isHighlighted ? 2 : 0);
       });

       const col2HdrX = boxX + 31;
       const col2ItmX = boxX + 33;

       writeUI(col2HdrX, boxY + 2, 'EFFECTS:', 0);
       const SLIDER_CFG = getSliders(effects, setEffects);
       SLIDER_CFG.forEach((s, i) => {
         const fraction = (s.val - s.min) / (s.max - s.min);
         const trackInside = 8;
         const pos = Math.round(fraction * trackInside);
         let trackStr = '[';
         for(let k=0; k<trackInside; k++) {
             if (k < pos) trackStr += '=';
             else trackStr += '-';
         }
         trackStr += ']';
         const pct = Math.round(fraction * 100);
         const valStr = (pct.toString() + '%').padStart(4, ' ');
         const label = s.label.padEnd(8, ' ');
         const isMouseHover = hy === boxY + 3 + i && hx >= col2ItmX && hx <= col2ItmX + 24;
         const isHighlighted = uiState.settingsCursorIdx === 9 + i || isMouseHover;
         writeUI(col2ItmX, boxY + 3 + i, `${label}${trackStr} ${valStr}`, isHighlighted ? 2 : 0);
       });
       
       writeUI(col2HdrX, boxY + 11, 'DISPLAY:', 0);
       const ratios = ['4:3', '5:4', 'FIT SCREEN'];
       ratios.forEach((r, i) => {
           const isSel = uiState.aspectRatio === (r === 'FIT SCREEN' ? 'FLUID' : r);
           const str = `[${isSel ? '*' : ' '}] ${r}`;
           const isMouseHover = hy === boxY + 12 + i && hx >= col2ItmX && hx < col2ItmX + str.length;
           const isHighlighted = uiState.settingsCursorIdx === 15 + i || isMouseHover;
           writeUI(col2ItmX, boxY + 12 + i, str, isHighlighted ? 2 : 0);
       });

       const isCloseHover = hy === boxY + h - 3 && hx >= boxX + 25 && hx <= boxX + 33;
       const isCloseHighlighted = uiState.settingsCursorIdx === 18 || isCloseHover;
       writeUI(boxX + 25, boxY + h - 3, '[ CLOSE ]', isCloseHighlighted ? 2 : 0);
    }

    // Render grid to canvas
    buffer.renderToCanvas(ctx, charW, charH, activeFont, activeTheme);

    // Draw ASCII Logo natively to prevent grid fragmentation
    if (uiState.isBooted) {
        ctx.save();
        ctx.textBaseline = 'top';
        ctx.fillStyle = activeTheme.fg;
        
        const asciiArt = [
            "  _  _   ___      _____ _   _    ",
            " | \\| | /_\\ \\    / / __/_\\ | |   ",
            " | .` |/ _ \\ \\/\\/ /| _/ _ \\| |__ ",
            " |_|\\_/_/ \\_\\_/\\_/ |_/_/ \\_\\____|"
        ];
        
        const offsetY = Math.max(0, Math.floor((gridSizeRef.current.rows - 30) / 2));
        
        // To precisely match the screen recording's compact scale, we shrink the logo's height
        // to exactly 3 grid rows instead of 4, leaving the 4th row for the subtitle.
        const lineSpacing = charH * 0.75;
        const fontSize = Math.floor(lineSpacing * 0.95);
        
        ctx.font = `${fontSize}px ${activeFont.css}`;
        
        const logoX = 2 * charW;
        const logoY = (offsetY + 2) * charH;
        
        const texAspect = 2048 / 1024;
        const displayAspect = viewport.width / viewport.height;
        const stretchX = texAspect / displayAspect;
        
        // Measure the native width of the font's characters.
        // We force it to scale so the character aspect ratio perfectly matches the grid aspect ratio (0.6).
        // This ensures the ASCII art is continuously connected and never stretched, regardless of the font chosen!
        const charMetrics = ctx.measureText("A");
        const safeWidth = Math.max(1, charMetrics.width);
        const targetWidth = fontSize * 0.6;
        const fontStretch = targetWidth / safeWidth;
        
        ctx.translate(logoX, logoY);
        ctx.scale(stretchX * fontStretch, 1);
        
        asciiArt.forEach((line, idx) => {
            ctx.fillText(line, 0, idx * lineSpacing);
        });
        
        ctx.fillStyle = activeTheme.dim;
        ctx.font = `${Math.floor(charH * 0.65)}px ${activeFont.css}`;
        // Position subtitle lower
        ctx.fillText("            [ CREATIVE / ENGINEER ]", 0, 3.8 * charH);
        
        ctx.restore();
    }

    textureRef.current.needsUpdate = true
  }

  useEffect(() => {
    setRedrawFn.current = drawCanvas
    drawCanvas()
  }, [uiState, effects])

  useEffect(() => {
    const interval = setInterval(() => {
      cursorVisible.current = !cursorVisible.current
      drawCanvas()
    }, 500)
    
    document.fonts.ready.then(() => drawCanvas())
    return () => clearInterval(interval)
  }, [uiState, effects])

  useFrame((state) => {
    if (!uiState.isBooted) {
        const now = Date.now();
        if (now - snakeState.current.lastMove > 80) {
            snakeState.current.lastMove = now;
            
            const cols = gridSizeRef.current.cols;
            const rows = gridSizeRef.current.rows;
            if (cols > 0 && rows > 0) {
                const s = snakeState.current;
                const head = s.body[0];
                
                // Smart AI to seek food
                const dx = s.food.x - head.x;
                const dy = s.food.y - head.y;
                
                let possibleDirs = [
                    {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
                ];
                
                // Filter out 180 degree turns and self-collisions
                possibleDirs = possibleDirs.filter(d => {
                    if (d.x === -s.dir.x && d.y === -s.dir.y) return false;
                    const checkX = (head.x + d.x + cols) % cols;
                    const checkY = (head.y + d.y + rows) % rows;
                    return !s.body.some((b: any, i: number) => i !== 0 && b.x === checkX && b.y === checkY);
                });
                
                if (possibleDirs.length > 0) {
                    // Sort by distance to food
                    possibleDirs.sort((a, b) => {
                        const distA = Math.abs(head.x + a.x - s.food.x) + Math.abs(head.y + a.y - s.food.y);
                        const distB = Math.abs(head.x + b.x - s.food.x) + Math.abs(head.y + b.y - s.food.y);
                        return distA - distB;
                    });
                    
                    // 90% chance to pick best path, 10% chance to pick random safe path for erratic movement
                    if (Math.random() > 0.1) {
                        s.dir = possibleDirs[0];
                    } else {
                        s.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                    }
                }
                
                // Execute move with wrap-around
                let nx = (head.x + s.dir.x + cols) % cols;
                let ny = (head.y + s.dir.y + rows) % rows;
                
                s.body.unshift({
                    x: nx, 
                    y: ny,
                    color: SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]
                });
                
                if (nx === s.food.x && ny === s.food.y) {
                    s.food = {
                        x: Math.floor(Math.random() * (cols - 2)) + 1,
                        y: Math.floor(Math.random() * (rows - 2)) + 1
                    };
                } else {
                    s.body.pop();
                }
            }
        }
        if (setRedrawFn.current) setRedrawFn.current();
    }
    if (shaderPassRef.current) {
      shaderPassRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
    if (bloomRef.current) {
      bloomRef.current.strength = effects.bloomAmt
      bloomRef.current.radius = effects.bloomRadius
      bloomRef.current.threshold = effects.bloomThresh
    }
    if (afterimageRef.current) {
      afterimageRef.current.uniforms.damp.value = effects.burnIn
    }
    if (shaderPassRef.current) {
      shaderPassRef.current.uniforms.u_brightness.value = effects.brightness
      shaderPassRef.current.uniforms.u_saturation.value = effects.saturation
      shaderPassRef.current.uniforms.u_curvature.value = effects.curvature
      shaderPassRef.current.uniforms.u_downsample.value = effects.downsample
      shaderPassRef.current.uniforms.u_grain.value = effects.grain
    }
  })

  return (
    <>
      <mesh>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial map={textureRef.current} />
      </mesh>

      <MouseCursor color={activeTheme.fg} />

      <Effects disableGamma>
        {/* @ts-ignore */}
        <afterimagePass ref={afterimageRef} args={[0.85]} />
        {/* @ts-ignore */}
        <unrealBloomPass ref={bloomRef} args={[undefined, effects.bloomAmt, effects.bloomRadius, effects.bloomThresh]} />
        {/* @ts-ignore */}
        <shaderPass ref={shaderPassRef} args={[CRTShader]} />
      </Effects>
    </>
  )
}
