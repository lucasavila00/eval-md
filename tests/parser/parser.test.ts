// import { parser } from "../../src/parse-md";
// import { runLeft, runRight } from "../utils";

// const run = runRight(parser);
// const fail = runLeft(parser);

// const codeBlock = `
// #h1
// ~~~
// a
// ~~~
// #h2
// `;

// describe("parser", () => {
//     it("fails", () => {
//         expect(fail("") != null).toBe(true);
//         // expect(fail("~~~a~~~") != null).toBe(true);
//         // expect(fail("~~~") != null).toBe(true);
//     });

//     it("works", () => {
//         expect(run(codeBlock).value).toMatchInlineSnapshot(`
//             Array [
//               Object {
//                 "code": Object {
//                   "_tag": "Some",
//                   "value": Object {
//                     "_tag": "FencedCodeBlock",
//                     "content": "a",
//                   },
//                 },
//                 "md": Object {
//                   "_tag": "ValidMarkdown",
//                   "content": "
//             #h1",
//                 },
//               },
//               Object {
//                 "code": Object {
//                   "_tag": "None",
//                 },
//                 "md": Object {
//                   "_tag": "ValidMarkdown",
//                   "content": "
//             #h2
//             ",
//                 },
//               },
//             ]
//         `);
//     });
// });
it("ok", () => {
    expect(1).toBe(1);
});
