import { readFlags, setFlag, resetFlags } from './debugFlags';

export type CommandContext = {
  out: (text: string) => void;
  env: 'development' | 'production' | 'test';
  api: {
    openApp: (id: string, opts?: { maximize?: boolean }) => void;
  };
};

export type CommandHandler = (args: string[], ctx: CommandContext) => void | Promise<void>;

export const commands: Record<string, CommandHandler> = {
  help: (_args, ctx) => {
    ctx.out('Commands: help, flags, toggle-scanlines, toggle-cursor, toggle-overlay, reset-flags, cd <app>');
  },
  flags: (_args, ctx) => {
    const f = readFlags();
    ctx.out(`scanlines=${f.showScanlines} cursor=${f.showCursor} overlay=${f.showOverlay}`);
  },
  'toggle-scanlines': (_args, ctx) => {
    const f = readFlags();
    setFlag('showScanlines', !f.showScanlines);
    ctx.out(`scanlines=${!f.showScanlines}`);
  },
  'toggle-cursor': (_args, ctx) => {
    const f = readFlags();
    setFlag('showCursor', !f.showCursor);
    ctx.out(`cursor=${!f.showCursor}`);
  },
  'toggle-overlay': (_args, ctx) => {
    const f = readFlags();
    setFlag('showOverlay', !f.showOverlay);
    ctx.out(`overlay=${!f.showOverlay}`);
  },
  'reset-flags': (_args, ctx) => {
    resetFlags();
    ctx.out('flags reset');
  },
  cd: (args, ctx) => {
    const target = (args[0] || '').toLowerCase();
    if (!target) { ctx.out('usage: cd <home|notes|terminal|dimension|connect|about|browser>'); return; }
    switch (target) {
      case 'home': ctx.api.openApp('home', { maximize: true }); break;
      case 'notes': ctx.api.openApp('notes', { maximize: true }); break;
      case 'terminal': ctx.api.openApp('terminal', { maximize: true }); break;
      case 'about': ctx.api.openApp('about', { maximize: true }); break;
      case 'browser': ctx.api.openApp('browser', { maximize: true }); break;
      case 'dimension': ctx.api.openApp('dimension', { maximize: true }); break;
      case 'connect': ctx.api.openApp('connect', { maximize: true }); break;
      default: ctx.out(`unknown: ${target}`);
    }
  },
};

export function runCommand(input: string, ctx: CommandContext) {
  const parts = input.trim().split(/\s+/);
  const name = (parts.shift() || '').toLowerCase();
  const handler = commands[name];
  if (!name) return;
  if (!handler) { ctx.out(`Unknown: ${name}`); return; }
  handler(parts, ctx);
}


