const helpText = `
Help text:
Cleans up your notes directory by
a. Deleting empty files
b. Removing the ".sync-conflict..." part of the filename if it was caused by the existence of an empty file (not yet implemented)

Run this script from the terminal with: \`clean-notes\`.
--delete (-d) should be passed to delete files
`;

import * as flags from 'https://deno.land/std/flags/mod.ts';

// If I want to replace Deno down the road, I should just be able to rewrite this class
class TechnicalCode {
  static parseArgs() {
    const parsedArgs = flags.parse(Deno.args);

    return {
      shouldDelete: parsedArgs.d || parsedArgs.delete,
      help: parsedArgs.h || parsedArgs.help,
    };
  }

  static getHomeDir() {
    return Deno.env.get('HOME');
  }

  static removeFile(path: string) {
    return Deno.remove(`${TechnicalCode.getHomeDir()}/${path}`).catch(() =>
      console.error(`Failed to remove ${path}`)
    );
  }

  static readFile(fileName: string) {
    return Deno.readTextFile(`${TechnicalCode.getHomeDir()}/${fileName}`);
  }

  static findEmptyFiles(directoryName: string) {
    return Deno.readDir(`${TechnicalCode.getHomeDir()}/${directoryName}`);
  }
}

const isInvalidFileOrDirectory = (name: string, isFile: boolean) =>
  name.startsWith('.') || (isFile && !name.endsWith('.md'));

const getFileTextLength = (path: string) =>
  TechnicalCode.readFile(path).then((contents) => contents.length);

async function removeEmptyFiles(
  directoryName: string,
  {
    name,
    isFile,
    isDirectory,
  }: {
    name: string;
    isFile: boolean;
    isDirectory: boolean;
  }
): Promise<any> {
  const { shouldDelete } = TechnicalCode.parseArgs();

  if (isInvalidFileOrDirectory(name, isFile)) return;

  const path = `${directoryName}/${name}`;
  if (isDirectory) {
    const promises = [];
    for await (const fileOrFolder of TechnicalCode.findEmptyFiles(path)) {
      promises.push(removeEmptyFiles(path, fileOrFolder));
    }
    return promises;
  }

  const fileTextLength = await getFileTextLength(path);
  if (fileTextLength > 0) return;

  const verb = shouldDelete ? 'Deleting' : 'Can delete';
  console.log(`${verb} ${path}`);

  if (shouldDelete) TechnicalCode.removeFile(path);
}

async function renameNonConflictingConflictFiles(
  directoryName: string,
  {
    name,
    isFile,
    isDirectory,
  }: {
    name: string;
    isFile: boolean;
    isDirectory: boolean;
  }
): Promise<any> {
  const { shouldDelete } = TechnicalCode.parseArgs();

  if (isInvalidFileOrDirectory(name, isFile)) return;

  const path = `${directoryName}/${name}`;
  if (isDirectory) {
    const promises = [];
    for await (const fileOrFolder of TechnicalCode.findEmptyFiles(path)) {
      promises.push(renameNonConflictingConflictFiles(path, fileOrFolder));
    }
    return promises;
  }

  const conflictIndex = name.indexOf('.sync-conflict-');
  if (conflictIndex === -1) return;

  const nonConflictingFilename = name.slice(0, conflictIndex);
  let canRename;
  const nonConflictingPath = `${directoryName}/${nonConflictingFilename}.md`;
  try {
    const fileTextLength = await getFileTextLength(nonConflictingPath);
    canRename = fileTextLength === 0;
  } catch {
    // If it failed to read file, it means the file doesn't exist, so it can be overwritten
    canRename = true;
  }

  if (!canRename) {
    console.log(`\n--> You need to manually resolve ${nonConflictingPath}\n`);
    return;
  }

  const verb = 'Can rename';
  // const verb = shouldDelete ? 'Renaming' : 'Can rename';
  console.log(`${verb} ${path}`);

  // if (shouldDelete) TODO: rename the file and uncomment above
}

(async function main() {
  const { help, shouldDelete } = TechnicalCode.parseArgs();
  if (help) return console.log(helpText);

  const directoryName = 'Notes';

  const removePromises = [];
  for await (const fileOrFolder of TechnicalCode.findEmptyFiles(directoryName)) {
    removePromises.push(removeEmptyFiles(directoryName, fileOrFolder));
  }
  await Promise.all(removePromises.flat());

  const renamePromises = [];
  for await (const fileOrFolder of TechnicalCode.findEmptyFiles(directoryName)) {
    renamePromises.push(renameNonConflictingConflictFiles(directoryName, fileOrFolder));
  }
  await Promise.all(renamePromises.flat());

  if (!shouldDelete)
    console.log('\nRerun this script with the -d flag to proceed to deleting/renaming');
})();
