// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type Settings = {
    readonly srcDir: string;
    readonly outDir: string;
    readonly exclude: ReadonlyArray<string>;
    readonly runtimeMeta: Record<string, string>;
    readonly footer: string | null;

    readonly typescript: {
        readonly inlayHints: boolean;
    };
    readonly imports: Record<string, string>;
};

export const getDefaultSettings = (): Settings => ({
    srcDir: "eval-mds",
    outDir: "docs",
    exclude: [],
    runtimeMeta: {},
    footer: "\n---\n\nThis document used [eval-md](https://lucasavila00.github.io/eval-md/)",
    typescript: { inlayHints: false },
    imports: {},
});
