import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

export interface BackendTransformResult {
  client: string;
  server: string;
  routes: Array<{ name: string; meta: Record<string, unknown> }>;
}

export function transformBackend(source: string): BackendTransformResult {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'decorators']
  });
  const routes: Array<{ name: string; meta: Record<string, unknown> }> = [];
  const clientLines: string[] = [];
  const serverLines: string[] = ['const __kontract_routes = new Map();'];

  traverse(ast, {
    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      const node = path.node;
      const name = node.id?.name;
      if (!name) return;
      const decos: t.Decorator[] = (getDecorators(node));
      const hasBackend = decos.some((d: t.Decorator) => {
        const expr = d.expression;
        return t.isIdentifier(expr) && expr.name === 'backend' ||
               (t.isCallExpression(expr) && t.isIdentifier(expr.callee) && expr.callee.name === 'backend');
      });
      if (!hasBackend) return;
      let meta: Record<string, unknown> = {};
      const deco = decos.find((d: t.Decorator) => t.isCallExpression(d.expression) && t.isIdentifier(d.expression.callee) && d.expression.callee.name === 'backend');
      if (deco && t.isCallExpression(deco.expression)) {
        const args = deco.expression.arguments;
        if (args.length && t.isObjectExpression(args[0])) {
          meta = Object.fromEntries(args[0].properties
            .filter(p => t.isObjectProperty(p) && t.isIdentifier(p.key))
            .map(p => {
              const op = p as t.ObjectProperty;
              const val = t.isExpression(op.value) ? op.value : t.stringLiteral('');
              return [ (op.key as t.Identifier).name, serializeLiteral(val) ];
            }));
        }
      }
      routes.push({ name, meta });
      clientLines.push(`export async function ${name}(...args: any[]) { return await __kontract_rpc('${name}', args, ${JSON.stringify(meta)}); }`);
      serverLines.push(`__kontract_routes.set('${name}', { handler: async (ctx: any, args: any[]) => (${name})(...args), meta: ${JSON.stringify(meta)} });`);
    }
    ,
    ClassMethod(path: NodePath<t.ClassMethod>) {
      const node = path.node;
      const key = node.key;
      const name = t.isIdentifier(key) ? key.name : null;
      if (!name) return;
      const decos: t.Decorator[] = (getDecorators(node as unknown as t.FunctionDeclaration));
      const hasBackend = decos.some((d: t.Decorator) => {
        const expr = d.expression;
        return t.isIdentifier(expr) && expr.name === 'backend' ||
               (t.isCallExpression(expr) && t.isIdentifier(expr.callee) && expr.callee.name === 'backend');
      });
      if (!hasBackend) return;
      let meta: Record<string, unknown> = {};
      const deco = decos.find((d: t.Decorator) => t.isCallExpression(d.expression) && t.isIdentifier(d.expression.callee) && d.expression.callee.name === 'backend');
      if (deco && t.isCallExpression(deco.expression)) {
        const args = deco.expression.arguments;
        if (args.length && t.isObjectExpression(args[0])) {
          meta = Object.fromEntries(args[0].properties
            .filter(p => t.isObjectProperty(p) && t.isIdentifier(p.key))
            .map(p => {
              const op = p as t.ObjectProperty;
              const val = t.isExpression(op.value) ? op.value : t.stringLiteral('');
              return [ (op.key as t.Identifier).name, serializeLiteral(val) ];
            }));
        }
      }
      routes.push({ name, meta });
      clientLines.push(`export async function ${name}(...args: any[]) { return await __kontract_rpc('${name}', args, ${JSON.stringify(meta)}); }`);
      serverLines.push(`__kontract_routes.set('${name}', { handler: async (ctx: any, args: any[]) => (new ${getEnclosingClassName(path)})['${name}'](...args), meta: ${JSON.stringify(meta)} });`);
    }
  });

  return {
    client: clientLines.join('\n'),
    server: serverLines.join('\n'),
    routes
  };
}

function serializeLiteral(node: t.Expression): unknown {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  return null;
}

function getDecorators(node: t.FunctionDeclaration): t.Decorator[] {
  const n = node as unknown as { decorators?: t.Decorator[] };
  return n.decorators ?? [];
}

function getEnclosingClassName(path: NodePath<t.ClassMethod>): string {
  const parent = path.parentPath?.parent;
  if (parent && t.isClassDeclaration(parent) && parent.id) {
    return parent.id.name;
  }
  return 'Service';
}
