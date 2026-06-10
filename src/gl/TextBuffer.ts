export class TextBuffer {
  cols: number;
  rows: number;
  buffer: string[][];
  colorBuffer: any[][];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.buffer = Array.from({ length: rows }, () => Array(cols).fill(' '));
    this.colorBuffer = Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  writeStr(x: number, y: number, str: string, color: any = 0) {
    x = Math.floor(x); y = Math.floor(y);
    if (y < 0 || y >= this.rows) return;
    for (let i = 0; i < str.length; i++) {
      if (x + i < 0 || x + i >= this.cols) continue;
      this.buffer[y][x + i] = str[i];
      this.colorBuffer[y][x + i] = color;
    }
  }

  drawBox(x: number, y: number, w: number, h: number, title = '') {
    x = Math.floor(x); y = Math.floor(y); w = Math.floor(w); h = Math.floor(h);
    if (w <= 0 || h <= 0) return;
    this.writeStr(x, y, '┌' + '─'.repeat(Math.max(0, w - 2)) + '┐', 1);
    if (title) this.writeStr(x + 2, y, `┤${title}├`, 0);
    this.writeStr(x, y + h - 1, '└' + '─'.repeat(Math.max(0, w - 2)) + '┘', 1);
    for (let i = 1; i < h - 1; i++) {
      this.writeStr(x, y + i, '│', 1);
      this.writeStr(x + w - 1, y + i, '│', 1);
    }
  }

  renderToCanvas(ctx: CanvasRenderingContext2D, charW: number, charH: number, activeFont: any, activeTheme: any) {
    const colorFg = activeTheme.fg;
    const colorDim = activeTheme.dim;
    const colorInvertedBg = activeTheme.fg;
    const colorInvertedFg = activeTheme.bg;

    ctx.fillStyle = activeTheme.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let y = 0; y < this.rows; y++) {
      let currentString = '';
      let currentColor = -1;
      let startX = 0;

      const renderSegment = () => {
        if (currentString.length > 0) {
          if (currentColor === 2) { 
              ctx.shadowBlur = 0;
              ctx.fillStyle = colorInvertedBg;
              ctx.fillRect(startX * charW, y * charH - 2, currentString.length * charW, charH + 4);
              ctx.fillStyle = colorInvertedFg;
          } else if (currentColor === 1) { 
              ctx.fillStyle = colorDim;
          } else if (typeof currentColor === 'string') {
              ctx.fillStyle = currentColor;
          } else { 
              ctx.fillStyle = colorFg;
          }
          ctx.shadowBlur = 0;
          ctx.fillText(currentString, startX * charW, y * charH + activeFont.yOffset);
        }
      }

      for (let x = 0; x < this.cols; x++) {
        const char = this.buffer[y][x];
        const col = this.colorBuffer[y][x];

        if (col !== currentColor) {
          renderSegment();
          currentString = char;
          currentColor = col;
          startX = x;
        } else {
          currentString += char;
        }
      }
      renderSegment();
    }
  }
}
