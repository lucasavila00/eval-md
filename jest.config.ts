/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    collectCoverage: false,
    collectCoverageFrom: [
        "src/program/**/*.ts",
        "src/printers/**/*.ts",
        "src/md-writer/**/*.ts",
    ],
    coverageReporters: ["clover", "json", "lcov", "text", "html"],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
    testMatch: ["<rootDir>/tests/**/*.(test).(js|jsx|ts)"],
};
