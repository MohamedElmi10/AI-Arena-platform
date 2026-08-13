# About AI Arena

AI Arena is Mohamed Elmi's public AI-portfolio platform. Every "tile" on it is a
live Azure AI agent or generative-AI demo that a visitor can interact with directly
in the browser. Mohamed built each tile while studying for the Azure AI
certification AI-103(Microsoft Certified: Azure AI Apps and Agents Developer Associate), so the platform doubles as proof of the skills that certification covers.

AI Arena is built incrementally, one tile at a time. Each tile is wired up as
a self-contained slice — a working Azure agent plus the playground that
demonstrates it — rather than the whole platform being built at once. New
capabilities land as new tiles, so the wall grows as Mohamed works through the
Azure AI-103 material.

The landing page is a wall of tiles grouped into modules. Each tile is either
**Live** (built, wired to a working Azure agent, fully playable) or **Planned**
(greyed out; clicking opens a small modal describing what it will demo once
built). There are no ETAs on planned tiles — a tile flips from Planned to Live
only when it actually ships.

Clicking a Live tile opens its **playground**: an interactive split-screen
surface with a guide on the left telling you what to try and what to expect,
and a chat panel on the right where you talk to the agent. A live stats bar
above them ticks up model, token, latency, and status readings in real time as
each response streams.

The agents themselves live inside Azure AI Foundry. AI Arena is the Next.js
front end that wraps and demonstrates them.
