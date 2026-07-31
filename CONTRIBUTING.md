# Contributing to Stegabyte

Thanks for your interest in Stegabyte. This document explains how to set up a
development environment, run the test suite, and submit a pull request.

## Code of conduct

Be respectful. Assume good faith. Stegabyte is a privacy project — keep the
discussions focused on the work.

## Development setup

1. Install [Node.js](https://nodejs.org) 20.9 or newer (a `.nvmrc` is provided).
2. Fork and clone the repository.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Visit http://localhost:3000.

## Running tests

```bash
npm test                 # Vitest unit tests
npm run test:coverage   # with v8 coverage
npm run test:e2e        # Playwright e2e (run test:e2e:install first)
```

Tests must pass before submitting a pull request. Aim for 100% coverage on any
new pure-logic code in `src/lib/`.

## Coding standards

- **TypeScript strict.** No `any`, no `// @ts-ignore`. All new code must
  `tsc --noEmit` clean.
- **ESLint + Prettier.** Run `npm run lint:fix` and `npm run format` before
  committing.
- **Accessibility.** New UI must be keyboard-navigable and include the
  appropriate ARIA attributes.
- **Security.** No new third-party network calls. No new crypto primitives —
  Stegabyte uses the Web Crypto API and that's it.
- **No tracking.** Do not add analytics, telemetry, or tracking pixels.

## Pure vs DOM code

Pure logic in `src/lib/` must be DOM-free so it can run in a Web Worker and,
eventually, in WebAssembly. If you need to touch the DOM or Canvas, do it in a
thin wrapper (`*.ts`) over a pure core (`*-core.ts`).

## Commit messages

Use the present tense ("Add feature", not "Added feature"). Reference the
relevant feature page or module when relevant. The first line should be 50
characters or fewer.

## Pull request workflow

1. Create a feature branch from `main` (`git checkout -b feat/your-feature`).
2. Commit your changes in logical, atomic chunks.
3. Run `npm run check` (lint + typecheck + tests).
4. Push your branch and open a pull request using the
   `.github/PULL_REQUEST_TEMPLATE.md` template.
5. Wait for CI to pass.

## Reporting bugs

Use the `.github/ISSUE_TEMPLATE/bug_report.md` template. Include:

- A clear description of the bug
- Steps to reproduce
- Expected and actual behaviour
- Browser, OS, and screen size
- Console output if relevant

## Security issues

**Do not open a public issue for security vulnerabilities.** Open a
[private security advisory on GitHub](https://github.com/HireforFire/stegabyte/security/advisories/new)
or follow the responsible-disclosure process described in
[`SECURITY.md`](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the
MIT License. See [`LICENSE`](LICENSE).
