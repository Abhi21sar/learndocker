import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useDockerStore } from '../store/useDockerStore';
import { highlightDockerCommand } from '../utils/Lexer';

const Terminal = ({ onCommandExecuted } = {}) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const inputBuffer = useRef('');
  const historyIndex = useRef(-1);
  const tempInput = useRef('');
  const suggestion = useRef('');
  const onCommandExecutedRef = useRef(onCommandExecuted);

  useEffect(() => {
    onCommandExecutedRef.current = onCommandExecuted;
  }, [onCommandExecuted]);

  const getSuggestion = (input) => {
    if (!input) return '';
    const store = useDockerStore.getState();
    const history = store.getHistory();
    
    const tokens = input.trim().split(/\s+/);
    const lastToken = tokens[tokens.length - 1];
    const isMidCommand = input.endsWith(' ');
    
    if (tokens[0] === 'docker') {
      const subcmd = tokens[1];
      
      if (['stop', 'rm', 'inspect', 'exec', 'logs'].includes(subcmd)) {
        const containerNames = store.containers.map(c => c.name);
        if (isMidCommand) return containerNames[0] || '';
        if (lastToken && lastToken !== subcmd) {
          const match = containerNames.find(n => n.startsWith(lastToken) && n !== lastToken);
          if (match) return match.slice(lastToken.length);
        }
      }
      
      if (subcmd === 'run') {
        const imageNames = store.images.map(i => i.name);
        if (isMidCommand) return imageNames[0] || '';
        if (lastToken && lastToken !== 'run') {
          const match = imageNames.find(n => n.startsWith(lastToken) && n !== lastToken);
          if (match) return match.slice(lastToken.length);
        }
      }

      if (!subcmd || (tokens.length === 1 && !isMidCommand)) {
        const subcmds = ['run', 'ps', 'images', 'stop', 'rm', 'network', 'volume', 'inspect', 'exec', 'logs', 'build', 'pull', 'push'];
        const match = subcmds.find(s => s.startsWith(lastToken || '') && s !== lastToken);
        if (match) return match.slice((lastToken || '').length);
      }
    }

    const historyMatch = history.find(h => h.startsWith(input) && h !== input);
    if (historyMatch) return historyMatch.slice(input.length);
    
    const common = ['docker run', 'docker build -t', 'docker images', 'docker ps', 'docker network', 'docker volume', 'docker compose up'];
    const cmdMatch = common.find(c => c.startsWith(input) && c !== input);
    if (cmdMatch) return cmdMatch.slice(input.length);
    
    return '';
  };

  const rewriteLine = () => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;
    term.write('\r\x1b[2K\x1b[32m$\x1b[0m ');
    
    const highlighted = highlightDockerCommand(inputBuffer.current);
    term.write(highlighted);

    suggestion.current = getSuggestion(inputBuffer.current);
    if (suggestion.current) {
      term.write(`\x1b[90m${suggestion.current}\x1b[0m`);
      for (let i = 0; i < suggestion.current.length; i++) term.write('\b');
    }
  };

  useEffect(() => {
    const term = new XTerm({
      cursorBlink: true,
      theme: {
        background: 'transparent',
        foreground: '#a9b1d6',
        cursor: '#f7768e',
        selection: '#33467c',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 14,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    xtermRef.current = term;

    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
    }

    term.writeln('\x1b[1;34mDocker Learning Platform\x1b[0m');
    term.writeln('Type \x1b[1;32mdocker run\x1b[0m or use \x1b[1;33mTab/Right Arrow\x1b[0m for suggestions.');
    term.write('\r\n\x1b[32m$\x1b[0m ');

    term.onData((data) => {
      if (data === '\r') {
        term.write('\r\n');
        const command = inputBuffer.current;
        const output = useDockerStore.getState().execute(command);
        const completionMessage = onCommandExecutedRef.current?.(command, output) || '';
        if (output) term.writeln(output);
        if (completionMessage) term.writeln(`\r\n\x1b[32m${completionMessage}\x1b[0m`);
        inputBuffer.current = '';
        historyIndex.current = -1;
        suggestion.current = '';
        term.write('\x1b[32m$\x1b[0m ');
      } else if (data === '\x7F') {
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          rewriteLine();
        }
      } else if (data === '\t' || data === '\x1b[C') {
        if (suggestion.current) {
          inputBuffer.current += suggestion.current;
          suggestion.current = '';
          rewriteLine();
        }
      } else if (data === '\x1b[A') {
        const history = useDockerStore.getState().getHistory();
        if (history.length === 0) return;
        if (historyIndex.current === -1) {
          tempInput.current = inputBuffer.current;
          historyIndex.current = history.length - 1;
        } else if (historyIndex.current > 0) {
          historyIndex.current -= 1;
        }
        inputBuffer.current = history[historyIndex.current];
        rewriteLine();
      } else if (data === '\x1b[B') {
        const history = useDockerStore.getState().getHistory();
        if (historyIndex.current === -1) return;
        if (historyIndex.current < history.length - 1) {
          historyIndex.current += 1;
          inputBuffer.current = history[historyIndex.current];
        } else {
          historyIndex.current = -1;
          inputBuffer.current = tempInput.current;
        }
        rewriteLine();
      } else if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7E) || data >= '\u00a0') {
        inputBuffer.current += data;
        rewriteLine();
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div className="terminal-wrapper glass">
      <div className="terminal-header">
        <div className="terminal-buttons">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <div className="terminal-title">docker-terminal — 80×24</div>
      </div>
      <div ref={terminalRef} className="terminal-body" />
    </div>
  );
};

export default Terminal;
