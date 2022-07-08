import {
    ComponentProps,
    FC,
    Suspense,
    useEffect,
    useState,
    useTransition,
} from "react";
import { RecoilRoot, atom, useRecoilState } from "recoil";
import { Grommet, Button, Box, Header, Anchor, Nav, Text } from "grommet";
import * as E from "fp-ts/lib/Either";
import { MarkdownRenderer } from "./MarkdownRenderer";
interface File {
    readonly path: string;
    readonly content: string;
    readonly overwrite: boolean;
}

const fileState = atom<{
    state: E.Either<string, ReadonlyArray<File>>;
    busy: boolean;
    requested: boolean;
}>({
    key: "fileState",
    default: fetch("http://localhost:8010/state").then((it) => it.json()),
});

const SidebarButton: FC<ComponentProps<typeof Button>> = ({
    label,
    ...rest
}) => (
    <Button plain {...rest}>
        {({ hover }) => (
            <Box
                background={hover ? "teal" : undefined}
                pad={{ horizontal: "large", vertical: "medium" }}
            >
                <Text size="large">{label}</Text>
            </Box>
        )}
    </Button>
);
const OkFilesRenderer: FC<{ files: ReadonlyArray<File> }> = ({ files }) => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    const content = files.find((it) => it.path === selectedFile)?.content;
    return (
        <Box fill direction="row">
            <Nav background="brand" style={{ minHeight: "100vh" }}>
                {files.map((f) => (
                    <SidebarButton
                        key={f.path}
                        label={<Text color="white">{f.path}</Text>}
                        active={f.path === selectedFile}
                        onClick={() => setSelectedFile(f.path)}
                    />
                ))}
            </Nav>
            <Box pad="medium">
                {content != null && <MarkdownRenderer markdown={content} />}
            </Box>
        </Box>
    );
};
const FilesRenderer: FC<{
    files: E.Either<string, ReadonlyArray<File>>;
}> = ({ files }) => {
    if (E.isRight(files)) {
        return <OkFilesRenderer files={files.right} />;
    }
    return <div>{files.left}</div>;
};

let fetching = false;

const Render = () => {
    const [files, setFiles] = useRecoilState(fileState);
    useEffect(() => {
        const exampleSocket = new WebSocket(
            "ws://localhost:8080",
            "protocolOne"
        );
        exampleSocket.onmessage = async (event) => {
            if (fetching) {
                return;
            }
            fetching = true;

            try {
                await fetch("http://localhost:8010/state")
                    .then((it) => it.json())
                    .then(setFiles);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
            fetching = false;
        };
        // eslint-disable-next-line no-console
        exampleSocket.onerror = console.error;
        return () => {
            exampleSocket.close();
        };
    }, []);

    return (
        <>
            <Header background="dark-1" pad="small">
                <Nav direction="row">
                    <div>Busy: {String(files.busy)}</div>
                    <div>Requested: {String(files.requested)}</div>
                </Nav>
            </Header>
            <FilesRenderer files={files.state} />
        </>
    );
};

function App() {
    return (
        <Grommet plain>
            <RecoilRoot>
                <Suspense fallback={<div>Loading...</div>}>
                    <Render />
                </Suspense>
            </RecoilRoot>
        </Grommet>
    );
}

export default App;
