type ConsoleEntry = {
  level: 'log' | 'warn' | 'error' | 'info';
  args: any[];
  time: number;
};

const CONSOLE_BUFFER_SIZE = 25;
const consoleBuffer: ConsoleEntry[] = [];

export function captureConsole(level: ConsoleEntry['level']) {
  const original = console[level];

  console[level] = (...args: any[]) => {
    consoleBuffer.push({
      level,
      args,
      time: performance.now(),
    });

    if (consoleBuffer.length > CONSOLE_BUFFER_SIZE) {
      consoleBuffer.shift();
    }

    original.apply(console, args);
  };
}

// ['log', 'warn', 'error'].forEach(captureConsole);

export function serializeConsoleBuffer() {
  return consoleBuffer.map(entry => ({
    level: entry.level,
    time: Math.round(entry.time),
    message: entry.args.map(a => {
      if (a instanceof Error) {
        return {
          error: a.message,
          stack: a.stack,
        };
      }
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a, null, 2).slice(0, 500);
        } catch {
          return '[unserializable object]';
        }
      }
      return String(a);
    }),
  }));
}

export function getBuildData() {
  return {
    app: import.meta.env.VITE_APP_NAME,
    buildId: import.meta.env.VITE_BUILD_ID,
    gitSha: import.meta.env.VITE_GIT_SHA,
    buildDate: import.meta.env.VITE_BUILD_DATE,
    env: import.meta.env.VITE_BUILD_ENV,
  };
}

export function getWebGLData(renderer?: any) {
  try {
    const gl = renderer?.getContext?.() ?? document.createElement('canvas').getContext('webgl');

    if (!gl) return {};

    const data: any = {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    };

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      data.unmaskedVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
      data.unmaskedRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
    }

    return data;
  } catch {
    return {};
  }
}

export function getRendererStats(renderer?: any) {
  if (!renderer?.info) return {};

  return {
    render: renderer.info.render
      ? {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        }
      : {},
    memory: renderer.info.memory
      ? {
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
        }
      : {},
  };
}
