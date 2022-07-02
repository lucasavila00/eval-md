// import { ValidMarkdownParser } from "../../src/parse-md";
// import { runLeft, runRight } from "../utils";

// const run = runRight(ValidMarkdownParser);
// const fail = runLeft(ValidMarkdownParser);

// describe("ValidMarkdown", () => {
//     it("empty string", () => {
//         const str = "";
//         expect(fail(str)).toMatchInlineSnapshot(`
//             Object {
//               "expected": Array [],
//               "fatal": false,
//               "input": Object {
//                 "buffer": Array [],
//                 "cursor": 0,
//               },
//             }
//         `);
//     });

//     it("works", () => {
//         const str = "a";
//         expect(run(str).value).toMatchInlineSnapshot(`
//             Object {
//               "_tag": "ValidMarkdown",
//               "content": "a",
//             }
//         `);
//     });

//     it("works2", () => {
//         const str = `

//         `;
//         expect(run(str).value).toMatchInlineSnapshot(`
//             Object {
//               "_tag": "ValidMarkdown",
//               "content": "

//                     ",
//             }
//         `);
//     });

//     it("works3", () => {
//         const str = `
//         # h1
//         `;
//         expect(run(str).value).toMatchInlineSnapshot(`
//             Object {
//               "_tag": "ValidMarkdown",
//               "content": "
//                     # h1
//                     ",
//             }
//         `);
//     });
// });
it("ok", () => {
    expect(1).toBe(1);
});
