import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const tsconfigPath = join(projectRoot, 'tsconfig.node.json')
const ipcMethodsOutputPath = join(projectRoot, 'types', 'auto-gen', 'ipc-methods.d.ts')
const preloadApiOutputPath = join(projectRoot, 'src', 'preload', 'auto-gen', 'electron.ipc-auto.ts')

const normalizePath = (value: string): string => value.replace(/\\/g, '/').toLowerCase()

function getNodeDecorators(node: ts.Node): readonly ts.Decorator[] {
    const byApi = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined
    if (byApi?.length) return byApi

    if (!('modifiers' in node) || !node.modifiers || !Array.isArray(node.modifiers)) return []
    return node.modifiers
        .filter((m): m is ts.Decorator => m.kind === ts.SyntaxKind.Decorator)
        .map(m => m as ts.Decorator)
}

function getDecoratorName(decorator: ts.Decorator): string | undefined {
    const expr = decorator.expression
    if (!ts.isCallExpression(expr)) return undefined
    if (ts.isIdentifier(expr.expression)) return expr.expression.text
    if (ts.isPropertyAccessExpression(expr.expression) && ts.isIdentifier(expr.expression.name)) {
        return expr.expression.name.text
    }
    return undefined
}

function getIpcChannel(method: ts.MethodDeclaration): string | undefined {
    const decorators = getNodeDecorators(method)
    if (!decorators.length) return undefined

    for (const decorator of decorators) {
        const expr = decorator.expression
        if (!ts.isCallExpression(expr)) continue
        const name = getDecoratorName(decorator)
        if (name !== 'IpcHandle') continue

        const channelArg = expr.arguments[0]
        if (ts.isStringLiteral(channelArg) || ts.isNoSubstitutionTemplateLiteral(channelArg)) {
            return channelArg.text
        }
    }

    return undefined
}

function hasDecorator(param: ts.ParameterDeclaration, targetDecoratorName: string): boolean {
    const decorators = getNodeDecorators(param)
    if (!decorators.length) return false
    return decorators.some((d) => getDecoratorName(d) === targetDecoratorName)
}

function hasAsyncModifier(method: ts.MethodDeclaration): boolean {
    if (!method.modifiers?.length) return false
    return method.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)
}

function channelToMethodName(channel: string): string {
    const parts = channel
        .split(/[^a-zA-Z0-9]+/)
        .map((part) => part.trim())
        .filter(Boolean)

    if (parts.length === 0) return 'invokeUnknown'

    return parts
        .map((part, index) => {
            if (index === 0) return part.charAt(0).toLowerCase() + part.slice(1)
            return part.charAt(0).toUpperCase() + part.slice(1)
        })
        .join('')
}

function getScriptKind(filePath: string): ts.ScriptKind {
    if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX
    if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX
    if (filePath.endsWith('.js')) return ts.ScriptKind.JS
    return ts.ScriptKind.TS
}

function normalizeTsSource(filePath: string, content: string): string | undefined {
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        false,
        getScriptKind(filePath),
    )
    const diagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics

    if (diagnostics && diagnostics.length > 0) {
        return undefined
    }

    const printer = ts.createPrinter({
        removeComments: true,
        newLine: ts.NewLineKind.LineFeed,
    })

    return printer.printFile(sourceFile).trim()
}

function isSameTsBehavior(filePath: string, currentContent: string, nextContent: string): boolean {
    const currentNormalized = normalizeTsSource(filePath, currentContent)
    const nextNormalized = normalizeTsSource(filePath, nextContent)

    if (currentNormalized && nextNormalized) {
        return currentNormalized === nextNormalized
    }

    return currentContent === nextContent
}

function writeFileIfChanged(filePath: string, content: string): boolean {
    try {
        const currentContent = readFileSync(filePath, 'utf8')
        if (isSameTsBehavior(filePath, currentContent, content)) {
            return false
        }
    }
    catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
            throw error
        }
    }

    writeFileSync(filePath, content, 'utf8')
    return true
}

const configResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
if (configResult.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configResult.error.messageText, '\n'))
}

const parsed = ts.parseJsonConfigFileContent(configResult.config, ts.sys, projectRoot)
const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
})
const checker = program.getTypeChecker()

interface IpcRecord {
    channel: string
    params: string[]
    returnTypeText: string
    isAsync: boolean
}

const records = new Map<string, IpcRecord>()
const srcMainPathFragment = '/src/main/'
const ormImportedTypeNames = new Set<string>()
const usedOrmTypeNames = new Set<string>()

function collectOrmImportedTypes(sourceFile: ts.SourceFile): void {
    sourceFile.forEachChild((node) => {
        if (!ts.isImportDeclaration(node)) return
        if (!ts.isStringLiteral(node.moduleSpecifier)) return

        const modulePath = node.moduleSpecifier.text
        if (!modulePath.includes('orm_types')) return

        const namedBindings = node.importClause?.namedBindings
        if (!namedBindings || !ts.isNamedImports(namedBindings)) return

        for (const element of namedBindings.elements) {
            ormImportedTypeNames.add(element.name.text)
        }
    })
}

function markUsedOrmTypes(typeText: string): void {
    for (const typeName of ormImportedTypeNames) {
        const reg = new RegExp(`\\b${typeName}\\b`)
        if (reg.test(typeText)) {
            usedOrmTypeNames.add(typeName)
        }
    }
}

for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue
    const normalizedFileName = normalizePath(sourceFile.fileName)
    if (!normalizedFileName.includes(srcMainPathFragment)) continue
    if (!normalizedFileName.includes('.controller')) continue

    collectOrmImportedTypes(sourceFile)

    ts.forEachChild(sourceFile, function visit(node) {
        if (ts.isClassDeclaration(node)) {
            for (const member of node.members) {
                if (!ts.isMethodDeclaration(member)) continue
                const channel = getIpcChannel(member)
                if (!channel) continue

                const signature = checker.getSignatureFromDeclaration(member)
                if (!signature) continue

                const callParams = member.parameters.filter((p) => !hasDecorator(p, 'Ctx'))

                const params = callParams.map((param, index) => {
                    const paramType = checker.getTypeAtLocation(param)
                    const typeText = checker.typeToString(
                        paramType,
                        undefined,
                        ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
                    )

                    const nameText = ts.isIdentifier(param.name) ? param.name.text : `arg${index}`
                    markUsedOrmTypes(typeText)
                    return `${nameText}: ${typeText}`
                })

                const returnType = signature.getReturnType()
                const returnTypeText = checker.typeToString(
                    returnType,
                    undefined,
                    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
                )
                markUsedOrmTypes(returnTypeText)

                records.set(channel, {
                    channel,
                    params,
                    returnTypeText,
                    isAsync: hasAsyncModifier(member),
                })
            }
        }

        ts.forEachChild(node, visit)
    })
}

const sortedRecords = [...records.values()].sort((a, b) => a.channel.localeCompare(b.channel))

const ipcMethodLines: string[] = []
ipcMethodLines.push('// Generated by scripts/generate-ipc-methods.ts. DO NOT EDIT.')
ipcMethodLines.push('')
if (usedOrmTypeNames.size > 0) {
    const names = [...usedOrmTypeNames].sort((a, b) => a.localeCompare(b))
    ipcMethodLines.push(`import type { ${names.join(', ')} } from '../orm_types'`)
    ipcMethodLines.push('')
}
ipcMethodLines.push('export interface IpcInvokeMap {')
if (sortedRecords.length === 0) {
    ipcMethodLines.push('}')
}
else {
    for (const item of sortedRecords) {
        ipcMethodLines.push(`  '${item.channel}': {`)
        ipcMethodLines.push(`    params: [${item.params.join(', ')}]`)
        ipcMethodLines.push(`    return: ${item.returnTypeText}`)
        ipcMethodLines.push('  }')
    }
    ipcMethodLines.push('}')
}
ipcMethodLines.push('')
ipcMethodLines.push('export type IpcChannel = keyof IpcInvokeMap')
ipcMethodLines.push('')
ipcMethodLines.push('export type IpcInvokeArgs<T extends IpcChannel> = IpcInvokeMap[T][\'params\']')
ipcMethodLines.push('export type IpcInvokeReturn<T extends IpcChannel> = IpcInvokeMap[T][\'return\'] extends Promise<unknown>')
ipcMethodLines.push('  ? IpcInvokeMap[T][\'return\']')
ipcMethodLines.push('  : Promise<IpcInvokeMap[T][\'return\']>')
ipcMethodLines.push('')
ipcMethodLines.push('export {}')
ipcMethodLines.push('')

const methodNameUsed = new Set<string>()
const channelBindings = sortedRecords.map((method) => {
    const baseName = channelToMethodName(method.channel)
    let methodName = baseName
    let suffix = 2

    while (methodNameUsed.has(methodName)) {
        methodName = `${baseName}${suffix}`
        suffix += 1
    }

    methodNameUsed.add(methodName)

    return {
        channel: method.channel,
        methodName,
        isAsync: method.isAsync,
    }
})

const preloadLines: string[] = []
preloadLines.push('// Generated by scripts/generate-ipc-methods.ts. DO NOT EDIT.')
preloadLines.push('')
preloadLines.push("import { ipcRenderer } from 'electron'")
preloadLines.push("import type { IpcChannel, IpcInvokeArgs, IpcInvokeMap, IpcInvokeReturn } from '@/types/auto-gen/ipc-methods'")
preloadLines.push('')
preloadLines.push('type PreloadInvokeReturn<T extends IpcChannel, TAsync extends boolean> =')
preloadLines.push("  TAsync extends true ? IpcInvokeReturn<T> : IpcInvokeMap[T]['return']")
preloadLines.push('')
preloadLines.push('export const ipcInvoke = {')

for (const item of channelBindings) {
    preloadLines.push(
        `  ${item.methodName}: (...args: IpcInvokeArgs<'${item.channel}'>): PreloadInvokeReturn<'${item.channel}', ${item.isAsync}> =>`,
    )
    preloadLines.push(
        `    ipcRenderer.invoke('${item.channel}', ...args) as unknown as PreloadInvokeReturn<'${item.channel}', ${item.isAsync}>,`,
    )
}

preloadLines.push('} as const')
preloadLines.push('')

const ipcMethodsContent = ipcMethodLines.join('\n')
mkdirSync(dirname(ipcMethodsOutputPath), { recursive: true })
const ipcMethodsWritten = writeFileIfChanged(ipcMethodsOutputPath, ipcMethodsContent)

const preloadApiContent = preloadLines.join('\n')
mkdirSync(dirname(preloadApiOutputPath), { recursive: true })
const preloadApiWritten = writeFileIfChanged(preloadApiOutputPath, preloadApiContent)

console.log(`${ipcMethodsWritten ? 'Generated' : 'Skipped'} IPC methods: ${ipcMethodsOutputPath}`)
console.log(`${preloadApiWritten ? 'Generated' : 'Skipped'} preload IPC API: ${preloadApiOutputPath}`)