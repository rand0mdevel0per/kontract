import ts from 'typescript';

export interface RegistryResult {
  dts: string;
  keys: string[];
}

export function generateStorageRegistry(source: string): RegistryResult {
  const fileName = 'virtual.ts';
  const compilerHost = ts.createCompilerHost({}, true);
  compilerHost.getSourceFile = (name) => {
    if (name === fileName) {
      return ts.createSourceFile(name, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
    }
    return undefined;
  };
  const program = ts.createProgram([fileName], { target: ts.ScriptTarget.ES2020 }, compilerHost);
  const sf = program.getSourceFile(fileName)!;
  const interfaces: Record<string, string> = {};

  sf.forEachChild(node => {
    if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      interfaces[name] = name;
    }
  });

  const keys = Object.keys(interfaces).map(k => k.toLowerCase());
  const dts = [
    `declare module 'kontract/runtime' {`,
    `  interface StorageRegistry {`,
    ...keys.map(k => `    ${k}: ${capitalize(k)};`),
    `  }`,
    `  interface Storage {`,
    `    get<K extends keyof StorageRegistry>(key: K): TableProxy<StorageRegistry[K]>;`,
    `  }`,
    `}`
  ].join('\n');

  return { dts, keys };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
