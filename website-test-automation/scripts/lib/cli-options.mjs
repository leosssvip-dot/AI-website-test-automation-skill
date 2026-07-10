function invalid(defaultFormat) {
  return { ok: false, help: false, inputs: [], format: defaultFormat, outPath: null };
}

export function parseCaseCliArguments(args, { formats, defaultFormat, allowOut = false }) {
  const inputs = [];
  let format = defaultFormat;
  let outPath = null;
  let help = false;
  let optionsEnded = false;
  let seenFormat = false;
  let seenOut = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (optionsEnded) {
      inputs.push(arg);
      continue;
    }
    if (arg === '--') {
      optionsEnded = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--format' || arg.startsWith('--format=')) {
      if (seenFormat) return invalid(defaultFormat);
      seenFormat = true;
      const value = arg === '--format' ? args[index + 1] : arg.slice('--format='.length);
      if (arg === '--format') index += 1;
      if (!value || value === '--' || value.startsWith('-') || !formats.includes(value)) {
        return invalid(defaultFormat);
      }
      format = value;
      continue;
    }
    if (allowOut && (arg === '--out' || arg.startsWith('--out='))) {
      if (seenOut) return invalid(defaultFormat);
      seenOut = true;
      const value = arg === '--out' ? args[index + 1] : arg.slice('--out='.length);
      if (arg === '--out') index += 1;
      if (!value || value === '--' || (arg === '--out' && value.startsWith('-'))) {
        return invalid(defaultFormat);
      }
      outPath = value;
      continue;
    }
    if (arg.startsWith('-')) return invalid(defaultFormat);
    inputs.push(arg);
  }

  return { ok: true, help, inputs, format, outPath };
}
