import { workerData, isMainThread, parentPort } from "node:worker_threads";
import { File } from "../../program/FileSystem";
import {
    Project,
    Node,
    SyntaxKind,
    SourceFile,
    CallExpression,
    NewExpression,
    ts,
} from "ts-morph";
import { getExecFileName } from "./shared";

const addInlayParametersToNode = (
    node: CallExpression<ts.CallExpression>,
    names: string[] | null
): void => {
    node.getArguments().forEach((arg, index) => {
        const inlay = names?.[index] ?? "";
        if (inlay != "") {
            arg.replaceWithText("/* " + inlay + ": */ " + arg.getText());
        }
    });
};
const addInlayParametersToNodeNewExpression = (
    node: NewExpression,
    names: string[] | null
): void => {
    node.getArguments().forEach((arg, index) => {
        const inlay = names?.[index] ?? "";
        if (inlay != "") {
            arg.replaceWithText("/* " + inlay + ": */ " + arg.getText());
        }
    });
};

const addInlayParameters = (sourceFile: SourceFile) => {
    sourceFile.forEachDescendant((node) => {
        if (Node.isNewExpression(node)) {
            const identifierKind = node.getExpressionIfKind(
                SyntaxKind.Identifier
            );

            if (identifierKind != null) {
                const names = identifierKind
                    .getType()
                    .getConstructSignatures()[0]
                    ?.getParameters()
                    .map((p) => p.getFullyQualifiedName());

                addInlayParametersToNodeNewExpression(node, names);
            }
        }
        if (Node.isCallExpression(node)) {
            const identifierKind = node.getExpressionIfKind(
                SyntaxKind.Identifier
            );
            if (identifierKind != null) {
                const names = identifierKind
                    .getType()
                    .getCallSignatures()[0]
                    ?.getParameters()
                    .map((p) => p.getFullyQualifiedName());

                addInlayParametersToNode(node, names);
            }

            const propertyAccessKind = node.getExpressionIfKind(
                SyntaxKind.PropertyAccessExpression
            );

            if (propertyAccessKind != null) {
                const names = propertyAccessKind
                    .getType()
                    .getCallSignatures()[0]
                    ?.getParameters()
                    .map((p) => p.getFullyQualifiedName());

                addInlayParametersToNode(node, names);
            }
        }
    });
};

if (isMainThread) {
    throw new Error("is a worker");
} else {
    const it: File[] = JSON.parse(workerData);

    const project = new Project({
        tsConfigFilePath: "tsconfig.json",
    });

    for (const f of it) {
        project.createSourceFile(getExecFileName(f, "check.ts"), f.content);
    }

    const newFiles = it.map((f) => {
        const sourceFile = project.getSourceFile(
            getExecFileName(f, "check.ts")
        );

        if (sourceFile == null) {
            throw new Error("sf not found");
        }

        addInlayParameters(sourceFile);

        return File(f.path, sourceFile.getFullText());
    });

    parentPort?.postMessage(JSON.stringify(newFiles));
}
