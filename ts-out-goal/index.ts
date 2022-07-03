import g1 from "./1";
const generators: GenDef[] = [
    {
        generator: g1,
        source: "g1",
    },
];

type Lazy<T> = () => T;
type GenDef = {
    generator: Lazy<AsyncGenerator>;
    source: string;
};
const consumeGenerator = async (
    generator: Lazy<AsyncGenerator>
): Promise<any[]> => {
    const gen = generator();
    const collected: any[] = [];
    let last = null;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const n: any = await gen.next(last);
        if (n.done) {
            return collected;
        } else {
            collected.push(n.value);
            last = n.value;
        }
    }
};
const main = async () => {
    const response: Record<string, any[]> = {};
    for (const def of generators) {
        response[def.source] = await consumeGenerator(def.generator);
    }
    process.stdout.write(JSON.stringify(response));
};
main();
