<div align="center">
  <h1>LocalStack</h1>
  <p><strong>The front door to the LocalX ecosystem.</strong></p>
  <p>
    <a href="https://c0degeek-dev.github.io/LocalStack/">Open the site</a> ·
    <a href="https://c0degeek-dev.github.io/LocalStack/#projects">Explore the projects</a> ·
    <a href="https://github.com/C0deGeek-dev/LocalStack/issues">Report an issue</a>
  </p>
  <p>
    <img alt="LocalX 5.0.0" src="https://img.shields.io/badge/LocalX-v5.0.0-38d6be?style=flat-square">
    <img alt="GitHub Pages site" src="https://img.shields.io/badge/site-GitHub%20Pages-59636e?style=flat-square">
  </p>
</div>

LocalStack explains how the four LocalX tools fit together, shows the evidence
behind the agent harness, and gives new users one clear place to begin. Current
release train: `v5.0.0`.

## Privacy by design

LocalX is local-first by default. The tools do not send usage telemetry, prompts,
code, model activity, memories, or benchmark results to us. Models, transcripts,
reports, configuration, and learned project knowledge stay on hardware and in
paths you control. Cross-device memory sync, when you choose to enable it, is
end-to-end encrypted.

There is no forced LocalX account or cloud service. Remote actions—such as a
model download or a hosted provider you configure—are explicit choices. When
you stay on the local path, your working data stays local. The LocalStack site
itself is static and includes no analytics, cookies, forms, or client-side
tracking.

## The toolchain

| Project | What it does | Start here |
|---|---|---|
| [LocalBox](https://github.com/C0deGeek-dev/LocalBox) | Runs local GGUF models and connects them to coding agents | Install a local runtime |
| [LocalBench](https://github.com/C0deGeek-dev/LocalBench) | Finds fast, stable settings for your hardware | Tune a model |
| [LocalPilot](https://github.com/C0deGeek-dev/LocalPilot) | Drives models through a tool-using coding-agent harness with deep, auditable research and MCP coaching | Start coding |
| [LocalMind](https://github.com/C0deGeek-dev/LocalMind) | Turns reviewed sessions and docs into local memory you can browse, query over MCP, and sync | Add local learning |

```text
LocalBox ──> LocalBench
    │            │
    └──────┬─────┘
           ▼
      LocalPilot <──> LocalMind
```

## Preview locally

The site is deliberately simple: static HTML, CSS, and SVG assets with no build
step.

```sh
git clone https://github.com/C0deGeek-dev/LocalStack.git
cd LocalStack
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

You can also open `index.html` directly, but a local server matches GitHub Pages
URL behavior more closely.

## Repository layout

```text
LocalStack/
├── index.html                         page content and structure
├── styles.css                         responsive theme
├── assets/
│   ├── localstack-mark.svg            favicon and brand mark
│   ├── localpilot-vs-raw.svg          raw-vs-harness benchmark chart
│   ├── localpilot-four-arm.svg        four-arm methodology chart
│   └── og.png                         social preview
└── VERSION                            release-train version
```

## Editing the site

- Keep the page dependency-free and usable with JavaScript disabled.
- Keep project details in their owning repositories; this site is an overview,
  not a second documentation tree.
- Preserve useful alt text and semantic headings when changing visuals.
- Check wide and narrow layouts before publishing.
- Treat benchmark deltas as the claim; absolute scores need their caveats.

## Deployment

GitHub Pages publishes the static repository. A content-only change needs no
generated build artifact—update the source files, preview them locally, and let
Pages serve the committed result.

## License

LocalX-owned source is available under the
[PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use requires a
separate license. See [LICENSING.md](LICENSING.md) for the commercial contact,
the 30 August 2026 licensing boundary, and third-party terms.
