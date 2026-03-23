import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import dockerEngine from '../engine/DockerEngine';

const Terminal = ({ onCommandExecuted } = {}) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const inputBuffer = useRef('');
  const onCommandExecutedRef = useRef(onCommandExecuted);

  // Keep callback current even though the xterm handler is registered once.
  useEffect(() => {
    onCommandExecutedRef.current = onCommandExecuted;
  }, [onCommandExecuted]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#f7768e',
        selection: '#33467c',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 14,
      // Ensure a known baseline even if measurements aren't ready yet.
      cols: 80,
      rows: 24,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Open must happen before FitAddon. In dev/StrictMode we also guard
    // against late async resize calls after dispose.
    let disposed = false;
    term.open(terminalRef.current);
    xtermRef.current = term;

    // Fit once the browser has had a chance to lay out the container.
    const rafId = requestAnimationFrame(() => {
      if (disposed) return;
      try {
        fitAddon.fit();
      } catch {
        // Avoid hard-crashing the app if measurement fails briefly.
      }
    });

    term.writeln('\x1b[1;34mDocker Learning Platform\x1b[0m');
    term.writeln('Type \x1b[1;32mdocker run [image]\x1b[0m to start a container.');
    term.write('\r\n$ ');

    term.onData((data) => {
      const code = data.charCodeAt(0);
      if (code === 13) { // Enter
        term.write('\r\n');
        const command = inputBuffer.current;
        const output = dockerEngine.execute(command);
        const completionMessage = onCommandExecutedRef.current?.(command, output) || '';
        term.writeln(output || '');
        if (completionMessage) {
          term.writeln(`\x1b[1;32m${completionMessage}\x1b[0m`);
        }
        term.write('$ ');
        inputBuffer.current = '';
      } else if (code === 127) { // Backspace
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        inputBuffer.current += data;
        term.write(data);
      }
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      try {
        fitAddon.dispose?.();
      } catch {
        // ignore
      }
      term.dispose();
    };
  }, []);

  return (
    <div className="terminal-container">
      <div ref={terminalRef} style={{ height: '400px', width: '100%' }} />
    </div>
  );
};

export default Terminal;
