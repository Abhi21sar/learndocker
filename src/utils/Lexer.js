export function highlightDockerCommand(commandStr) {
  const tokens = commandStr.match(/(\s+|\S+)/g) || [];
  let isDocker = false;
  let hasSubcommand = false;

  return tokens.map(token => {
    if (token.trim() === '') return token;

    if (!isDocker && token === 'docker') {
      isDocker = true;
      return `\x1b[1;34m${token}\x1b[0m`; // Blue bold
    }

    if (isDocker && !hasSubcommand && ['run', 'ps', 'images', 'stop', 'rm', 'build', 'push', 'network', 'volume', 'compose'].includes(token)) {
      hasSubcommand = true;
      return `\x1b[1;32m${token}\x1b[0m`; // Green bold
    }

    if (token.startsWith('-')) {
      return `\x1b[36m${token}\x1b[0m`; // Cyan for flags
    }

    // Important context/nouns like image names (guess: follows a flag or verb)
    // For MVP, just return white text
    return token;
  }).join('');
}
