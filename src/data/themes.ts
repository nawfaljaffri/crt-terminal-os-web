import { VT323, Press_Start_2P, Share_Tech_Mono } from 'next/font/google'

const fontVt323 = VT323({ weight: '400', subsets: ['latin'] })
const fontPressStart = Press_Start_2P({ weight: '400', subsets: ['latin'] })
const fontShareTech = Share_Tech_Mono({ weight: '400', subsets: ['latin'] })

export const FONTS = [
  { name: 'C64 / APPLE II', css: fontPressStart.style.fontFamily, yOffset: 8, size: 18 },
  { name: 'MODERN TECH', css: fontShareTech.style.fontFamily, yOffset: 0, size: 32 },
  { name: 'VT323', css: fontVt323.style.fontFamily, yOffset: -2, size: 36 }
]

export const THEMES = [
  { name: 'WHITE',  fg: '#FFFFFF', bg: '#000000', dim: '#666666', bloom: 0.46, radius: 1.80, thresh: 0.30, burnIn: 0.80, bright: 1.115, satur: 1.24, crush: 0.30, grain: 0.15, curve: 0.20 },
  { name: 'BLUE',   fg: '#88BBFF', bg: '#0A152A', dim: '#446699', bloom: 0.90, radius: 0.90, thresh: 0.30, burnIn: 0.89, bright: 0.80, satur: 0.70, crush: 0.65, grain: 0.08, curve: 0.20 },
  { name: 'GREEN',  fg: '#A8F386', bg: '#182912', dim: '#4A6B32', bloom: 0.70, radius: 0.45, thresh: 0.00, burnIn: 0.50, bright: 0.80, satur: 0.45, crush: 0.80, grain: 0.15, curve: 0.20 },
  { name: 'PINK',   fg: '#FF66FF', bg: '#220022', dim: '#883388', bloom: 0.90, radius: 1.00, thresh: 0.35, burnIn: 0.75, bright: 1.595, satur: 0.30, crush: 0.75, grain: 0.10, curve: 0.20 },
  { name: 'AMBER',  fg: '#F29C27', bg: '#211408', dim: '#855615', bloom: 1.25, radius: 0.50, thresh: 0.20, burnIn: 0.85, bright: 0.69, satur: 0.75, crush: 0.63, grain: 0.13, curve: 0.20 },
  { name: 'PURPLE', fg: '#E080FF', bg: '#1A0A2A', dim: '#663388', bloom: 0.76, radius: 1.00, thresh: 0.30, burnIn: 0.80, bright: 1.30, satur: 0.66, crush: 0.70, grain: 0.10, curve: 0.20 }
]

export const SNAKE_COLORS = [
  '#FF1A1A', '#FF6600', '#FFFF00', '#1AFF1A', '#00FFFF', 
  '#3333FF', '#FF00FF'
];

export const getSliders = (effects: any, setEffects: any) => [
  { label: 'SATUR',  val: effects.saturation,  min: 0.0, max: 2.0, set: (v: number) => setEffects((e: any) => ({...e, saturation: v})) },
  { label: 'THRESH', val: effects.bloomThresh, min: 0.0, max: 1.0, set: (v: number) => setEffects((e: any) => ({...e, bloomThresh: v})) },
  { label: 'BLOOM',  val: effects.bloomAmt,    min: 0.0, max: 2.0, set: (v: number) => setEffects((e: any) => ({...e, bloomAmt: v})) },
  { label: 'SPREAD', val: effects.bloomRadius, min: 0.0, max: 2.0, set: (v: number) => setEffects((e: any) => ({...e, bloomRadius: v})) },
  { label: 'BRIGHT', val: effects.brightness,  min: 0.5, max: 2.0, set: (v: number) => setEffects((e: any) => ({...e, brightness: v})) },
  { label: 'CRUSH',  val: effects.downsample,  min: 0.0, max: 1.0, set: (v: number) => setEffects((e: any) => ({...e, downsample: v})) }
];
