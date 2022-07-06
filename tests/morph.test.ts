import { createProject } from "@ts-morph/bootstrap";
it("works", async () => {
    const project = await createProject({ tsConfigFilePath: "tsconfig.json" });

    console.error(project);

    expect(1).toBe(1);
});
