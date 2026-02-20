import { runIngestPipeline } from "../src/modules/documents/pipeline/ingest";

type CliOptions = {
  input?: string;
  output?: string;
  upload?: boolean;
  uploadOriginal?: boolean;
  maxFiles?: number;
  concurrency?: number;
  quiet?: boolean;
};

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === "true";
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--input") {
      options.input = next;
      i += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = next;
      i += 1;
      continue;
    }

    if (arg === "--upload") {
      options.upload = toBoolean(next, false);
      i += 1;
      continue;
    }

    if (arg === "--upload-original") {
      options.uploadOriginal = toBoolean(next, false);
      i += 1;
      continue;
    }

    if (arg === "--max-files") {
      options.maxFiles = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--concurrency") {
      options.concurrency = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--quiet") {
      options.quiet = true;
      continue;
    }
  }

  return options;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  await runIngestPipeline({
    input: args.input,
    output: args.output,
    upload: args.upload ?? false,
    uploadOriginal: args.uploadOriginal ?? false,
    maxFiles: args.maxFiles,
    concurrency: args.concurrency ?? 2,
    quiet: args.quiet ?? false,
  });
}

void main();
