"use client";
import React, { useEffect, useRef, memo } from "react";
import * as THREE from "three";
const ROTATION_X_DEG = 45;
const DOT_OPACITY = 0.12;
const ORANGE_RGB = { r: 249 / 255, g: 115 / 255, b: 22 / 255 };
type DottedSurfaceProps = Omit<React.ComponentProps<"div">, "ref">;
export const DottedSurface = memo(function DottedSurface({ className = "", ...props }: DottedSurfaceProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        geometry: THREE.BufferGeometry;
        material: THREE.PointsMaterial;
        ro: ResizeObserver;
        animationId: number;
        count: number;
    } | null>(null);
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        let animationId: number;
        let cancelled = false;
        const init = () => {
            if (cancelled)
                return;
            const w = container.clientWidth || 332;
            const h = container.clientHeight || 400;
            if (h === 0) {
                requestAnimationFrame(init);
                return;
            }
            const SEPARATION = 48;
            const AMOUNTX = 24;
            const AMOUNTY = 36;
            const scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x000000, 1500, 6000);
            const camera = new THREE.PerspectiveCamera(60, w / h, 1, 10000);
            camera.position.set(0, 200, 800);
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(w, h);
            renderer.setClearColor(0x000000, 0);
            renderer.domElement.style.display = "block";
            container.appendChild(renderer.domElement);
            const positions: number[] = [];
            const colors: number[] = [];
            for (let ix = 0; ix < AMOUNTX; ix++) {
                for (let iy = 0; iy < AMOUNTY; iy++) {
                    const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
                    const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
                    positions.push(x, 0, z);
                    colors.push(ORANGE_RGB.r, ORANGE_RGB.g, ORANGE_RGB.b);
                }
            }
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
            const material = new THREE.PointsMaterial({
                size: 9,
                vertexColors: true,
                transparent: true,
                opacity: DOT_OPACITY,
                sizeAttenuation: true,
            });
            const points = new THREE.Points(geometry, material);
            points.rotation.x = (ROTATION_X_DEG * Math.PI) / 180;
            scene.add(points);
            let count = 0;
            const animate = () => {
                if (cancelled)
                    return;
                animationId = requestAnimationFrame(animate);
                if (sceneRef.current)
                    sceneRef.current.animationId = animationId;
                const posAttr = geometry.attributes.position;
                const arr = posAttr.array as Float32Array;
                let i = 0;
                for (let ix = 0; ix < AMOUNTX; ix++) {
                    for (let iy = 0; iy < AMOUNTY; iy++) {
                        arr[i * 3 + 1] =
                            Math.sin((ix + count) * 0.15) * 80 + Math.sin((iy + count) * 0.25) * 80;
                        i++;
                    }
                }
                posAttr.needsUpdate = true;
                renderer.render(scene, camera);
                count += 0.04;
            };
            const handleResize = () => {
                if (cancelled || !container)
                    return;
                const nw = container.clientWidth;
                const nh = container.clientHeight;
                if (nw === 0 || nh === 0)
                    return;
                camera.aspect = nw / nh;
                camera.updateProjectionMatrix();
                renderer.setSize(nw, nh);
            };
            const ro = new ResizeObserver(handleResize);
            ro.observe(container);
            sceneRef.current = { scene, camera, renderer, geometry, material, ro, animationId: 0, count: 0 };
            animate();
        };
        const rafId = requestAnimationFrame(init);
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            const ref = sceneRef.current;
            if (ref) {
                cancelAnimationFrame(ref.animationId);
                ref.ro.disconnect();
                ref.geometry.dispose();
                ref.material.dispose();
                ref.renderer.dispose();
                if (container.contains(ref.renderer.domElement)) {
                    container.removeChild(ref.renderer.domElement);
                }
                sceneRef.current = null;
            }
        };
    }, []);
    return (<div ref={containerRef} className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`.trim()} {...props}/>);
});
