# Psiways — branding and README verification

## Scope

The current product name is **Psiways**. Application changes in this task are
limited to the visible header and document metadata. The physics solver, world,
measurement/RNG semantics, action ownership, controls, styles, deployment and
package identifiers are unchanged. Existing Slice 5G learning/menu work is
preserved; this is not a continuation or acceptance declaration for that task.

Updated surfaces: application header, tab title, description/theme/Open Graph
metadata, all three package descriptions, README, current lab-notebook title,
chapter index and CN prose, the original project handover's branding, and the visual-review export
title. Repository/workspace names, imports, lockfile, URLs and Lean namespaces
retain their existing identifiers. Historical validation reports, original design
briefs/reviews, setup commands and captured historical media are not rewritten.

## README and media

The new README leads with the actual rectangular 2D application, includes the
same-state 1D marginal and a short actual-evolution GIF, then presents approachable
features, correctly scoped physics, an architecture diagram, executable local
commands, current status and project philosophy. It does not repeat obsolete test
counts or claim formal verification of TypeScript, exact many-body dynamics,
spatial entanglement, calibrated tunnelling for arbitrary terrain or completed
performance/accessibility acceptance.

The public repository metadata was queried: `homepage: null`, `has_pages: false`.
No verified deployment was found or invented. The existing repository clone URL
and Lean companion URL remain unchanged.

Media generation and exact grid/timing provenance are in [assets/README.md](assets/README.md)
and [assets/capture.json](assets/capture.json). All seven GIF frames decode natively;
PNG views preserve the identical paused numerical state.

## Verification procedure

Run root tests/typecheck/build, then the branding capture and README rendering
checks serially. The README check posts the actual file to GitHub's Markdown API,
checks its mathematical classifications and relative links, and renders the
returned HTML in Chrome with MathJax SVG, Mermaid and GitHub-compatible CSS.
Renderer downloads are temporary audit tooling, not installed application
packages. Local preview is not a claim that an unpushed README was inspected in
GitHub's live repository UI.

## Results actually observed

- `npm run test`: **579 passed, 48 files**. The existing default-shell test now
  checks the Psiways header and rejects the old visible name.
- `npm run typecheck`, `npm run build`: passed. No dependency versions, lockfile,
  workspace names, imports, physics source or deployment files changed.
- `node scripts/projection-browser-check.mjs --branding`: **9 passed**, including
  title/metadata, actual evolution, identical-state marginal, every native GIF
  frame/duration, 390×844 and 512×300 title fit, retained legacy entry and no
  runtime/console errors.
- `node scripts/projection-browser-check.mjs --readme`: **10 rendering checks**
  plus no-runtime/console-error check. All relative images/links and README anchors
  resolve; npm commands match the real scripts; hero anchor navigation works;
  three badges, two PNGs and the GIF decode; Mermaid renders six architecture
  nodes; 390px and 768px layouts have no page-level horizontal overflow.
- GitHub Markdown API returned **HTTP 200** and classified **three display math
  blocks and one inline math expression** correctly. MathJax **3.2.2 SVG** rendered
  all four with nonzero dimensions and no TeX errors. Mermaid **11.12.2** and
  `github-markdown-css` **5.8.1 light** were used for the compatible preview.
- Actual desktop, mobile and tablet README screenshots were inspected, including
  the hero, equations, diagram and GIF. Application PNGs and the GIF were also
  inspected, along with the mobile branded header.
- `git diff --check`: passed; only normal Windows line-ending warnings.
  Source search found no old name in production app text or current README.
  Remaining old-name prose belongs to historical briefs/reviews, a validation
  checkpoint and the original scaffold commit example in `WINDOWS_SETUP.md`.

### The math issue was reproduced and fixed

The first GitHub API render parsed a standalone `=` line inside the first
`$$` block as a Setext heading, rather than recognizing the display equation.
Keeping the equation on one content line removed this Markdown collision. The
API also stripped the backslash from `\,`; the marginal now uses the explicit
upright differential `\mathrm{d}y`, which survives parsing and typesets correctly.
No equation is in an ordinary code fence, table or HTML wrapper. Dollar signs
are unescaped and LaTeX commands use single backslashes in the actual file.
The final API response and SVG screenshots confirm the correction; delimiters
were not merely changed and assumed to work.

### Evidence and remaining limits

- README renderer evidence:
  `C:/Users/marys/AppData/Local/Temp/psi-projection-check-y9Jxhj/` (final rerun).
  Earlier visually inspected identical-source preview: `psi-projection-check-DfwbJp/`.
  Includes `github-markdown-response.html`, `readme-verification.json`, and actual
  hero/physics/diagram/demo screenshots at desktop and responsive widths.
- Final media and branding evidence:
  `C:/Users/marys/AppData/Local/Temp/psi-projection-check-qjbSM2/`.
  Persistent reproducible media provenance is in `assets/capture.json`.
- Logs: `/tmp/psiways-test.log`, `/tmp/psiways-typecheck.log`,
  `/tmp/psiways-build.log`, `/tmp/psiways-assets-final.log`,
  `/tmp/psiways-readme-render-final.log` in the executing bash environment.

No live repository README was published or visually inspected. Its mathematical
Markdown was parsed by GitHub's own service and the resulting equations were
visually inspected in a compatible local renderer. Final live GitHub review is
still appropriate after the owner chooses to publish. Real-device/AT and
sustained/four-creature performance gates remain open. No expensive runtime
matrix, repository rename, commit or push was performed.
