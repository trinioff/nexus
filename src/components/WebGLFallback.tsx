/** Static stand-in shown when the browser cannot create a WebGL context. */
export function WebGLFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--color-nexus-haze)_0%,_var(--color-nexus-void)_70%)]">
      <p className="max-w-sm px-6 text-center text-sm tracking-wide text-nexus-ice/80">
        NEXUS needs WebGL to render its environment. Enable hardware acceleration or open
        it in a browser that supports WebGL.
      </p>
    </div>
  );
}
