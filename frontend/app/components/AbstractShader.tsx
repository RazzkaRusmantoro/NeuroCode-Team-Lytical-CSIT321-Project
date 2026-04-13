"use client";
import React, { useRef, useEffect, memo } from "react";
const OPACITY = 0.035;
const ORANGE = "vec3(0.98, 0.45, 0.09)";
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float time;
uniform vec2 resolution;
out vec4 fragColor;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float scene(vec2 uv) {
  vec2 pos1 = vec2(cos(time) * 0.4, sin(time * 2.0) * 0.2);
  float c1 = sdCircle(uv - pos1, 0.2);

  vec2 pos2 = vec2(cos(time + 3.14) * 0.4, sin(time * 2.0 + 3.14) * 0.2);
  float c2 = sdCircle(uv - pos2, 0.16);

  return opSmoothUnion(c1, c2, 0.2);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
  float d = scene(uv);
  float glow = exp(-10.0 * abs(d));
  vec3 color = ${ORANGE};
  vec3 finalColor = color * glow + color * smoothstep(0.01, 0.0, d);
  fragColor = vec4(finalColor, 1.0);
}
`;
const VERTEX_SOURCE = `#version 300 es
precision highp float;
in vec4 position;
void main() {
  gl_Position = position;
}
`;
class ShaderRenderer {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private vs!: WebGLShader;
    private fs!: WebGLShader;
    private buf: WebGLBuffer | null = null;
    private uTime: WebGLUniformLocation | null = null;
    private uRes: WebGLUniformLocation | null = null;
    constructor(private canvas: HTMLCanvasElement, fragmentSource: string) {
        const gl = canvas.getContext("webgl2", { alpha: true });
        if (!gl)
            throw new Error("WebGL2 not supported");
        this.gl = gl;
        this.vs = this.compile(gl.VERTEX_SHADER, VERTEX_SOURCE);
        this.fs = this.compile(gl.FRAGMENT_SHADER, fragmentSource);
        this.program = gl.createProgram()!;
        gl.attachShader(this.program, this.vs);
        gl.attachShader(this.program, this.fs);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.program));
            return;
        }
        const verts = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
        this.buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(this.program, "position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        this.uTime = gl.getUniformLocation(this.program, "time");
        this.uRes = gl.getUniformLocation(this.program, "resolution");
    }
    private compile(type: number, src: string): WebGLShader {
        const gl = this.gl;
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            throw new Error("Shader compile failed");
        }
        return s;
    }
    resize(w: number, h: number) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    render(now: number) {
        const gl = this.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.uniform1f(this.uTime, now * 0.001);
        gl.uniform2f(this.uRes, gl.canvas.width, gl.canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    dispose() {
        const gl = this.gl;
        gl.deleteProgram(this.program);
        gl.deleteShader(this.vs);
        gl.deleteShader(this.fs);
        if (this.buf)
            gl.deleteBuffer(this.buf);
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext)
            ext.loseContext();
    }
}
const OPACITY_STYLE: React.CSSProperties = { opacity: OPACITY };
export const AbstractShader = memo(function AbstractShader({ className = "", }: {
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        canvas: HTMLCanvasElement;
        renderer: ShaderRenderer;
        ro: ResizeObserver;
        rafId: number;
    } | null>(null);
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        let cancelled = false;
        const init = () => {
            if (cancelled)
                return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) {
                requestAnimationFrame(init);
                return;
            }
            const canvas = document.createElement("canvas");
            canvas.style.display = "block";
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            container.appendChild(canvas);
            const renderer = new ShaderRenderer(canvas, FRAGMENT_SHADER);
            renderer.resize(w, h);
            const handleResize = () => {
                if (cancelled || !container)
                    return;
                const nw = container.clientWidth;
                const nh = container.clientHeight;
                if (nw > 0 && nh > 0)
                    renderer.resize(nw, nh);
            };
            const ro = new ResizeObserver(handleResize);
            ro.observe(container);
            let rafId: number;
            const animate = (time: number) => {
                if (cancelled)
                    return;
                rafId = requestAnimationFrame(animate);
                if (sceneRef.current)
                    sceneRef.current.rafId = rafId;
                renderer.render(time);
            };
            rafId = requestAnimationFrame(animate);
            sceneRef.current = { canvas, renderer, ro, rafId };
        };
        const rafInit = requestAnimationFrame(init);
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafInit);
            const ref = sceneRef.current;
            if (ref) {
                cancelAnimationFrame(ref.rafId);
                ref.ro.disconnect();
                ref.renderer.dispose();
                if (container.contains(ref.canvas))
                    container.removeChild(ref.canvas);
                sceneRef.current = null;
            }
        };
    }, []);
    return (<div ref={containerRef} className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`.trim()} style={OPACITY_STYLE}/>);
});
